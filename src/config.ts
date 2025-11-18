/**
 * Configuration constants for Opinion CLOB SDK
 */

// Supported blockchain chain IDs
export const SUPPORTED_CHAIN_IDS = [56] as const; // BNB Chain (BSC) mainnet
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

// BNB Chain (BSC) Mainnet Contract Addresses
export const BNB_CHAIN_CONDITIONAL_TOKENS_ADDR = "0xAD1a38cEc043e70E83a3eC30443dB285ED10D774";
export const BNB_CHAIN_MULTISEND_ADDR = "0x998739BFdAAdde7C933B942a68053933098f9EDa";

// Default contract addresses by chain ID
export const DEFAULT_CONTRACT_ADDRESSES: Record<number, { conditionalTokens: string; multisend: string }> = {
  56: {
    // BNB Chain Mainnet
    conditionalTokens: BNB_CHAIN_CONDITIONAL_TOKENS_ADDR,
    multisend: BNB_CHAIN_MULTISEND_ADDR,
  },
};

// Standard maximum decimals for ERC20 tokens
export const MAX_DECIMALS = 18;

// Chain IDs
export const CHAIN_ID_BNB_MAINNET = 56;
