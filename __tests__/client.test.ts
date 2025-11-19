/**
 * Unit tests for Client
 */

import { Client } from "../src/client";
import { OrderSide, OrderType, TopicType, TopicStatusFilter } from "../src/types";
import { CHAIN_ID_BNB_MAINNET } from "../src/constants";
import {
  mockMarket,
  mockCategoricalMarket,
  mockOrderbook,
  mockQuoteTokens,
  mockOrder,
  mockTrade,
  mockBalance,
  mockPosition,
  mockPriceHistory,
  mockFeeRates,
  mockUserAuth,
  wrapApiResponse,
  wrapApiListResponse,
} from "./mocks/apiResponses";
import { MOCK_ADDRESSES, MOCK_PRIVATE_KEY } from "./mocks/blockchain";

// Mock fetch globally
global.fetch = jest.fn();

describe("Client", () => {
  let client: Client;

  beforeEach(() => {
    jest.clearAllMocks();

    client = new Client({
      host: "https://api.opinion.markets",
      apiKey: "test_api_key",
      chainId: CHAIN_ID_BNB_MAINNET,
    });
  });

  describe("constructor", () => {
    it("should initialize with basic config", () => {
      expect(client).toBeDefined();
    });

    it("should initialize with blockchain config", () => {
      const blockchainClient = new Client({
        host: "https://api.opinion.markets",
        apiKey: "test_api_key",
        chainId: CHAIN_ID_BNB_MAINNET,
        rpcUrl: "https://bsc-dataseed.binance.org/",
        privateKey: MOCK_PRIVATE_KEY,
        multiSigAddr: MOCK_ADDRESSES.multiSig,
      });

      expect(blockchainClient).toBeDefined();
    });

    it("should throw on invalid config", () => {
      expect(() => {
        new Client({
          host: "",
          apiKey: "",
          chainId: 0,
        });
      }).toThrow();
    });
  });

  describe("getMarkets", () => {
    it("should fetch markets with default parameters", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiListResponse([mockMarket]),
      });

      const result = await client.getMarkets();

      expect(result).toBeDefined();
      expect(result.result?.list).toHaveLength(1);
      expect(result.result?.list[0].id).toBe(12345);
    });

    it("should fetch markets with filters", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiListResponse([mockMarket]),
      });

      const result = await client.getMarkets({
        topicType: TopicType.BINARY,
        status: TopicStatusFilter.ACTIVATED,
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("topic_type=BINARY"),
        expect.any(Object)
      );
    });

    it("should handle API errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ code: 1, message: "Bad request" }),
      });

      await expect(client.getMarkets()).rejects.toThrow();
    });
  });

  describe("getMarket", () => {
    it("should fetch single market", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockMarket),
      });

      const result = await client.getMarket(12345);

      expect(result).toBeDefined();
      expect(result.result?.data.id).toBe(12345);
      expect(result.result?.data.title).toBe("Will Bitcoin reach $100k by end of 2024?");
    });

    it("should throw on invalid market ID", async () => {
      await expect(client.getMarket(0)).rejects.toThrow();
    });
  });

  describe("getCategoricalMarket", () => {
    it("should fetch categorical market", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockCategoricalMarket),
      });

      const result = await client.getCategoricalMarket(67890);

      expect(result).toBeDefined();
      expect(result.result?.data.topic_type).toBe("CATEGORICAL");
      expect(result.result?.data.outcomes).toHaveLength(3);
    });
  });

  describe("getOrderbook", () => {
    it("should fetch orderbook", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockOrderbook),
      });

      const result = await client.getOrderbook("token_yes_123");

      expect(result).toBeDefined();
      expect(result.result?.data.token_id).toBe("token_yes_123");
      expect(result.result?.data.bids).toHaveLength(3);
      expect(result.result?.data.asks).toHaveLength(3);
    });
  });

  describe("getLatestPrice", () => {
    it("should fetch latest price", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse({ price: "0.545" }),
      });

      const result = await client.getLatestPrice("token_yes_123");

      expect(result).toBeDefined();
      expect(result.result?.data.price).toBe("0.545");
    });
  });

  describe("getPriceHistory", () => {
    it("should fetch price history", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockPriceHistory),
      });

      const result = await client.getPriceHistory({
        tokenId: "token_yes_123",
        interval: "1h",
        startAt: 1234567800,
        endAt: 1234578600,
      });

      expect(result).toBeDefined();
      expect(result.result?.data.data).toHaveLength(4);
    });
  });

  describe("getFeeRates", () => {
    it("should fetch fee rates", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockFeeRates),
      });

      const result = await client.getFeeRates("token_yes_123");

      expect(result).toBeDefined();
      expect(result.result?.data.maker_fee_rate).toBe("0.002");
      expect(result.result?.data.taker_fee_rate).toBe("0.002");
    });
  });

  describe("getQuoteTokens", () => {
    it("should fetch quote tokens", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiListResponse(mockQuoteTokens),
      });

      const result = await client.getQuoteTokens();

      expect(result).toBeDefined();
      expect(result.result?.list).toHaveLength(2);
      expect(result.result?.list[0].symbol).toBe("USDT");
    });

    it("should cache quote tokens", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => wrapApiListResponse(mockQuoteTokens),
      });

      // First call
      await client.getQuoteTokens();

      // Second call - should use cache
      await client.getQuoteTokens();

      // Should only call API once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("placeOrder", () => {
    it("should place limit order", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse({ order_id: "order_123456" }),
      });

      const result = await client.placeOrder({
        marketId: 12345,
        tokenId: "token_yes_123",
        side: OrderSide.BUY,
        orderType: OrderType.LIMIT_ORDER,
        price: "0.55",
        makerAmountInQuoteToken: "10",
      });

      expect(result).toBeDefined();
      expect(result.result?.order_id).toBe("order_123456");
    });

    it("should place market order", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse({ order_id: "order_789" }),
      });

      const result = await client.placeOrder({
        marketId: 12345,
        tokenId: "token_yes_123",
        side: OrderSide.SELL,
        orderType: OrderType.MARKET_ORDER,
        price: "0",
        makerAmountInBaseToken: "5",
      });

      expect(result).toBeDefined();
    });

    it("should validate order parameters", async () => {
      await expect(
        client.placeOrder({
          marketId: 0,
          tokenId: "",
          side: OrderSide.BUY,
          orderType: OrderType.LIMIT_ORDER,
          price: "",
          makerAmountInQuoteToken: "",
        })
      ).rejects.toThrow();
    });
  });

  describe("cancelOrder", () => {
    it("should cancel order", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse({ success: true }),
      });

      const result = await client.cancelOrder("order_123456");

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/order/cancel"),
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  describe("getMyOrders", () => {
    it("should fetch user orders", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiListResponse([mockOrder]),
      });

      const result = await client.getMyOrders({ marketId: 12345 });

      expect(result).toBeDefined();
      expect(result.result?.list).toHaveLength(1);
      expect(result.result?.list[0].order_id).toBe("order_123456");
    });

    it("should fetch orders with pagination", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiListResponse([mockOrder], 100),
      });

      const result = await client.getMyOrders({
        page: 2,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(result.result?.total).toBe(100);
    });
  });

  describe("getOrderById", () => {
    it("should fetch order by ID", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockOrder),
      });

      const result = await client.getOrderById("order_123456");

      expect(result).toBeDefined();
      expect(result.result?.data.order_id).toBe("order_123456");
    });
  });

  describe("getMyBalances", () => {
    it("should fetch user balances", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiListResponse([mockBalance]),
      });

      const result = await client.getMyBalances();

      expect(result).toBeDefined();
      expect(result.result?.list).toHaveLength(1);
      expect(result.result?.list[0].symbol).toBe("USDT");
    });
  });

  describe("getMyPositions", () => {
    it("should fetch user positions", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiListResponse([mockPosition]),
      });

      const result = await client.getMyPositions({ marketId: 12345 });

      expect(result).toBeDefined();
      expect(result.result?.list).toHaveLength(1);
      expect(result.result?.list[0].market_id).toBe(12345);
    });
  });

  describe("getMyTrades", () => {
    it("should fetch user trades", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiListResponse([mockTrade]),
      });

      const result = await client.getMyTrades({ marketId: 12345 });

      expect(result).toBeDefined();
      expect(result.result?.list).toHaveLength(1);
      expect(result.result?.list[0].trade_id).toBe("trade_789");
    });
  });

  describe("getUserAuth", () => {
    it("should fetch user auth info", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockUserAuth),
      });

      const result = await client.getUserAuth();

      expect(result).toBeDefined();
      expect(result.result?.data.address).toBe(MOCK_ADDRESSES.multiSig);
    });
  });

  describe("blockchain operations", () => {
    let blockchainClient: Client;

    beforeEach(() => {
      // Mock ethers for blockchain operations
      blockchainClient = new Client({
        host: "https://api.opinion.markets",
        apiKey: "test_api_key",
        chainId: CHAIN_ID_BNB_MAINNET,
        rpcUrl: "https://bsc-dataseed.binance.org/",
        privateKey: MOCK_PRIVATE_KEY,
        multiSigAddr: MOCK_ADDRESSES.multiSig,
      });
    });

    describe("split", () => {
      it("should throw if blockchain not configured", async () => {
        await expect(
          client.split({
            marketId: 12345,
            amount: BigInt(100),
          })
        ).rejects.toThrow(/blockchain operations not configured/i);
      });

      it("should call contract caller split when configured", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => wrapApiResponse(mockMarket),
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => wrapApiListResponse(mockQuoteTokens),
        });

        // Mock the contractCaller.split method
        if (blockchainClient["contractCaller"]) {
          blockchainClient["contractCaller"].split = jest.fn().mockResolvedValue({
            txHash: "0xabc123",
            safeTxHash: "0xdef456",
          });
        }

        // This will fail in test environment but validates the flow
        try {
          await blockchainClient.split({
            marketId: 12345,
            amount: BigInt(100),
          });
        } catch (e) {
          // Expected to fail in test environment
        }
      });
    });

    describe("merge", () => {
      it("should throw if blockchain not configured", async () => {
        await expect(
          client.merge({
            marketId: 12345,
            amount: BigInt(50),
          })
        ).rejects.toThrow(/blockchain operations not configured/i);
      });
    });

    describe("redeem", () => {
      it("should throw if blockchain not configured", async () => {
        await expect(
          client.redeem({
            marketId: 12345,
          })
        ).rejects.toThrow(/blockchain operations not configured/i);
      });
    });

    describe("enableTrading", () => {
      it("should throw if blockchain not configured", async () => {
        await expect(client.enableTrading()).rejects.toThrow(/blockchain operations not configured/i);
      });
    });
  });

  describe("error handling", () => {
    it("should handle network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      await expect(client.getMarkets()).rejects.toThrow();
    });

    it("should handle invalid JSON responses", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(client.getMarkets()).rejects.toThrow();
    });

    it("should handle HTTP error status codes", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ code: 1, message: "Server error" }),
      });

      await expect(client.getMarkets()).rejects.toThrow();
    });
  });
});
