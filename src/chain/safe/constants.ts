/**
 * Constants for Gnosis Safe operations
 */

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
export const NULL_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const SENTINEL_OWNERS = "0x0000000000000000000000000000000000000001";

/**
 * Safe operation types
 */
export enum SafeOperation {
  CALL = 0,
  DELEGATE_CALL = 1,
}

/**
 * Safe signature types
 */
export enum SafeSignatureType {
  CONTRACT_SIGNATURE = 0,
  APPROVED_HASH = 1,
  EOA = 2,
  ETH_SIGN = 3,
}

/**
 * Gas required for token transfer
 */
export const TOKEN_TRANSFER_GAS = 60000;
