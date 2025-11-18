/**
 * Main Opinion CLOB SDK Client
 */

import { ethers } from "ethers";
import { ApiClient, ApiResponse } from "./api/client";
import { OrderBuilder } from "./chain/orderBuilder";
import { Signer } from "./chain/signer";
import { OrderDataInput, PlaceOrderDataInput, OrderData } from "./models/order";
import { OrderSide, OrderType, TopicStatus, TopicStatusFilter, TopicType, SignatureType } from "./types/enums";
import { InvalidParamError, OpenApiError } from "./types/errors";
import { SUPPORTED_CHAIN_IDS, DEFAULT_CONTRACT_ADDRESSES, MAX_DECIMALS } from "./config";
import { ZERO_ADDRESS } from "./utils/constants";
import { fastToChecksumAddress, safeAmountToWei, calculateOrderAmounts } from "./utils/helpers";

export interface ClientConfig {
  host: string;
  apiKey: string;
  chainId: number;
  rpcUrl?: string;
  privateKey?: string;
  multiSigAddr?: string;
  conditionalTokensAddr?: string;
  multisendAddr?: string;
  quoteTokensCacheTtl?: number;
  marketCacheTtl?: number;
}

interface QuoteToken {
  quote_token_address: string;
  ctf_exchange_address: string;
  chain_id: number;
  decimal: number;
}

export class Client {
  private apiClient: ApiClient;
  private chainId: number;
  private apiKey: string;
  private signer?: Signer;
  private multiSigAddr?: string;
  private provider?: ethers.JsonRpcProvider;
  private quoteTokensCacheTtl: number;
  private marketCacheTtl: number;
  private quoteTokensCache?: any;
  private quoteTokensCacheTime: number = 0;
  private marketCache: Map<number, { data: any; time: number }> = new Map();

  constructor(config: ClientConfig) {
    // Validate chain ID
    if (!SUPPORTED_CHAIN_IDS.includes(config.chainId as any)) {
      throw new InvalidParamError(`chain_id must be one of ${SUPPORTED_CHAIN_IDS.join(", ")}`);
    }

    this.chainId = config.chainId;
    this.apiKey = config.apiKey;
    this.apiClient = new ApiClient(config.host, config.apiKey);

    // Initialize blockchain components if provided
    if (config.privateKey) {
      this.signer = new Signer(config.privateKey);
    }

    if (config.multiSigAddr) {
      this.multiSigAddr = fastToChecksumAddress(config.multiSigAddr);
    }

    if (config.rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    }

    this.quoteTokensCacheTtl = config.quoteTokensCacheTtl ?? 3600;
    this.marketCacheTtl = config.marketCacheTtl ?? 300;
  }

  // ==================== Market Data Methods ====================

  /**
   * Get markets with pagination and filters
   */
  async getMarkets(params?: {
    topicType?: TopicType;
    page?: number;
    limit?: number;
    status?: TopicStatusFilter;
  }): Promise<ApiResponse> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;

    if (page < 1) {
      throw new InvalidParamError("page must be >= 1");
    }
    if (limit < 1 || limit > 20) {
      throw new InvalidParamError("limit must be between 1 and 20");
    }

    return this.apiClient.getMarkets({
      chainId: this.chainId.toString(),
      marketType: params?.topicType,
      page,
      limit,
      status: params?.status,
    });
  }

  /**
   * Get detailed information about a specific market
   */
  async getMarket(marketId: number, useCache: boolean = true): Promise<ApiResponse> {
    if (!marketId) {
      throw new InvalidParamError("market_id is required");
    }

    const currentTime = Date.now();

    // Check cache
    if (useCache && this.marketCacheTtl > 0) {
      const cached = this.marketCache.get(marketId);
      if (cached && currentTime - cached.time < this.marketCacheTtl * 1000) {
        return cached.data;
      }
    }

    // Fetch fresh data
    const result = await this.apiClient.getMarket(marketId);

    // Update cache
    if (this.marketCacheTtl > 0) {
      this.marketCache.set(marketId, { data: result, time: currentTime });
    }

    return result;
  }

  /**
   * Get categorical market details
   */
  async getCategoricalMarket(marketId: number): Promise<ApiResponse> {
    if (!marketId) {
      throw new InvalidParamError("market_id is required");
    }
    return this.apiClient.getCategoricalMarket(marketId);
  }

  /**
   * Get quote tokens (currencies)
   */
  async getQuoteTokens(useCache: boolean = true): Promise<ApiResponse> {
    const currentTime = Date.now();

    // Check cache
    if (useCache && this.quoteTokensCacheTtl > 0) {
      if (this.quoteTokensCache && currentTime - this.quoteTokensCacheTime < this.quoteTokensCacheTtl * 1000) {
        return this.quoteTokensCache;
      }
    }

    // Fetch fresh data
    const result = await this.apiClient.getQuoteTokens(this.chainId.toString());

    // Update cache
    if (this.quoteTokensCacheTtl > 0) {
      this.quoteTokensCache = result;
      this.quoteTokensCacheTime = currentTime;
    }

    return result;
  }

  /**
   * Get orderbook for a token
   */
  async getOrderbook(tokenId: string): Promise<ApiResponse> {
    if (!tokenId) {
      throw new InvalidParamError("token_id is required");
    }
    return this.apiClient.getOrderbook(tokenId);
  }

  /**
   * Get latest price for a token
   */
  async getLatestPrice(tokenId: string): Promise<ApiResponse> {
    if (!tokenId) {
      throw new InvalidParamError("token_id is required");
    }
    return this.apiClient.getLatestPrice(tokenId);
  }

  /**
   * Get price history for a token
   */
  async getPriceHistory(params: {
    tokenId: string;
    interval?: string;
    startAt?: number;
    endAt?: number;
  }): Promise<ApiResponse> {
    if (!params.tokenId) {
      throw new InvalidParamError("token_id is required");
    }

    return this.apiClient.getPriceHistory({
      tokenId: params.tokenId,
      interval: params.interval || "1h",
      startAt: params.startAt,
      endAt: params.endAt,
    });
  }

  /**
   * Get fee rates for a token
   */
  async getFeeRates(tokenId: string): Promise<ApiResponse> {
    if (!tokenId) {
      throw new InvalidParamError("token_id is required");
    }
    return this.apiClient.getFeeRates(tokenId);
  }

  // ==================== Trading Methods ====================

  /**
   * Place an order
   */
  async placeOrder(data: PlaceOrderDataInput): Promise<ApiResponse> {
    if (!this.signer) {
      throw new InvalidParamError("Private key required for placing orders");
    }
    if (!this.multiSigAddr) {
      throw new InvalidParamError("Multi-sig address required for placing orders");
    }

    // Get quote tokens and market info
    const quoteTokenListResponse = await this.getQuoteTokens();
    const quoteTokenList = this.parseListResponse(quoteTokenListResponse, "get quote tokens");

    const marketResponse = await this.getMarket(data.marketId);
    const market = this.validateMarketResponse(marketResponse, "get market for place order");

    if (parseInt(market.chain_id) !== this.chainId) {
      throw new OpenApiError("Cannot place order on different chain");
    }

    const quoteTokenAddr = market.quote_token;
    const quoteToken = quoteTokenList.find(
      (item: QuoteToken) => item.quote_token_address.toLowerCase() === quoteTokenAddr.toLowerCase()
    );

    if (!quoteToken) {
      throw new OpenApiError("Quote token not found for this market");
    }

    const exchangeAddr = quoteToken.ctf_exchange_address;
    const chainId = quoteToken.chain_id;

    // Validate inputs
    if (data.side === OrderSide.BUY && data.orderType === OrderType.MARKET_ORDER && data.makerAmountInBaseToken) {
      throw new InvalidParamError("makerAmountInBaseToken is not allowed for market buy");
    }

    if (data.side === OrderSide.SELL && data.orderType === OrderType.MARKET_ORDER && data.makerAmountInQuoteToken) {
      throw new InvalidParamError("makerAmountInQuoteToken is not allowed for market sell");
    }

    // Calculate maker amount
    let makerAmount = 0;
    const minimalMakerAmount = 1;

    if (data.side === OrderSide.BUY) {
      if (data.makerAmountInBaseToken) {
        makerAmount = parseFloat(data.makerAmountInBaseToken) * parseFloat(data.price);
        if (parseFloat(data.makerAmountInBaseToken) < minimalMakerAmount) {
          throw new InvalidParamError("makerAmountInBaseToken must be at least 1");
        }
      } else if (data.makerAmountInQuoteToken) {
        makerAmount = parseFloat(data.makerAmountInQuoteToken);
        if (parseFloat(data.makerAmountInQuoteToken) < minimalMakerAmount) {
          throw new InvalidParamError("makerAmountInQuoteToken must be at least 1");
        }
      } else {
        throw new InvalidParamError("Either makerAmountInBaseToken or makerAmountInQuoteToken must be provided for BUY orders");
      }
    } else {
      // SELL
      if (data.makerAmountInBaseToken) {
        makerAmount = parseFloat(data.makerAmountInBaseToken);
        if (parseFloat(data.makerAmountInBaseToken) < minimalMakerAmount) {
          throw new InvalidParamError("makerAmountInBaseToken must be at least 1");
        }
      } else if (data.makerAmountInQuoteToken) {
        const price = parseFloat(data.price);
        if (price === 0) {
          throw new InvalidParamError("Price cannot be zero for SELL orders with makerAmountInQuoteToken");
        }
        makerAmount = parseFloat(data.makerAmountInQuoteToken) / price;
        if (parseFloat(data.makerAmountInQuoteToken) < minimalMakerAmount) {
          throw new InvalidParamError("makerAmountInQuoteToken must be at least 1");
        }
      } else {
        throw new InvalidParamError("Either makerAmountInBaseToken or makerAmountInQuoteToken must be provided for SELL orders");
      }
    }

    if (makerAmount <= 0) {
      throw new InvalidParamError(`Calculated makerAmount must be positive, got: ${makerAmount}`);
    }

    const input: OrderDataInput = {
      marketId: data.marketId,
      tokenId: data.tokenId,
      makerAmount: makerAmount.toString(),
      price: data.price,
      orderType: data.orderType,
      side: data.side,
    };

    return this.placeOrderInternal(input, exchangeAddr, chainId, quoteTokenAddr, parseInt(quoteToken.decimal));
  }

  /**
   * Internal method to place order
   */
  private async placeOrderInternal(
    data: OrderDataInput,
    exchangeAddr: string,
    chainId: number,
    currencyAddr: string,
    currencyDecimal: number
  ): Promise<ApiResponse> {
    if (!this.signer || !this.multiSigAddr) {
      throw new InvalidParamError("Signer and multi-sig address required");
    }

    const builder = new OrderBuilder(exchangeAddr, chainId, this.signer);

    let takerAmount = 0n;
    let recalculatedMakerAmount: bigint;

    if (data.orderType === OrderType.MARKET_ORDER) {
      takerAmount = 0n;
      data.price = "0";
      recalculatedMakerAmount = safeAmountToWei(parseFloat(data.makerAmount), currencyDecimal);
    } else {
      // LIMIT_ORDER
      const makerAmountWei = safeAmountToWei(parseFloat(data.makerAmount), currencyDecimal);
      const result = calculateOrderAmounts(parseFloat(data.price), makerAmountWei, data.side, currencyDecimal);
      recalculatedMakerAmount = result.recalculatedMakerAmount;
      takerAmount = result.takerAmount;
    }

    const orderData: OrderData = {
      maker: this.multiSigAddr,
      taker: ZERO_ADDRESS,
      tokenId: data.tokenId,
      makerAmount: recalculatedMakerAmount.toString(),
      takerAmount: takerAmount.toString(),
      feeRateBps: "0",
      side: data.side,
      signatureType: SignatureType.POLY_GNOSIS_SAFE,
      signer: this.signer.address(),
    };

    const signedOrder = await builder.buildSignedOrder(orderData);
    const orderDict = OrderBuilder.toDict(signedOrder);

    // Create API request
    const apiOrderData = {
      salt: orderDict.salt,
      topic_id: data.marketId,
      maker: orderDict.maker,
      signer: orderDict.signer,
      taker: orderDict.taker,
      token_id: orderDict.tokenId,
      maker_amount: orderDict.makerAmount,
      taker_amount: orderDict.takerAmount,
      expiration: orderDict.expiration,
      nonce: orderDict.nonce,
      fee_rate_bps: orderDict.feeRateBps,
      side: orderDict.side,
      signature_type: orderDict.signatureType,
      signature: orderDict.signature,
      sign: orderDict.signature,
      contract_address: "",
      currency_address: currencyAddr,
      price: data.price,
      trading_method: data.orderType,
      timestamp: Math.floor(Date.now() / 1000),
      safe_rate: "0",
      order_exp_time: "0",
    };

    return this.apiClient.placeOrder(apiOrderData);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<ApiResponse> {
    if (!orderId) {
      throw new InvalidParamError("order_id must be a non-empty string");
    }
    return this.apiClient.cancelOrder(orderId);
  }

  // ==================== User Data Methods ====================

  /**
   * Get user's orders
   */
  async getMyOrders(params?: { marketId?: number; status?: string; limit?: number; page?: number }): Promise<ApiResponse> {
    return this.apiClient.getMyOrders({
      chainId: this.chainId.toString(),
      marketId: params?.marketId,
      status: params?.status,
      limit: params?.limit ?? 10,
      page: params?.page ?? 1,
    });
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<ApiResponse> {
    if (!orderId) {
      throw new InvalidParamError("order_id must be a non-empty string");
    }
    return this.apiClient.getOrderById(orderId);
  }

  /**
   * Get user's positions
   */
  async getMyPositions(params?: { marketId?: number; page?: number; limit?: number }): Promise<ApiResponse> {
    return this.apiClient.getMyPositions({
      chainId: this.chainId.toString(),
      marketId: params?.marketId,
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
    });
  }

  /**
   * Get user's balances
   */
  async getMyBalances(): Promise<ApiResponse> {
    return this.apiClient.getMyBalances(this.chainId.toString());
  }

  /**
   * Get user's trade history
   */
  async getMyTrades(params?: { marketId?: number; page?: number; limit?: number }): Promise<ApiResponse> {
    return this.apiClient.getMyTrades({
      chainId: this.chainId.toString(),
      marketId: params?.marketId,
      page: params?.page ?? 1,
      limit: params?.limit ?? 10,
    });
  }

  /**
   * Get user authentication info
   */
  async getUserAuth(): Promise<ApiResponse> {
    return this.apiClient.getUserAuth();
  }

  // ==================== Helper Methods ====================

  private validateMarketResponse(response: any, operationName: string = "operation"): any {
    if (response.errno && response.errno !== 0) {
      throw new OpenApiError(`Failed to ${operationName}: ${JSON.stringify(response)}`);
    }

    if (!response.result || !response.result.data) {
      throw new OpenApiError(`Invalid response format for ${operationName}`);
    }

    return response.result.data;
  }

  private parseListResponse(response: any, operationName: string = "operation"): any[] {
    if (response.errno && response.errno !== 0) {
      throw new OpenApiError(`Failed to ${operationName}: ${JSON.stringify(response)}`);
    }

    if (!response.result || !response.result.list) {
      throw new OpenApiError(`Invalid list response format for ${operationName}`);
    }

    return response.result.list;
  }
}
