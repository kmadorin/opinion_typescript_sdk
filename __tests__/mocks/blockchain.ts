/**
 * Mock blockchain providers and contracts for testing
 */

import { ethers } from "ethers";

export const MOCK_ADDRESSES = {
  multiSig: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
  conditionalTokens: "0xCeAfDD6bc0bEF976fdCd1112955828E00543c0Ce",
  multisend: "0x998739BFdAAdde7C933B942a68053933098f9EDa",
  usdt: "0x55d398326f99059fF775485246999027B3197955",
  usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  ctfExchange: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E",
  user: "0x9876543210fedcba9876543210fedcba98765432",
};

export const MOCK_PRIVATE_KEY = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

export const MOCK_CONDITION_ID = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
export const MOCK_QUESTION_ID = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

/**
 * Create a mock ethers provider
 */
export function createMockProvider() {
  const provider = {
    getBalance: jest.fn().mockResolvedValue(ethers.parseEther("10")),
    getBlock: jest.fn().mockResolvedValue({
      number: 12345,
      timestamp: Math.floor(Date.now() / 1000),
      baseFeePerGas: ethers.parseUnits("5", "gwei"),
    }),
    getFeeData: jest.fn().mockResolvedValue({
      maxFeePerGas: ethers.parseUnits("10", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
      gasPrice: ethers.parseUnits("10", "gwei"),
    }),
    estimateGas: jest.fn().mockResolvedValue(BigInt(100000)),
    getNetwork: jest.fn().mockResolvedValue({ chainId: 56n, name: "bnb" }),
    waitForTransaction: jest.fn().mockResolvedValue({
      status: 1,
      transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      blockNumber: 12346,
      from: MOCK_ADDRESSES.multiSig,
      to: MOCK_ADDRESSES.conditionalTokens,
      gasUsed: BigInt(85000),
    }),
    broadcastTransaction: jest.fn().mockResolvedValue({
      hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      wait: jest.fn().mockResolvedValue({
        status: 1,
        transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      }),
    }),
    call: jest.fn(),
  };

  return provider as unknown as ethers.JsonRpcProvider;
}

/**
 * Create a mock ERC20 contract
 */
export function createMockERC20Contract() {
  return {
    balanceOf: jest.fn().mockResolvedValue(ethers.parseUnits("1000", 6)),
    allowance: jest.fn().mockResolvedValue(BigInt(0)),
    decimals: jest.fn().mockResolvedValue(6),
    approve: {
      estimateGas: jest.fn().mockResolvedValue(BigInt(50000)),
      populateTransaction: jest.fn().mockResolvedValue({
        to: MOCK_ADDRESSES.usdt,
        data: "0x095ea7b3000000000000000000000000",
        value: 0,
      }),
    },
  } as any;
}

/**
 * Create a mock Conditional Tokens contract
 */
export function createMockConditionalTokensContract() {
  return {
    balanceOf: jest.fn().mockResolvedValue(ethers.parseUnits("100", 6)),
    isApprovedForAll: jest.fn().mockResolvedValue(false),
    setApprovalForAll: {
      estimateGas: jest.fn().mockResolvedValue(BigInt(50000)),
      populateTransaction: jest.fn().mockResolvedValue({
        to: MOCK_ADDRESSES.conditionalTokens,
        data: "0xa22cb465000000000000000000000000",
        value: 0,
      }),
    },
    splitPosition: {
      estimateGas: jest.fn().mockResolvedValue(BigInt(150000)),
      populateTransaction: jest.fn().mockResolvedValue({
        to: MOCK_ADDRESSES.conditionalTokens,
        data: "0x4c0e7f3c000000000000000000000000",
        value: 0,
      }),
    },
    mergePositions: {
      estimateGas: jest.fn().mockResolvedValue(BigInt(150000)),
      populateTransaction: jest.fn().mockResolvedValue({
        to: MOCK_ADDRESSES.conditionalTokens,
        data: "0x1f4f89e8000000000000000000000000",
        value: 0,
      }),
    },
    redeemPositions: {
      estimateGas: jest.fn().mockResolvedValue(BigInt(120000)),
      populateTransaction: jest.fn().mockResolvedValue({
        to: MOCK_ADDRESSES.conditionalTokens,
        data: "0x8e9e70c4000000000000000000000000",
        value: 0,
      }),
    },
    getCollectionId: jest.fn().mockResolvedValue("0x" + "0".repeat(64)),
    getPositionId: jest.fn().mockResolvedValue(ethers.parseUnits("123456", 0)),
  } as any;
}

/**
 * Create a mock Safe contract
 */
export function createMockSafeContract() {
  return {
    nonce: jest.fn().mockResolvedValue(BigInt(5)),
    getThreshold: jest.fn().mockResolvedValue(BigInt(1)),
    getOwners: jest.fn().mockResolvedValue([MOCK_ADDRESSES.user]),
    execTransaction: {
      estimateGas: jest.fn().mockResolvedValue(BigInt(200000)),
      populateTransaction: jest.fn().mockResolvedValue({
        to: MOCK_ADDRESSES.multiSig,
        data: "0x6a761202000000000000000000000000",
        value: 0,
      }),
      staticCall: jest.fn().mockResolvedValue(true),
    },
    getTransactionHash: jest.fn().mockResolvedValue(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    ),
  } as any;
}

/**
 * Create a mock MultiSend contract
 */
export function createMockMultiSendContract() {
  return {
    multiSend: {
      estimateGas: jest.fn().mockResolvedValue(BigInt(250000)),
      populateTransaction: jest.fn().mockResolvedValue({
        to: MOCK_ADDRESSES.multisend,
        data: "0x8d80ff0a000000000000000000000000",
        value: 0,
      }),
    },
  } as any;
}

/**
 * Mock transaction receipt
 */
export const mockTransactionReceipt = {
  status: 1,
  transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  blockNumber: 12346,
  from: MOCK_ADDRESSES.multiSig,
  to: MOCK_ADDRESSES.conditionalTokens,
  gasUsed: BigInt(85000),
  logs: [],
};

/**
 * Mock wallet/signer
 */
export function createMockWallet() {
  return {
    address: MOCK_ADDRESSES.user,
    signTypedData: jest.fn().mockResolvedValue(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b"
    ),
    signMessage: jest.fn().mockResolvedValue(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b"
    ),
    sendTransaction: jest.fn().mockResolvedValue({
      hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      wait: jest.fn().mockResolvedValue(mockTransactionReceipt),
    }),
  } as any;
}

/**
 * Mock events
 */
export const mockPositionSplitEvent = {
  event: "PositionSplit",
  args: {
    stakeholder: MOCK_ADDRESSES.multiSig,
    collateralToken: MOCK_ADDRESSES.usdt,
    parentCollectionId: "0x" + "0".repeat(64),
    conditionId: MOCK_CONDITION_ID,
    partition: [1, 2],
    amount: ethers.parseUnits("100", 6),
  },
  transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  blockNumber: 12346,
};

export const mockPositionMergedEvent = {
  event: "PositionsMerged",
  args: {
    stakeholder: MOCK_ADDRESSES.multiSig,
    collateralToken: MOCK_ADDRESSES.usdt,
    parentCollectionId: "0x" + "0".repeat(64),
    conditionId: MOCK_CONDITION_ID,
    partition: [1, 2],
    amount: ethers.parseUnits("50", 6),
  },
  transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  blockNumber: 12347,
};

export const mockPayoutRedemptionEvent = {
  event: "PayoutRedemption",
  args: {
    redeemer: MOCK_ADDRESSES.multiSig,
    collateralToken: MOCK_ADDRESSES.usdt,
    parentCollectionId: "0x" + "0".repeat(64),
    conditionId: MOCK_CONDITION_ID,
    indexSets: [1, 2],
    payout: ethers.parseUnits("100", 6),
  },
  transactionHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  blockNumber: 12348,
};
