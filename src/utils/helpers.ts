/**
 * Utility helper functions
 */

import { ethers } from "ethers";
import { OrderSide } from "../types/enums";
import { InvalidParamError } from "../types/errors";
import { MAX_DECIMALS } from "../config";

/**
 * Normalize an Ethereum address to checksummed format
 */
export function normalizeAddress(address: string): string {
  return ethers.getAddress(address);
}

/**
 * Generate a pseudo-random seed for salt
 */
export function generateSeed(): bigint {
  const now = Date.now();
  const random = Math.random();
  return BigInt(Math.round(now * random));
}

/**
 * Round an integer to n significant digits
 */
export function roundToSignificantDigits(value: bigint, n: number): bigint {
  if (value === 0n) {
    return 0n;
  }

  const valueStr = value.toString();
  const magnitude = valueStr.length;

  if (magnitude <= n) {
    return value;
  }

  const divisor = 10n ** BigInt(magnitude - n);
  const rounded = (value + divisor / 2n) / divisor * divisor;

  return rounded;
}

/**
 * Prepend 0x to a hex string if missing
 */
export function prependZx(inStr: string): string {
  if (inStr.length > 2 && !inStr.startsWith("0x")) {
    return `0x${inStr}`;
  }
  return inStr;
}

/**
 * Safely convert human-readable amount to wei units without precision loss
 */
export function safeAmountToWei(amount: number, decimals: number): bigint {
  if (amount <= 0) {
    throw new InvalidParamError(`Amount must be positive, got: ${amount}`);
  }

  if (decimals < 0 || decimals > MAX_DECIMALS) {
    throw new InvalidParamError(`Decimals must be between 0 and ${MAX_DECIMALS}, got: ${decimals}`);
  }

  // Use ethers.js parseUnits for precise conversion
  const amountStr = amount.toString();
  const result = ethers.parseUnits(amountStr, decimals);

  // Validate result fits in uint256
  const MAX_UINT256 = 2n ** 256n - 1n;
  if (result > MAX_UINT256) {
    throw new InvalidParamError(`Amount too large for uint256: ${result}`);
  }

  if (result <= 0n) {
    throw new InvalidParamError(`Calculated amount is zero or negative: ${result}`);
  }

  return result;
}

/**
 * GCD (Greatest Common Divisor) helper for fraction simplification
 */
function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

/**
 * Simple Fraction class for precise price calculations
 */
class Fraction {
  numerator: bigint;
  denominator: bigint;

  constructor(num: bigint, denom: bigint) {
    const divisor = gcd(num, denom);
    this.numerator = num / divisor;
    this.denominator = denom / divisor;
  }

  static fromDecimal(decimal: string, maxDenominator: bigint = 1000000n): Fraction {
    // Convert decimal string to fraction
    const parts = decimal.split(".");
    if (parts.length === 1) {
      return new Fraction(BigInt(parts[0]), 1n);
    }

    const intPart = parts[0] || "0";
    const decPart = parts[1];
    const denominator = 10n ** BigInt(decPart.length);
    const numerator = BigInt(intPart) * denominator + BigInt(decPart);

    // Limit denominator
    const frac = new Fraction(numerator, denominator);
    if (frac.denominator > maxDenominator) {
      // Simple approximation: round to maxDenominator
      const scale = frac.denominator / maxDenominator;
      return new Fraction(frac.numerator / scale, maxDenominator);
    }

    return frac;
  }
}

/**
 * Calculate order amounts based on price and side
 *
 * Uses precise arithmetic and ensures the calculated price from amounts
 * exactly matches the input price by using fractional representation.
 */
export function calculateOrderAmounts(
  price: number,
  makerAmount: bigint,
  side: OrderSide,
  decimals: number
): { recalculatedMakerAmount: bigint; takerAmount: bigint } {
  // Validate price
  const priceStr = price.toString();
  const minPrice = 0.001;
  const maxPrice = 0.999;

  if (price < minPrice || price > maxPrice) {
    throw new InvalidParamError(`Price must be between ${minPrice} and ${maxPrice} (inclusive), got ${price}`);
  }

  // Check precision (max 6 decimal places)
  const decimalPlaces = (priceStr.split(".")[1] || "").length;
  if (decimalPlaces > 6) {
    throw new InvalidParamError(`Price precision cannot exceed 6 decimal places, got ${price}`);
  }

  // Convert price to fraction for exact representation
  const priceFraction = Fraction.fromDecimal(priceStr, 1000000n);

  let recalculatedMakerAmount: bigint;
  let takerAmount: bigint;

  if (side === OrderSide.BUY) {
    // For BUY: price = maker/taker
    // Round maker to 4 significant digits
    const maker4digit = roundToSignificantDigits(makerAmount, 4);

    // Find scaling factor k
    let k = maker4digit / priceFraction.numerator;
    if (k === 0n) {
      k = 1n;
    }

    // Calculate exact amounts
    recalculatedMakerAmount = k * priceFraction.numerator;
    takerAmount = k * priceFraction.denominator;
  } else {
    // For SELL: price = taker/maker
    const maker4digit = roundToSignificantDigits(makerAmount, 4);

    // Find scaling factor k
    let k = maker4digit / priceFraction.denominator;
    if (k === 0n) {
      k = 1n;
    }

    // Calculate exact amounts
    recalculatedMakerAmount = k * priceFraction.denominator;
    takerAmount = k * priceFraction.numerator;
  }

  // Ensure amounts are at least 1
  takerAmount = takerAmount < 1n ? 1n : takerAmount;
  recalculatedMakerAmount = recalculatedMakerAmount < 1n ? 1n : recalculatedMakerAmount;

  // Validate the calculated price is within bounds
  const calculatedPrice =
    side === OrderSide.BUY
      ? Number(recalculatedMakerAmount) / Number(takerAmount)
      : Number(takerAmount) / Number(recalculatedMakerAmount);

  if (calculatedPrice > 0.999 || calculatedPrice < 0.001) {
    throw new InvalidParamError("Invalid taker_amount and recalculated_maker_amount");
  }

  return { recalculatedMakerAmount, takerAmount };
}

/**
 * Fast checksum address conversion (alias for normalizeAddress)
 */
export function fastToChecksumAddress(address: string): string {
  return normalizeAddress(address);
}
