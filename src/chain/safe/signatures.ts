/**
 * Signature utilities for Gnosis Safe
 */

import { ethers } from "ethers";
import { SafeSignatureType } from "./constants";

/**
 * Convert signature components (v, r, s) to bytes
 */
export function signatureToBytes(v: number, r: bigint, s: bigint): string {
  const rHex = r.toString(16).padStart(64, "0");
  const sHex = s.toString(16).padStart(64, "0");
  const vHex = v.toString(16).padStart(2, "0");
  return "0x" + rHex + sHex + vHex;
}

/**
 * Split signature bytes into components
 */
export function signatureSplit(signatures: string, pos: number = 0): { v: number; r: bigint; s: bigint } {
  const sigBytes = ethers.getBytes(signatures);
  const signaturePos = 65 * pos;

  if (sigBytes.length < signaturePos + 65) {
    throw new Error(`Signature must be at least 65 bytes, got ${sigBytes.length}`);
  }

  const r = BigInt("0x" + Buffer.from(sigBytes.slice(signaturePos, signaturePos + 32)).toString("hex"));
  const s = BigInt("0x" + Buffer.from(sigBytes.slice(signaturePos + 32, signaturePos + 64)).toString("hex"));
  const v = sigBytes[signaturePos + 64];

  return { v, r, s };
}

/**
 * Build signature bytes for Safe contract
 * Adjusts v value for Safe (must be >= 27)
 */
export function buildSignatureBytes(signature: string, signatureType: SafeSignatureType = SafeSignatureType.EOA): string {
  // Parse the signature
  const sig = ethers.Signature.from(signature);

  // Adjust v value for Safe
  // Safe expects v to be 27 or 28 (or higher for contract signatures)
  let v = sig.v;
  if (v < 27) {
    v += 27;
  }

  // For EOA signatures, encode as r + s + v
  return signatureToBytes(v, BigInt(sig.r), BigInt(sig.s));
}

/**
 * Adjust v value in signature for Safe compatibility
 * Safe requires v >= 27
 */
export function adjustVInSignature(signature: string): string {
  const { v, r, s } = signatureSplit(signature);
  const adjustedV = v < 27 ? v + 27 : v;
  return signatureToBytes(adjustedV, r, s);
}

/**
 * Get signing address from signature
 */
export function getSigningAddress(messageHash: string, signature: string): string {
  try {
    return ethers.recoverAddress(messageHash, signature);
  } catch {
    return ethers.ZeroAddress;
  }
}
