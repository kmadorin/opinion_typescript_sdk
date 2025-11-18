/**
 * Custom error classes for Opinion CLOB SDK
 */

export class InvalidParamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidParamError";
  }
}

export class OpenApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenApiError";
  }
}

export class BalanceNotEnoughError extends Error {
  constructor(message: string = "Insufficient balance") {
    super(message);
    this.name = "BalanceNotEnoughError";
  }
}

export class NoPositionsToRedeemError extends Error {
  constructor(message: string = "No positions available to redeem") {
    super(message);
    this.name = "NoPositionsToRedeemError";
  }
}

export class InsufficientGasBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientGasBalanceError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
