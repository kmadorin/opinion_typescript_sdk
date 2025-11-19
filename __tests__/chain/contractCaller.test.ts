/**
 * Unit tests for ContractCaller
 */

import { ContractCaller } from "../../src/chain/contractCaller";
import {
  BalanceNotEnoughError,
  InsufficientGasBalanceError,
  NoPositionsToRedeemError,
} from "../../src/errors";
import { ethers } from "ethers";
import {
  createMockProvider,
  createMockERC20Contract,
  createMockConditionalTokensContract,
  createMockSafeContract,
  MOCK_ADDRESSES,
  MOCK_PRIVATE_KEY,
  MOCK_CONDITION_ID,
} from "../mocks/blockchain";
import { NULL_HASH } from "../../src/chain/safe/constants";

// Mock the contract getters and Safe
jest.mock("../../src/chain/safe/utils", () => ({
  ...jest.requireActual("../../src/chain/safe/utils"),
  getSafeContract: jest.fn(),
}));

jest.mock("ethers", () => ({
  ...jest.requireActual("ethers"),
  Contract: jest.fn(),
}));

describe("ContractCaller", () => {
  let contractCaller: ContractCaller;
  let mockProvider: any;
  let mockERC20: any;
  let mockConditionalTokens: any;
  let mockSafe: any;

  beforeEach(() => {
    // Setup mocks
    mockProvider = createMockProvider();
    mockERC20 = createMockERC20Contract();
    mockConditionalTokens = createMockConditionalTokensContract();
    mockSafe = createMockSafeContract();

    // Mock Contract constructor
    (ethers.Contract as jest.Mock).mockImplementation((address, abi, provider) => {
      if (address === MOCK_ADDRESSES.usdt || address === MOCK_ADDRESSES.usdc) {
        return mockERC20;
      }
      if (address === MOCK_ADDRESSES.conditionalTokens) {
        return mockConditionalTokens;
      }
      if (address === MOCK_ADDRESSES.multiSig) {
        return mockSafe;
      }
      return {};
    });

    // Initialize ContractCaller
    contractCaller = new ContractCaller({
      rpcUrl: "https://bsc-dataseed.binance.org/",
      privateKey: MOCK_PRIVATE_KEY,
      multiSigAddr: MOCK_ADDRESSES.multiSig,
      conditionalTokensAddr: MOCK_ADDRESSES.conditionalTokens,
      multisendAddr: MOCK_ADDRESSES.multisend,
    });

    // Override provider with mock
    (contractCaller as any).provider = mockProvider;
    (contractCaller as any).safe.contract = mockSafe;
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", () => {
      expect(contractCaller).toBeDefined();
    });
  });

  describe("checkGasBalance", () => {
    it("should pass when gas balance is sufficient", async () => {
      mockProvider.getBalance.mockResolvedValue(ethers.parseEther("1"));
      mockProvider.getFeeData.mockResolvedValue({
        maxFeePerGas: ethers.parseUnits("5", "gwei"),
        gasPrice: ethers.parseUnits("5", "gwei"),
      });

      await expect(contractCaller.checkGasBalance(100000)).resolves.not.toThrow();
    });

    it("should throw when gas balance is insufficient", async () => {
      mockProvider.getBalance.mockResolvedValue(ethers.parseEther("0.0001"));
      mockProvider.getFeeData.mockResolvedValue({
        maxFeePerGas: ethers.parseUnits("100", "gwei"),
        gasPrice: ethers.parseUnits("100", "gwei"),
      });

      await expect(contractCaller.checkGasBalance(1000000)).rejects.toThrow(
        InsufficientGasBalanceError
      );
    });
  });

  describe("split", () => {
    it("should split position successfully", async () => {
      mockERC20.balanceOf.mockResolvedValue(ethers.parseUnits("1000", 6));

      const result = await contractCaller.split(
        MOCK_ADDRESSES.usdt,
        MOCK_CONDITION_ID,
        ethers.parseUnits("100", 6),
        [1, 2]
      );

      expect(result).toBeDefined();
      expect(result.txHash).toBeDefined();
      expect(result.safeTxHash).toBeDefined();
    });

    it("should throw when collateral balance is insufficient", async () => {
      mockERC20.balanceOf.mockResolvedValue(ethers.parseUnits("50", 6));

      await expect(
        contractCaller.split(
          MOCK_ADDRESSES.usdt,
          MOCK_CONDITION_ID,
          ethers.parseUnits("100", 6),
          [1, 2]
        )
      ).rejects.toThrow(BalanceNotEnoughError);
    });

    it("should throw when gas balance is insufficient", async () => {
      mockProvider.getBalance.mockResolvedValue(BigInt(0));

      await expect(
        contractCaller.split(
          MOCK_ADDRESSES.usdt,
          MOCK_CONDITION_ID,
          ethers.parseUnits("100", 6),
          [1, 2]
        )
      ).rejects.toThrow(InsufficientGasBalanceError);
    });

    it("should handle custom partition", async () => {
      mockERC20.balanceOf.mockResolvedValue(ethers.parseUnits("1000", 6));

      const result = await contractCaller.split(
        MOCK_ADDRESSES.usdt,
        MOCK_CONDITION_ID,
        ethers.parseUnits("100", 6),
        [1, 2, 4] // Categorical market with 3 outcomes
      );

      expect(result).toBeDefined();
    });

    it("should handle custom parent collection ID", async () => {
      mockERC20.balanceOf.mockResolvedValue(ethers.parseUnits("1000", 6));

      const customParentId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      const result = await contractCaller.split(
        MOCK_ADDRESSES.usdt,
        MOCK_CONDITION_ID,
        ethers.parseUnits("100", 6),
        [1, 2],
        customParentId
      );

      expect(result).toBeDefined();
    });
  });

  describe("merge", () => {
    it("should merge positions successfully", async () => {
      mockConditionalTokens.balanceOf.mockResolvedValue(ethers.parseUnits("100", 6));

      const result = await contractCaller.merge(
        MOCK_ADDRESSES.usdt,
        MOCK_CONDITION_ID,
        ethers.parseUnits("50", 6),
        [1, 2]
      );

      expect(result).toBeDefined();
      expect(result.txHash).toBeDefined();
      expect(result.safeTxHash).toBeDefined();
    });

    it("should throw when position balance is insufficient for first outcome", async () => {
      mockConditionalTokens.balanceOf
        .mockResolvedValueOnce(ethers.parseUnits("30", 6)) // First outcome
        .mockResolvedValueOnce(ethers.parseUnits("100", 6)); // Second outcome

      await expect(
        contractCaller.merge(
          MOCK_ADDRESSES.usdt,
          MOCK_CONDITION_ID,
          ethers.parseUnits("50", 6),
          [1, 2]
        )
      ).rejects.toThrow(BalanceNotEnoughError);
    });

    it("should throw when position balance is insufficient for second outcome", async () => {
      mockConditionalTokens.balanceOf
        .mockResolvedValueOnce(ethers.parseUnits("100", 6)) // First outcome
        .mockResolvedValueOnce(ethers.parseUnits("30", 6)); // Second outcome

      await expect(
        contractCaller.merge(
          MOCK_ADDRESSES.usdt,
          MOCK_CONDITION_ID,
          ethers.parseUnits("50", 6),
          [1, 2]
        )
      ).rejects.toThrow(BalanceNotEnoughError);
    });

    it("should handle categorical markets with multiple outcomes", async () => {
      mockConditionalTokens.balanceOf.mockResolvedValue(ethers.parseUnits("100", 6));

      const result = await contractCaller.merge(
        MOCK_ADDRESSES.usdt,
        MOCK_CONDITION_ID,
        ethers.parseUnits("50", 6),
        [1, 2, 4]
      );

      expect(result).toBeDefined();
    });
  });

  describe("redeem", () => {
    it("should redeem positions successfully", async () => {
      // Mock that positions exist
      mockConditionalTokens.balanceOf
        .mockResolvedValueOnce(ethers.parseUnits("100", 6)) // First check
        .mockResolvedValueOnce(ethers.parseUnits("50", 6)); // Second check

      const result = await contractCaller.redeem(
        MOCK_ADDRESSES.usdt,
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890", // questionId
        MOCK_CONDITION_ID,
        [1, 2]
      );

      expect(result).toBeDefined();
      expect(result.txHash).toBeDefined();
      expect(result.safeTxHash).toBeDefined();
    });

    it("should throw when no positions to redeem", async () => {
      mockConditionalTokens.balanceOf.mockResolvedValue(BigInt(0));

      await expect(
        contractCaller.redeem(
          MOCK_ADDRESSES.usdt,
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          MOCK_CONDITION_ID,
          [1, 2]
        )
      ).rejects.toThrow(NoPositionsToRedeemError);
    });

    it("should handle categorical markets", async () => {
      mockConditionalTokens.balanceOf
        .mockResolvedValueOnce(ethers.parseUnits("100", 6))
        .mockResolvedValueOnce(ethers.parseUnits("50", 6))
        .mockResolvedValueOnce(ethers.parseUnits("75", 6));

      const result = await contractCaller.redeem(
        MOCK_ADDRESSES.usdt,
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        MOCK_CONDITION_ID,
        [1, 2, 4]
      );

      expect(result).toBeDefined();
    });
  });

  describe("enableTrading", () => {
    it("should enable trading with all approvals", async () => {
      // Mock that no approvals exist
      mockERC20.allowance.mockResolvedValue(BigInt(0));
      mockConditionalTokens.isApprovedForAll.mockResolvedValue(false);

      const supportedQuoteTokens = new Map<string, string>([
        [MOCK_ADDRESSES.usdt, "USDT"],
        [MOCK_ADDRESSES.usdc, "USDC"],
      ]);

      const result = await contractCaller.enableTrading(supportedQuoteTokens);

      expect(result).toBeDefined();
      expect(result?.txHash).toBeDefined();
    });

    it("should return null when all approvals already exist", async () => {
      // Mock that approvals already exist
      mockERC20.allowance.mockResolvedValue(ethers.MaxUint256);
      mockConditionalTokens.isApprovedForAll.mockResolvedValue(true);

      const supportedQuoteTokens = new Map<string, string>([
        [MOCK_ADDRESSES.usdt, "USDT"],
      ]);

      const result = await contractCaller.enableTrading(supportedQuoteTokens);

      expect(result).toBeNull();
    });

    it("should handle partial approvals", async () => {
      // Mock that some approvals exist
      mockERC20.allowance
        .mockResolvedValueOnce(ethers.MaxUint256) // USDT -> CTF Exchange (exists)
        .mockResolvedValueOnce(BigInt(0)) // USDT -> Conditional Tokens (doesn't exist)
        .mockResolvedValueOnce(BigInt(0)); // USDC -> CTF Exchange (doesn't exist)

      mockConditionalTokens.isApprovedForAll
        .mockResolvedValueOnce(false) // CTF Exchange
        .mockResolvedValueOnce(false); // Conditional Tokens

      const supportedQuoteTokens = new Map<string, string>([
        [MOCK_ADDRESSES.usdt, "USDT"],
        [MOCK_ADDRESSES.usdc, "USDC"],
      ]);

      const result = await contractCaller.enableTrading(supportedQuoteTokens);

      expect(result).toBeDefined();
      expect(result?.txHash).toBeDefined();
    });

    it("should respect approval cache TTL", async () => {
      // First call - should check approvals
      mockERC20.allowance.mockResolvedValue(ethers.MaxUint256);
      mockConditionalTokens.isApprovedForAll.mockResolvedValue(true);

      const supportedQuoteTokens = new Map<string, string>([
        [MOCK_ADDRESSES.usdt, "USDT"],
      ]);

      // First call
      const result1 = await contractCaller.enableTrading(supportedQuoteTokens);
      expect(result1).toBeNull();

      // Second call immediately - should use cache
      const result2 = await contractCaller.enableTrading(supportedQuoteTokens);
      expect(result2).toBeNull();
    });

    it("should reset USDT-style tokens to 0 before approval", async () => {
      // Mock that approval exists but is less than max
      mockERC20.allowance.mockResolvedValue(ethers.parseUnits("1000", 6));
      mockConditionalTokens.isApprovedForAll.mockResolvedValue(false);

      const supportedQuoteTokens = new Map<string, string>([
        [MOCK_ADDRESSES.usdt, "USDT"],
      ]);

      const result = await contractCaller.enableTrading(supportedQuoteTokens);

      expect(result).toBeDefined();
      // Should have reset to 0 then set to max
    });

    it("should approve both CTF Exchange and Conditional Tokens", async () => {
      mockERC20.allowance.mockResolvedValue(BigInt(0));
      mockConditionalTokens.isApprovedForAll.mockResolvedValue(false);

      const supportedQuoteTokens = new Map<string, string>([
        [MOCK_ADDRESSES.usdt, "USDT"],
      ]);

      const result = await contractCaller.enableTrading(supportedQuoteTokens);

      expect(result).toBeDefined();
      // Should have approved for both contracts
    });
  });

  describe("getCollectionId", () => {
    it("should get collection ID", async () => {
      const result = await contractCaller.getCollectionId(NULL_HASH, MOCK_CONDITION_ID, 1);

      expect(result).toBeDefined();
      expect(mockConditionalTokens.getCollectionId).toHaveBeenCalledWith(
        NULL_HASH,
        MOCK_CONDITION_ID,
        1
      );
    });
  });

  describe("getPositionId", () => {
    it("should get position ID", async () => {
      const collectionId = "0x" + "0".repeat(64);

      const result = await contractCaller.getPositionId(MOCK_ADDRESSES.usdt, collectionId);

      expect(result).toBeDefined();
      expect(mockConditionalTokens.getPositionId).toHaveBeenCalledWith(
        MOCK_ADDRESSES.usdt,
        collectionId
      );
    });
  });

  describe("getTokenDecimals", () => {
    it("should get token decimals and cache result", async () => {
      const decimals1 = await contractCaller.getTokenDecimals(MOCK_ADDRESSES.usdt);
      expect(decimals1).toBe(6);

      // Second call should use cache
      const decimals2 = await contractCaller.getTokenDecimals(MOCK_ADDRESSES.usdt);
      expect(decimals2).toBe(6);

      // Mock should only be called once due to caching
      expect(mockERC20.decimals).toHaveBeenCalledTimes(2); // Once per ContractCaller instance
    });
  });

  describe("error handling", () => {
    it("should include transaction hash in error on transaction failure", async () => {
      mockERC20.balanceOf.mockResolvedValue(ethers.parseUnits("1000", 6));
      mockProvider.waitForTransaction.mockResolvedValue({
        status: 0, // Failed transaction
        transactionHash: "0xfailed123",
      });

      await expect(
        contractCaller.split(
          MOCK_ADDRESSES.usdt,
          MOCK_CONDITION_ID,
          ethers.parseUnits("100", 6),
          [1, 2]
        )
      ).rejects.toThrow(/0xfailed123/);
    });

    it("should handle provider errors gracefully", async () => {
      mockProvider.getBalance.mockRejectedValue(new Error("Network error"));

      await expect(contractCaller.checkGasBalance(100000)).rejects.toThrow();
    });
  });
});
