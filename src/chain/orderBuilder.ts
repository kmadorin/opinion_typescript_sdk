/**
 * Order builder for creating and signing orders
 */

import { ethers } from "ethers";
import { Signer } from "./signer";
import { OrderData, Order, SignedOrder, OrderDict } from "../models/order";
import { OrderSide, SignatureType } from "../types/enums";
import { ValidationError } from "../types/errors";
import { ZERO_ADDRESS } from "../utils/constants";
import { normalizeAddress, prependZx, generateSeed } from "../utils/helpers";

export class OrderBuilder {
  private exchangeAddress: string;
  private chainId: number;
  private signer: Signer;
  private saltGenerator: () => bigint;

  constructor(exchangeAddress: string, chainId: number, signer: Signer, saltGenerator: () => bigint = generateSeed) {
    this.exchangeAddress = exchangeAddress;
    this.chainId = chainId;
    this.signer = signer;
    this.saltGenerator = saltGenerator;
  }

  /**
   * Build an order from OrderData
   */
  buildOrder(data: OrderData): Order {
    if (!this.validateInputs(data)) {
      throw new ValidationError("Invalid order inputs");
    }

    const signer = data.signer || data.maker;

    if (signer !== this.signer.address()) {
      throw new ValidationError("Signer does not match");
    }

    const expiration = data.expiration || "0";
    const signatureType = data.signatureType || SignatureType.EOA;
    const nonce = data.nonce || "0";

    return {
      salt: this.saltGenerator(),
      maker: normalizeAddress(data.maker),
      signer: normalizeAddress(signer),
      taker: normalizeAddress(data.taker || ZERO_ADDRESS),
      tokenId: BigInt(data.tokenId),
      makerAmount: BigInt(data.makerAmount),
      takerAmount: BigInt(data.takerAmount),
      expiration: BigInt(expiration),
      nonce: BigInt(nonce),
      feeRateBps: BigInt(data.feeRateBps),
      side: Number(data.side),
      signatureType: Number(signatureType),
    };
  }

  /**
   * Create EIP712 struct hash for signing
   */
  private createStructHash(order: Order): string {
    // EIP712 domain
    const domain = {
      name: "CTF Exchange",
      version: "1",
      chainId: this.chainId,
      verifyingContract: this.exchangeAddress,
    };

    // EIP712 types
    const types = {
      Order: [
        { name: "salt", type: "uint256" },
        { name: "maker", type: "address" },
        { name: "signer", type: "address" },
        { name: "taker", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "makerAmount", type: "uint256" },
        { name: "takerAmount", type: "uint256" },
        { name: "expiration", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "feeRateBps", type: "uint256" },
        { name: "side", type: "uint8" },
        { name: "signatureType", type: "uint8" },
      ],
    };

    // Create typed data hash
    const hash = ethers.TypedDataEncoder.hash(domain, types, order);
    return hash;
  }

  /**
   * Build order signature
   */
  async buildOrderSignature(order: Order): Promise<string> {
    const hash = this.createStructHash(order);
    const signature = await this.signer.sign(hash);
    return prependZx(signature);
  }

  /**
   * Build and sign an order
   */
  async buildSignedOrder(data: OrderData): Promise<SignedOrder> {
    const order = this.buildOrder(data);
    const signature = await this.buildOrderSignature(order);

    return {
      order,
      signature,
    };
  }

  /**
   * Validate order inputs
   */
  private validateInputs(data: OrderData): boolean {
    if (!data.maker || !data.tokenId || !data.makerAmount || !data.takerAmount || data.side === undefined) {
      return false;
    }

    if (data.side !== OrderSide.BUY && data.side !== OrderSide.SELL) {
      return false;
    }

    const feeRateBps = Number(data.feeRateBps);
    if (isNaN(feeRateBps) || feeRateBps < 0) {
      return false;
    }

    const nonce = Number(data.nonce || "0");
    if (isNaN(nonce) || nonce < 0) {
      return false;
    }

    const expiration = Number(data.expiration || "0");
    if (isNaN(expiration) || expiration < 0) {
      return false;
    }

    const signatureType = data.signatureType;
    if (
      signatureType !== undefined &&
      signatureType !== SignatureType.EOA &&
      signatureType !== SignatureType.POLY_GNOSIS_SAFE &&
      signatureType !== SignatureType.POLY_PROXY
    ) {
      return false;
    }

    return true;
  }

  /**
   * Convert signed order to dictionary format for API
   */
  static toDict(signedOrder: SignedOrder): OrderDict {
    const order = signedOrder.order;
    return {
      salt: order.salt.toString(),
      maker: order.maker,
      signer: order.signer,
      taker: order.taker,
      tokenId: order.tokenId.toString(),
      makerAmount: order.makerAmount.toString(),
      takerAmount: order.takerAmount.toString(),
      expiration: order.expiration.toString(),
      nonce: order.nonce.toString(),
      feeRateBps: order.feeRateBps.toString(),
      side: order.side === 0 ? "BUY" : "SELL",
      signatureType: order.signatureType.toString(),
      signature: signedOrder.signature,
    };
  }
}
