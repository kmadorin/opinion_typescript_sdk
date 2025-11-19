/**
 * MultiSend transaction encoding and handling for Gnosis Safe
 */

import { ethers } from "ethers";
import { MultiSendTx } from "./types";
import { SafeOperation } from "./constants";
import { MULTISEND_V1_3_0_ABI } from "./contracts/multisendV1_3_0";
import { getEmptyTxParams } from "./utils";

/**
 * MultiSend contract addresses on different chains
 */
export const MULTISEND_ADDRESSES = {
  // MultiSend v1.3.0 (standard)
  STANDARD: "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761",
  // MultiSend v1.3.0 (EIP-155)
  EIP155: "0x998739BFdAAdde7C933B942a68053933098f9EDa",
};

/**
 * MultiSend Call Only addresses (only allow CALL operations)
 */
export const MULTISEND_CALL_ONLY_ADDRESSES = {
  STANDARD: "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
  EIP155: "0xA1dabEF33b3B82c7814B6D82A79e50F4AC44102B",
};

/**
 * Encode a single MultiSend transaction
 */
function encodeMultiSendTx(tx: MultiSendTx): string {
  // Encoding format:
  // operation (1 byte) | to (20 bytes) | value (32 bytes) | data length (32 bytes) | data (variable)

  const operation = tx.operation.toString(16).padStart(2, "0");
  const to = tx.to.slice(2).toLowerCase().padStart(40, "0");
  const value = tx.value.toString(16).padStart(64, "0");

  // Get data as hex string without 0x prefix
  const dataHex = tx.data.startsWith("0x") ? tx.data.slice(2) : tx.data;
  const dataLength = (dataHex.length / 2).toString(16).padStart(64, "0");

  return operation + to + value + dataLength + dataHex;
}

/**
 * Encode multiple transactions for MultiSend
 */
export function encodeMultiSend(txs: MultiSendTx[]): string {
  let encoded = "";
  for (const tx of txs) {
    encoded += encodeMultiSendTx(tx);
  }
  return "0x" + encoded;
}

/**
 * MultiSend class for handling batched transactions
 */
export class MultiSend {
  private address: string;
  private callOnly: boolean;
  private provider: ethers.Provider;
  private contract: ethers.Contract;

  constructor(provider: ethers.Provider, address?: string, callOnly: boolean = false) {
    this.provider = provider;
    this.callOnly = callOnly;

    // Use provided address or try to detect it
    if (address) {
      this.address = address;
    } else {
      // Default to EIP-155 version
      this.address = callOnly ? MULTISEND_CALL_ONLY_ADDRESSES.EIP155 : MULTISEND_ADDRESSES.EIP155;
    }

    this.contract = new ethers.Contract(this.address, MULTISEND_V1_3_0_ABI, provider);
  }

  /**
   * Build transaction data for MultiSend
   */
  buildTxData(txs: MultiSendTx[]): string {
    const encodedTxs = encodeMultiSend(txs);
    const iface = new ethers.Interface(MULTISEND_V1_3_0_ABI);
    return iface.encodeFunctionData("multiSend", [encodedTxs]);
  }

  /**
   * Estimate gas for MultiSend transaction
   * Only supports DELEGATE_CALL operation for Safe and CALL for individual txs
   */
  async estimateGas(txs: MultiSendTx[], safeAddress: string): Promise<bigint> {
    let totalGas = BigInt(0);

    for (const tx of txs) {
      if (tx.operation === SafeOperation.DELEGATE_CALL) {
        throw new Error("DELEGATE_CALL operation not supported in MultiSend gas estimation");
      }

      try {
        const gas = await this.provider.estimateGas({
          from: safeAddress,
          to: tx.to,
          value: tx.value,
          data: tx.data,
        });
        totalGas += gas;
      } catch (error) {
        // If estimation fails, use a conservative estimate
        console.warn(`Gas estimation failed for tx to ${tx.to}, using fallback`, error);
        totalGas += BigInt(100000); // Fallback gas estimate
      }
    }

    // Add safety margin of 50% to protect against gas volatility
    return (totalGas * BigInt(150)) / BigInt(100);
  }

  /**
   * Get the MultiSend contract address
   */
  getAddress(): string {
    return this.address;
  }
}
