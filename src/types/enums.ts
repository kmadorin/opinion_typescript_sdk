/**
 * Enums for Opinion CLOB SDK
 */

export enum TopicStatus {
  CREATED = 1,
  ACTIVATED = 2,
  RESOLVING = 3,
  RESOLVED = 4,
  FAILED = 5,
  DELETED = 6,
}

export enum TopicType {
  CATEGORICAL = 1,
  BINARY = 0,
}

export enum TopicStatusFilter {
  ALL = "all",
  ACTIVATED = "activated",
  RESOLVED = "resolved",
}

export enum OrderSide {
  BUY = 0,
  SELL = 1,
}

export enum OrderType {
  MARKET_ORDER = 1,
  LIMIT_ORDER = 2,
}

export enum SignatureType {
  EOA = 0,
  POLY_GNOSIS_SAFE = 1,
  POLY_PROXY = 2,
}
