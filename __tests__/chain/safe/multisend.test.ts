/**
 * Unit tests for MultiSend
 */

import { MultiSend } from "../../../src/chain/safe/multisend";
import { MultiSendTx, SafeOperation } from "../../../src/chain/safe/types";
import { ethers } from "ethers";
import { createMockProvider, MOCK_ADDRESSES } from "../../mocks/blockchain";

describe("MultiSend", () => {
  let multiSend: MultiSend;
  let mockProvider: ethers.JsonRpcProvider;

  beforeEach(() => {
    mockProvider = createMockProvider();
    multiSend = new MultiSend(mockProvider, MOCK_ADDRESSES.multisend, false);
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", () => {
      expect(multiSend).toBeDefined();
    });

    it("should create with call only mode", () => {
      const callOnlyMultiSend = new MultiSend(mockProvider, MOCK_ADDRESSES.multisend, true);
      expect(callOnlyMultiSend).toBeDefined();
    });
  });

  describe("encodeMultiSend", () => {
    it("should encode single transaction", () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x095ea7b3",
        },
      ];

      const encoded = multiSend.encodeMultiSend(txs);

      expect(encoded).toBeDefined();
      expect(encoded.startsWith("0x")).toBe(true);
    });

    it("should encode multiple transactions", () => {
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

      const encoded = multiSend.encodeMultiSend(txs);

      expect(encoded).toBeDefined();
      expect(encoded.startsWith("0x")).toBe(true);
      expect(encoded.length).toBeGreaterThan(2); // More than just "0x"
    });

    it("should handle transactions with value", () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.user,
          value: ethers.parseEther("1"),
          data: "0x",
        },
      ];

      const encoded = multiSend.encodeMultiSend(txs);
      expect(encoded).toBeDefined();
    });

    it("should handle delegate call operations", () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.DELEGATE_CALL,
          to: MOCK_ADDRESSES.conditionalTokens,
          value: BigInt(0),
          data: "0x12345678",
        },
      ];

      const encoded = multiSend.encodeMultiSend(txs);
      expect(encoded).toBeDefined();
    });
  });

  describe("buildTxData", () => {
    it("should build transaction data", () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x095ea7b3",
        },
      ];

      const txData = multiSend.buildTxData(txs);

      expect(txData).toBeDefined();
      expect(txData.startsWith("0x")).toBe(true);
    });

    it("should include function selector", () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x",
        },
      ];

      const txData = multiSend.buildTxData(txs);

      // Should start with multiSend function selector (0x8d80ff0a)
      expect(txData.startsWith("0x8d80ff0a")).toBe(true);
    });
  });

  describe("estimateGas", () => {
    it("should estimate gas for single transaction", async () => {
      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x095ea7b3",
        },
      ];

      const gas = await multiSend.estimateGas(txs, MOCK_ADDRESSES.multiSig);

      expect(gas).toBeDefined();
      expect(gas).toBeGreaterThan(BigInt(0));
    });

    it("should estimate gas for multiple transactions", async () => {
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

      const gas = await multiSend.estimateGas(txs, MOCK_ADDRESSES.multiSig);

      expect(gas).toBeDefined();
      expect(gas).toBeGreaterThan(BigInt(0));
    });

    it("should apply 50% safety margin", async () => {
      // Mock provider to return known gas estimate
      const baseGas = BigInt(100000);
      (mockProvider.estimateGas as jest.Mock).mockResolvedValue(baseGas);

      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x",
        },
      ];

      const gas = await multiSend.estimateGas(txs, MOCK_ADDRESSES.multiSig);

      // Should be base * 1.5
      const expected = (baseGas * BigInt(150)) / BigInt(100);
      expect(gas).toBe(expected);
    });

    it("should handle estimation errors", async () => {
      (mockProvider.estimateGas as jest.Mock).mockRejectedValue(new Error("Gas estimation failed"));

      const txs: MultiSendTx[] = [
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: "0x",
        },
      ];

      await expect(multiSend.estimateGas(txs, MOCK_ADDRESSES.multiSig)).rejects.toThrow();
    });
  });

  describe("integration", () => {
    it("should encode and estimate gas for realistic approval batch", async () => {
      const txs: MultiSendTx[] = [
        // Reset USDT approval to 0
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: ethers.concat([
            "0x095ea7b3", // approve(address,uint256)
            ethers.zeroPadValue(MOCK_ADDRESSES.ctfExchange, 32),
            ethers.zeroPadValue("0x00", 32),
          ]),
        },
        // Set USDT approval to max
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.usdt,
          value: BigInt(0),
          data: ethers.concat([
            "0x095ea7b3",
            ethers.zeroPadValue(MOCK_ADDRESSES.ctfExchange, 32),
            ethers.zeroPadValue(ethers.toBeHex(ethers.MaxUint256), 32),
          ]),
        },
        // Approve conditional tokens
        {
          operation: SafeOperation.CALL,
          to: MOCK_ADDRESSES.conditionalTokens,
          value: BigInt(0),
          data: ethers.concat([
            "0xa22cb465", // setApprovalForAll(address,bool)
            ethers.zeroPadValue(MOCK_ADDRESSES.ctfExchange, 32),
            ethers.zeroPadValue("0x01", 32),
          ]),
        },
      ];

      const encoded = multiSend.encodeMultiSend(txs);
      expect(encoded).toBeDefined();

      const txData = multiSend.buildTxData(txs);
      expect(txData).toBeDefined();

      const gas = await multiSend.estimateGas(txs, MOCK_ADDRESSES.multiSig);
      expect(gas).toBeGreaterThan(BigInt(0));
    });
  });
});
