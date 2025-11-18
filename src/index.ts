/**
 * Opinion CLOB SDK - TypeScript SDK for Opinion Prediction Markets
 *
 * @packageDocumentation
 */

export { Client, ClientConfig } from "./client";

// Types and Enums
export { OrderSide, OrderType, TopicStatus, TopicStatusFilter, TopicType, SignatureType } from "./types/enums";

// Models
export { OrderDataInput, PlaceOrderDataInput, OrderData, Order, SignedOrder, OrderDict } from "./models/order";

// Errors
export {
  InvalidParamError,
  OpenApiError,
  BalanceNotEnoughError,
  NoPositionsToRedeemError,
  InsufficientGasBalanceError,
  ValidationError,
} from "./types/errors";

// Config
export {
  SUPPORTED_CHAIN_IDS,
  DEFAULT_CONTRACT_ADDRESSES,
  CHAIN_ID_BNB_MAINNET,
  MAX_DECIMALS,
  SupportedChainId,
} from "./config";

// Utility functions
export {
  normalizeAddress,
  generateSeed,
  roundToSignificantDigits,
  prependZx,
  safeAmountToWei,
  calculateOrderAmounts,
  fastToChecksumAddress,
} from "./utils/helpers";
