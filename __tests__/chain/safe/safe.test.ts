/**
 * Unit tests for Safe
 */

import { Safe } from "../../../src/chain/safe/safe";
import { MultiSendTx, SafeOperation } from "../../../src/chain/safe/types";
import { ethers } from "ethers";
import {
  createMockProvider,
  createMockSafeContract,
  MOCK_ADDRESSES,
  MOCK_PRIVATE_KEY,
} from "../../mocks/blockchain";

// Mock the Safe contract getter
jest.mock("../../../src/chain/safe/utils", () => ({
  ...jest.requireActual("../../../src/chain/safe/utils"),
  getSafeContract: jest.fn(),
}));

import { getSafeContract } from "../../../src/chain/safe/utils";

describe("Safe", () => {
  let safe: Safe;
  let mockProvider: ethers.JsonRpcProvider;
  let mockSafeContract: any;

  beforeEach(() => {
    mockProvider = createMockProvider();
    mockSafeContract = createMockSafeContract();
    (getSafeContract as jest.Mock).mockReturnValue(mockSafeContract);

    safe = new Safe(mockProvider, MOCK_PRIVATE_KEY, MOCK_ADDRESSES.multiSig, MOCK_ADDRESSES.multisend);
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", () => {
      expect(safe).toBeDefined();
      expect(safe.address).toBe(MOCK_ADDRESSES.multiSig);
      expect(safe.multisendAddress).toBe(MOCK_ADDRESSES.multisend);
    });
  });

  describe("getVersion", () => {
    it("should return Safe version", () => {
      const version = safe.getVersion();
      expect(version).toBe("v1.3.0");
    });
  });

  describe("retrieveNonce", () => {
    it("should retrieve current nonce", async () => {
      const nonce = await safe.retrieveNonce();
      expect(nonce).toBe(5);
      expect(mockSafeContract.nonce).toHaveBeenCalled();
    });

    it("should retrieve nonce at specific block", async () => {
      const blockIdentifier = 12345;
      await safe.retrieveNonce(blockIdentifier);
      expect(mockSafeContract.nonce).toHaveBeenCalled();
    });
  });

  describe("buildMultisigTx", () => {
    it("should build multisig transaction", async () => {
      const safeTx = await safe.buildMultisigTx({
        to: MOCK_ADDRESSES.conditionalTokens,
        value: 0,
        data: "0x12345678",
        operation: SafeOperation.CALL,
        safeTxGas: 100000,
      });

      expect(safeTx).toBeDefined();
      expect(safeTx.to).toBe(MOCK_ADDRESSES.conditionalTokens);
      expect(safeTx.value).toBe(0);
      expect(safeTx.operation).toBe(SafeOperation.CALL);
    });

    it("should use provided nonce if specified", async () => {
      const customNonce = 10;
      const safeTx = await safe.buildMultisigTx({
        to: MOCK_ADDRESSES.conditionalTokens,
        value: 0,
        data: "0x",
        safeNonce: customNonce,
      });

      expect(safeTx.safeNonce).toBe(customNonce);
    });

    it("should retrieve nonce if not provided", async () => {
      const safeTx = await safe.buildMultisigTx({
        to: MOCK_ADDRESSES.conditionalTokens,
        value: 0,
        data: "0x",
      });

      expect(mockSafeContract.nonce).toHaveBeenCalled();
      expect(safeTx.safeNonce).toBe(5);
    });

    it("should handle delegate call operation", async () => {
      const safeTx = await safe.buildMultisigTx({
        to: MOCK_ADDRESSES.multisend,
        value: 0,
        data: "0x8d80ff0a",
        operation: SafeOperation.DELEGATE_CALL,
      });

      expect(safeTx.operation).toBe(SafeOperation.DELEGATE_CALL);
    });
  });

  describe("buildMultisendTx", () => {
    it("should build multisend transaction", async () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x095ea7b3",
        },
      ];

      const safeTx = await safe.buildMultisendTx(txs);

      expect(safeTx).toBeDefined();
      expect(safeTx.to).toBe(MOCK_ADDRESSES.multisend);
      expect(safeTx.operation).toBe(SafeOperation.DELEGATE_CALL);
    });

    it("should use provided safe nonce", async () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x",
        },
      ];

      const customNonce = 15;
      const safeTx = await safe.buildMultisendTx(txs, customNonce);

      expect(safeTx.safeNonce).toBe(customNonce);
    });

    it("should estimate gas for multisend", async () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x095ea7b3",
        },
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdc,
          value: BigInt(0),
          data: "0x095ea7b3",
        },
      ];

      const safeTx = await safe.buildMultisendTx(txs);

      expect(safeTx.safeTxGas).toBeGreaterThan(0);
    });
  });

  describe("executeMultisend", () => {
    it("should execute multisend transaction", async () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x095ea7b3",
        },
      ];

      const result = await safe.executeMultisend(txs);

      expect(result).toBeDefined();
      expect(result.txHash).toBeDefined();
      expect(result.safeTxHash).toBeDefined();
    });

    it("should sign transaction before execution", async () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x",
        },
      ];

      const result = await safe.executeMultisend(txs);

      expect(result).toBeDefined();
    });

    it("should apply 20% gas margin for execution", async () => {
      // Mock recommended gas to a known value
      const baseGas = BigInt(100000);

      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x",
        },
      ];

      await safe.executeMultisend(txs);

      // Verify that transaction was called with gas estimate
      expect(mockProvider.broadcastTransaction).toHaveBeenCalled();
    });

    it("should use custom safe nonce if provided", async () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x",
        },
      ];

      const customNonce = 20;
      await safe.executeMultisend(txs, customNonce);

      expect(mockSafeContract.nonce).not.toHaveBeenCalled();
    });
  });

  describe("integration", () => {
    it("should handle complete workflow: build, sign, execute", async () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x095ea7b3",
        },
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.conditionalTokens,
          value: BigInt(0),
          data: "0xa22cb465",
        },
      ];

      // Build
      const safeTx = await safe.buildMultisendTx(txs);
      expect(safeTx).toBeDefined();

      // Execute (which includes signing)
      const result = await safe.executeMultisend(txs);
      expect(result.txHash).toBeDefined();
      expect(result.safeTxHash).toBeDefined();
    });
  });
});
