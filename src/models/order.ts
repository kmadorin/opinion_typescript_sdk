/**
 * Order data models
 */

import { OrderSide, OrderType, SignatureType } from "../types/enums";

export interface OrderDataInput {
  marketId: number;
  tokenId: string;
  makerAmount: string;
  price: string;
  side: OrderSide;
  orderType: OrderType;
}

export interface PlaceOrderDataInput {
  marketId: number;
  tokenId: string;
  makerAmountInQuoteToken?: string;
  makerAmountInBaseToken?: string;
  price: string;
  side: OrderSide;
  orderType: OrderType;
}

export interface OrderData {
  maker: string;
  taker?: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  side: OrderSide;
  feeRateBps: string;
  nonce?: string;
  signer?: string;
  expiration?: string;
  signatureType?: SignatureType;
}

export interface Order {
  salt: bigint;
  maker: string;
  signer: string;
  taker: string;
  tokenId: bigint;
  makerAmount: bigint;
  takerAmount: bigint;
  expiration: bigint;
  nonce: bigint;
  feeRateBps: bigint;
  side: number;
  signatureType: number;
}

export interface SignedOrder {
  order: Order;
  signature: string;
}

export interface OrderDict {
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: string | number;
  signatureType: string;
  signature?: string;
}
