/**
 * Utility functions for Gnosis Safe operations
 */

import { ethers } from "ethers";

/**
 * Fast keccak256 hash function
 */
export function fastKeccak(value: string | Uint8Array): string {
  return ethers.keccak256(value);
}

/**
 * Fast keccak256 hash for text
 */
export function fastKeccakText(value: string): string {
  return fastKeccak(ethers.toUtf8Bytes(value));
}

/**
 * Convert address to checksum address
 */
export function fastToChecksumAddress(address: string): string {
  return ethers.getAddress(address.toLowerCase());
}

/**
 * Convert bytes to checksum address
 */
export function fastBytesToChecksumAddress(bytes: Uint8Array): string {
  if (bytes.length !== 20) {
    throw new Error("Cannot convert to checksum address, 20 bytes were expected");
  }
  const address = "0x" + Buffer.from(bytes).toString("hex");
  return fastToChecksumAddress(address);
}

/**
 * Check if an address is a valid checksum address
 */
export function fastIsChecksumAddress(address: string): boolean {
  if (!address || typeof address !== "string" || address.length !== 42 || !address.startsWith("0x")) {
    return false;
  }
  try {
    return fastToChecksumAddress(address) === address;
  } catch {
    return false;
  }
}

/**
 * Get empty transaction params for building transaction data
 */
export function getEmptyTxParams(): { gas: bigint; gasPrice: bigint } {
  return {
    gas: BigInt(1),
    gasPrice: BigInt(1),
  };
}

/**
 * Encode multiple MultiSend transactions into bytes
 */
export function encodeMultiSendData(txs: Array<{ operation: number; to: string; value: bigint; data: string }>): string {
  let encodedData = "0x";

  for (const tx of txs) {
    // Encode each transaction:
    // operation (1 byte) | to (20 bytes) | value (32 bytes) | data length (32 bytes) | data (variable)
    const operation = tx.operation.toString(16).padStart(2, "0");
    const to = tx.to.slice(2).padStart(40, "0");
    const value = tx.value.toString(16).padStart(64, "0");

    // Remove 0x prefix if present and get hex string
    const dataHex = tx.data.startsWith("0x") ? tx.data.slice(2) : tx.data;
    const dataLength = (dataHex.length / 2).toString(16).padStart(64, "0");

    encodedData += operation + to + value + dataLength + dataHex;
  }

  return encodedData;
}

/**
 * Safely convert any value to bytes
 */
export function toBytes(value: string | Uint8Array): Uint8Array {
  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      return ethers.getBytes(value);
    }
    return ethers.toUtf8Bytes(value);
  }
  return value;
}
