/**
 * API client for Opinion CLOB API
 */

import axios, { AxiosInstance } from "axios";
import { OpenApiError } from "../types/errors";
import { TopicStatusFilter, TopicType } from "../types/enums";

export interface ApiResponse<T = any> {
  errno: number;
  errmsg?: string;
  result?: {
    data?: T;
    list?: T[];
  };
}

export class ApiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(host: string, apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: host,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private async request<T>(method: string, endpoint: string, params?: any, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        params: { ...params, apikey: this.apiKey },
        data,
      });
      return response.data;
    } catch (error: any) {
      throw new OpenApiError(`API request failed: ${error.message}`);
    }
  }

  async getMarkets(params: {
    chainId: string;
    marketType?: number;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse> {
    return this.request("GET", "/openapi/market", {
      chain_id: params.chainId,
      market_type: params.marketType,
      page: params.page,
      limit: params.limit,
      status: params.status,
    });
  }

  async getMarket(marketId: number): Promise<ApiResponse> {
    return this.request("GET", `/openapi/market/${marketId}`);
  }

  async getCategoricalMarket(marketId: number): Promise<ApiResponse> {
    return this.request("GET", `/openapi/market/categorical/${marketId}`);
  }

  async getQuoteTokens(chainId: string): Promise<ApiResponse> {
    return this.request("GET", "/openapi/quote_token", { chain_id: chainId });
  }

  async getOrderbook(tokenId: string): Promise<ApiResponse> {
    return this.request("GET", "/openapi/token/orderbook", { token_id: tokenId });
  }

  async getLatestPrice(tokenId: string): Promise<ApiResponse> {
    return this.request("GET", "/openapi/token/latest_price", { token_id: tokenId });
  }

  async getPriceHistory(params: {
    tokenId: string;
    interval: string;
    startAt?: number;
    endAt?: number;
  }): Promise<ApiResponse> {
    return this.request("GET", "/openapi/token/price/history", {
      token_id: params.tokenId,
      interval: params.interval,
      start_at: params.startAt,
      end_at: params.endAt,
    });
  }

  async getFeeRates(tokenId: string): Promise<ApiResponse> {
    return this.request("GET", "/openapi/token/fee_rates", { token_id: tokenId });
  }

  async placeOrder(orderData: any): Promise<ApiResponse> {
    return this.request("POST", "/openapi/order", undefined, orderData);
  }

  async cancelOrder(orderId: string): Promise<ApiResponse> {
    return this.request("POST", "/openapi/order/cancel", undefined, { order_id: orderId });
  }

  async getMyOrders(params: {
    chainId: string;
    marketId?: number;
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<ApiResponse> {
    return this.request("GET", "/openapi/order", {
      chain_id: params.chainId,
      market_id: params.marketId && params.marketId > 0 ? params.marketId : undefined,
      status: params.status,
      limit: params.limit,
      page: params.page,
    });
  }

  async getOrderById(orderId: string): Promise<ApiResponse> {
    return this.request("GET", `/openapi/order/${orderId}`);
  }

  async getMyPositions(params: {
    chainId: string;
    marketId?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    return this.request("GET", "/openapi/positions", {
      chain_id: params.chainId,
      market_id: params.marketId && params.marketId > 0 ? params.marketId : undefined,
      page: params.page,
      limit: params.limit,
    });
  }

  async getMyBalances(chainId: string): Promise<ApiResponse> {
    return this.request("GET", "/openapi/user/balance", { chain_id: chainId });
  }

  async getMyTrades(params: {
    chainId: string;
    marketId?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    return this.request("GET", "/openapi/trade", {
      chain_id: params.chainId,
      market_id: params.marketId,
      page: params.page,
      limit: params.limit,
    });
  }

  async getUserAuth(): Promise<ApiResponse> {
    return this.request("GET", "/openapi/user/auth");
  }
}
