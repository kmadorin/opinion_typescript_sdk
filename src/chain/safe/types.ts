/**
 * Type definitions for Gnosis Safe operations
 */

import { SafeOperation } from "./constants";

/**
 * MultiSend transaction structure
 */
export interface MultiSendTx {
  operation: SafeOperation;
  to: string;
  value: bigint;
  data: string;
}

/**
 * Safe transaction parameters
 */
export interface SafeTxParams {
  to: string;
  value: bigint;
  data: string;
  operation?: SafeOperation;
  safeTxGas?: bigint;
  baseGas?: bigint;
  gasPrice?: bigint;
  gasToken?: string;
  refundReceiver?: string;
  nonce?: number;
}

/**
 * Transaction receipt returned from blockchain operations
 */
export interface TransactionReceipt {
  txHash: string;
  safeTxHash?: string;
  blockNumber: number;
  gasUsed: bigint;
  status: number; // 1 = success, 0 = failure
}

/**
 * EIP712 domain for Safe transactions
 */
export interface EIP712Domain {
  chainId?: number;
  verifyingContract: string;
}

/**
 * EIP712 typed data structure
 */
export interface EIP712TypedData {
  types: {
    EIP712Domain: Array<{ name: string; type: string }>;
    [key: string]: Array<{ name: string; type: string }>;
  };
  primaryType: string;
  domain: EIP712Domain;
  message: Record<string, any>;
}
