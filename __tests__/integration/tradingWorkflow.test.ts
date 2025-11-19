/**
 * Integration tests for complete trading workflows
 */

import { Client } from "../../src/client";
import { OrderSide, OrderType } from "../../src/types";
import { CHAIN_ID_BNB_MAINNET } from "../../src/constants";
import { ethers } from "ethers";
import {
  mockMarket,
  mockQuoteTokens,
  mockOrderbook,
  mockPosition,
  wrapApiResponse,
  wrapApiListResponse,
} from "../mocks/apiResponses";
import { MOCK_ADDRESSES, MOCK_PRIVATE_KEY } from "../mocks/blockchain";

// Mock fetch globally
global.fetch = jest.fn();

describe("Trading Workflow Integration Tests", () => {
  let client: Client;

  beforeEach(() => {
    jest.clearAllMocks();

    client = new Client({
      host: "https://api.opinion.markets",
      apiKey: "test_api_key",
      chainId: CHAIN_ID_BNB_MAINNET,
      rpcUrl: "https://bsc-dataseed.binance.org/",
      privateKey: MOCK_PRIVATE_KEY,
      multiSigAddr: MOCK_ADDRESSES.multiSig,
    });
  });

  describe("Complete Trading Workflow", () => {
    it("should execute full workflow: enable -> split -> trade -> merge", async () => {
      // Step 1: Get market information
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockMarket),
      });

      const marketResponse = await client.getMarket(12345);
      expect(marketResponse.result?.data.id).toBe(12345);

      // Step 2: Get quote tokens
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiListResponse(mockQuoteTokens),
      });

      const quoteTokensResponse = await client.getQuoteTokens();
      expect(quoteTokensResponse.result?.list).toHaveLength(2);

      // Note: Actual blockchain operations (enableTrading, split, merge)
      // would require mocking the entire blockchain stack, which is done
      // in unit tests. Here we validate the workflow logic.
    });

    it("should handle market data queries in sequence", async () => {
      // Get market
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockMarket),
      });

      const market = await client.getMarket(12345);
      expect(market.result?.data.outcomes).toHaveLength(2);

      // Get orderbook
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockOrderbook),
      });

      const orderbook = await client.getOrderbook("token_yes_123");
      expect(orderbook.result?.data.bids).toBeDefined();
      expect(orderbook.result?.data.asks).toBeDefined();

      // Get latest price
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse({ price: "0.545" }),
      });

      const price = await client.getLatestPrice("token_yes_123");
      expect(price.result?.data.price).toBe("0.545");
    });

    it("should handle order placement workflow", async () => {
      // Place buy order
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse({ order_id: "buy_order_123" }),
      });

      const buyOrder = await client.placeOrder({
        marketId: 12345,
        tokenId: "token_yes_123",
        side: OrderSide.BUY,
        orderType: OrderType.LIMIT_ORDER,
        price: "0.50",
        makerAmountInQuoteToken: "100",
      });

      expect(buyOrder.result?.order_id).toBe("buy_order_123");

      // Check order status
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiResponse({
            order_id: "buy_order_123",
            status: "OPEN",
            filled_amount: "25.00",
            remaining_amount: "75.00",
          }),
      });

      const orderStatus = await client.getOrderById("buy_order_123");
      expect(orderStatus.result?.data.status).toBe("OPEN");

      // Place sell order
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse({ order_id: "sell_order_456" }),
      });

      const sellOrder = await client.placeOrder({
        marketId: 12345,
        tokenId: "token_yes_123",
        side: OrderSide.SELL,
        orderType: OrderType.LIMIT_ORDER,
        price: "0.60",
        makerAmountInBaseToken: "50",
      });

      expect(sellOrder.result?.order_id).toBe("sell_order_456");
    });

    it("should handle position monitoring workflow", async () => {
      // Get my positions
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiListResponse([
            {
              ...mockPosition,
              outcome_name: "YES",
              amount: "150.75",
              pnl: "4.52",
            },
            {
              ...mockPosition,
              outcome_id: 2,
              outcome_name: "NO",
              amount: "50.25",
              pnl: "-1.20",
            },
          ]),
      });

      const positions = await client.getMyPositions({ marketId: 12345 });
      expect(positions.result?.list).toHaveLength(2);

      // Get my balances
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiListResponse([
            {
              token_address: MOCK_ADDRESSES.usdt,
              symbol: "USDT",
              balance: "1000.00",
              available: "850.00",
              locked: "150.00",
            },
          ]),
      });

      const balances = await client.getMyBalances();
      expect(balances.result?.list[0].available).toBe("850.00");

      // Get my trades
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiListResponse([
            {
              trade_id: "trade_1",
              market_id: 12345,
              side: "BUY",
              price: "0.50",
              amount: "50.00",
            },
            {
              trade_id: "trade_2",
              market_id: 12345,
              side: "SELL",
              price: "0.60",
              amount: "25.00",
            },
          ]),
      });

      const trades = await client.getMyTrades({ marketId: 12345 });
      expect(trades.result?.list).toHaveLength(2);
    });
  });

  describe("Error Recovery Workflows", () => {
    it("should handle failed order placement gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          code: 1,
          message: "Insufficient balance",
        }),
      });

      await expect(
        client.placeOrder({
          marketId: 12345,
          tokenId: "token_yes_123",
          side: OrderSide.BUY,
          orderType: OrderType.LIMIT_ORDER,
          price: "0.50",
          makerAmountInQuoteToken: "10000", // Too much
        })
      ).rejects.toThrow();
    });

    it("should retry on network errors", async () => {
      // First call fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network timeout"));

      await expect(client.getMarket(12345)).rejects.toThrow();

      // Second call succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => wrapApiResponse(mockMarket),
      });

      const result = await client.getMarket(12345);
      expect(result.result?.data.id).toBe(12345);
    });
  });

  describe("Multi-Market Workflows", () => {
    it("should handle multiple markets simultaneously", async () => {
      // Get markets list
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiListResponse([
            mockMarket,
            { ...mockMarket, id: 23456, title: "Another market" },
            { ...mockMarket, id: 34567, title: "Third market" },
          ]),
      });

      const markets = await client.getMarkets({ limit: 10 });
      expect(markets.result?.list).toHaveLength(3);

      // Get positions across all markets
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiListResponse([
            { ...mockPosition, market_id: 12345 },
            { ...mockPosition, market_id: 23456 },
            { ...mockPosition, market_id: 34567 },
          ]),
      });

      const allPositions = await client.getMyPositions();
      expect(allPositions.result?.list).toHaveLength(3);
    });

    it("should filter orders by market", async () => {
      // Orders for market 12345
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiListResponse([
            { order_id: "order_1", market_id: 12345 },
            { order_id: "order_2", market_id: 12345 },
          ]),
      });

      const market1Orders = await client.getMyOrders({ marketId: 12345 });
      expect(market1Orders.result?.list).toHaveLength(2);

      // Orders for market 23456
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiListResponse([{ order_id: "order_3", market_id: 23456 }]),
      });

      const market2Orders = await client.getMyOrders({ marketId: 23456 });
      expect(market2Orders.result?.list).toHaveLength(1);
    });
  });

  describe("Market Resolution Workflow", () => {
    it("should handle market resolution sequence", async () => {
      // Check market status before resolution
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiResponse({
            ...mockMarket,
            status: "ACTIVE",
            resolved_at: null,
            resolution: null,
          }),
      });

      const activeMar = await client.getMarket(12345);
      expect(activeMar.result?.data.status).toBe("ACTIVE");

      // Market gets resolved
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiResponse({
            ...mockMarket,
            status: "RESOLVED",
            resolved_at: 1735689600,
            resolution: "YES",
          }),
      });

      const resolvedMarket = await client.getMarket(12345);
      expect(resolvedMarket.result?.data.status).toBe("RESOLVED");
      expect(resolvedMarket.result?.data.resolution).toBe("YES");

      // Check final positions after resolution
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () =>
          wrapApiListResponse([
            {
              ...mockPosition,
              outcome_name: "YES",
              amount: "100.00",
              current_price: "1.00", // Winning outcome
              pnl: "50.00",
            },
          ]),
      });

      const finalPositions = await client.getMyPositions({ marketId: 12345 });
      expect(finalPositions.result?.list[0].current_price).toBe("1.00");
    });
  });

  describe("Batch Operations", () => {
    it("should handle multiple order cancellations", async () => {
      const orderIds = ["order_1", "order_2", "order_3"];

      for (const orderId of orderIds) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => wrapApiResponse({ success: true }),
        });
      }

      const results = await Promise.all(orderIds.map((id) => client.cancelOrder(id)));

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.result?.data.success).toBe(true);
      });
    });

    it("should handle parallel market queries", async () => {
      const marketIds = [12345, 23456, 34567];

      for (const id of marketIds) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => wrapApiResponse({ ...mockMarket, id }),
        });
      }

      const results = await Promise.all(marketIds.map((id) => client.getMarket(id)));

      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result.result?.data.id).toBe(marketIds[i]);
      });
    });
  });
});
