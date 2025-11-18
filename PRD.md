# PRD: Advanced Blockchain Features for Opinion TypeScript SDK

## Overview

This PRD details the implementation of advanced blockchain features for the Opinion CLOB TypeScript SDK. These features enable direct smart contract interactions for position management (split, merge, redeem) and token approvals, matching the functionality available in the Python SDK v0.2.7.

## Reference

**Python SDK Source:** https://files.pythonhosted.org/packages/07/d0/8d6e5294828aec93364d2d2148aa311edd4458de035611ab0d9608dfa62a/opinion_clob_sdk-0.2.7.tar.gz

## Goals

1. Achieve feature parity with Python SDK for blockchain operations
2. Provide seamless smart contract interaction for position management
3. Support Gnosis Safe multi-signature wallets
4. Ensure robust error handling and gas management
5. Maintain type safety and developer experience

## Non-Goals

- Supporting chains other than BNB Chain (chainId 56) in this phase
- Building a general-purpose Gnosis Safe SDK
- Implementing custom gas pricing strategies beyond standard EIP-1559

## Features

### 1. Contract Caller Module

**File:** `src/chain/contractCaller.ts`

#### 1.1 Core Functionality

```typescript
class ContractCaller {
  constructor(config: {
    rpcUrl: string;
    privateKey: string;
    multiSigAddr: string;
    conditionalTokensAddr: string;
    multisendAddr: string;
    enableTradingCheckInterval?: number;
  });
}
```

#### 1.2 Enable Trading (Token Approvals)

**Method:** `enableTrading(supportedQuoteTokens: Map<string, string>)`

**Purpose:** Approve ERC20 tokens and conditional tokens for trading

**Implementation Details:**
- Check allowances for each quote token
- Approve CTF Exchange contract for spending quote tokens
- Approve Conditional Tokens contract for splitting/merging
- Set approval for all conditional tokens to CTF Exchange
- Use MultiSend for batching approvals
- Cache approval status to avoid redundant transactions (configurable TTL)
- Handle USDT-style tokens requiring reset to 0 before new approval

**Gas Estimation:** 500,000 units (can vary with number of approvals)

**Error Handling:**
- Insufficient gas balance
- Transaction failure
- Contract revert

**Python Reference:** `contract_caller.py:279-398`

#### 1.3 Split Position

**Method:** `split(collateralToken: string, conditionId: string, amount: bigint, partition?: number[])`

**Purpose:** Convert collateral tokens into outcome tokens

**Implementation Details:**
- Validate collateral balance before splitting
- Default partition: `[1, 2]` (binary markets)
- Use NULL_HASH for parent collection ID
- Validate transaction receipt
- Check gas balance before execution

**Gas Estimation:** 300,000 units

**Validation:**
- Market must be ACTIVATED, RESOLVING, or RESOLVED
- User must have sufficient collateral balance
- Amount must be positive

**Python Reference:** `contract_caller.py:156-192`

#### 1.4 Merge Position

**Method:** `merge(collateralToken: string, conditionId: string, amount: bigint, partition?: number[])`

**Purpose:** Convert outcome tokens back into collateral

**Implementation Details:**
- Check balance of all outcome positions before merging
- Validate sufficient balance for each position
- Build merge transaction via Conditional Tokens contract
- Execute via MultiSend with Safe

**Gas Estimation:** 300,000 units

**Validation:**
- Market must be ACTIVATED, RESOLVING, or RESOLVED
- User must have sufficient position balance for all outcomes
- Amount must be positive

**Python Reference:** `contract_caller.py:194-232`

#### 1.5 Redeem Position

**Method:** `redeem(collateralToken: string, conditionId: string, partition?: number[])`

**Purpose:** Claim winnings after market resolution

**Implementation Details:**
- Check for any non-zero position balance
- Redeem all eligible positions in one transaction
- Validate market is RESOLVED
- Calculate payout based on winning outcome

**Gas Estimation:** 300,000 units

**Validation:**
- Market must be RESOLVED
- User must have at least one position with balance > 0
- Throw `NoPositionsToRedeemError` if no positions

**Python Reference:** `contract_caller.py:234-277`

#### 1.6 Gas Management

**Method:** `checkGasBalance(estimatedGas: number)`

**Purpose:** Ensure signer has enough native token (BNB) for gas

**Implementation Details:**
- Get signer's native token balance
- Calculate required gas with 20% safety margin
- Use EIP-1559 fee calculation when available
- Fallback to legacy gas price
- Throw `InsufficientGasBalanceError` with helpful message

**Method:** `estimateTransactionGas(txParams: TransactionRequest)`

**Purpose:** Estimate gas for a transaction

**Implementation Details:**
- Use provider's gas estimation
- Add safety margin
- Fallback to conservative estimate on failure

**Python Reference:** `contract_caller.py:87-153`

#### 1.7 Token Decimals Cache

**Method:** `getTokenDecimals(tokenAddress: string)`

**Purpose:** Get token decimals with caching

**Implementation Details:**
- Cache decimals by token address (lowercase)
- Avoid repeated contract calls
- Default to 18 decimals on error
- Log warnings for failed calls

**Python Reference:** `contract_caller.py:69-85`

### 2. Gnosis Safe Integration

**Directory:** `src/chain/safe/`

#### 2.1 Safe Transaction Building

**File:** `src/chain/safe/safeTx.ts`

**Class:** `SafeTx`

**Purpose:** Build and encode Gnosis Safe transactions

**Properties:**
```typescript
interface SafeTx {
  to: string;
  value: bigint;
  data: string;
  operation: number; // 0 = CALL, 1 = DELEGATECALL
  safeTxGas: bigint;
  baseGas: bigint;
  gasPrice: bigint;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
}
```

**Methods:**
- `encode()` - Encode transaction data
- `getSignatureHash()` - Get EIP712 hash for signing
- `buildSignature(signature: string, signatureType: number)` - Build signature bytes

**Python Reference:** `chain/safe/safe_tx.py`

#### 2.2 MultiSend

**File:** `src/chain/safe/multisend.ts`

**Interface:** `MultiSendTx`

```typescript
interface MultiSendTx {
  operation: number; // 0 = CALL, 1 = DELEGATECALL
  to: string;
  value: bigint;
  data: string;
}
```

**Purpose:** Batch multiple transactions into one

**Implementation:**
- Encode multiple transactions into single MultiSend call
- Use MultiSend contract for atomic execution
- Support CALL and DELEGATECALL operations

**Encoding Format:**
```
operation (1 byte) | to (20 bytes) | value (32 bytes) | data length (32 bytes) | data (dynamic)
```

**Python Reference:** `chain/safe/multisend.py`

#### 2.3 Safe Contract Interaction

**File:** `src/chain/safe/safe.ts`

**Class:** `Safe`

**Purpose:** Execute transactions via Gnosis Safe

**Constructor:**
```typescript
constructor(
  provider: ethers.Provider,
  privateKey: string,
  safeAddress: string,
  multisendAddress: string
)
```

**Methods:**

**`executeMultisend(txs: MultiSendTx[])`**
- Build MultiSend transaction
- Get Safe nonce
- Build Safe transaction
- Sign transaction
- Execute via Safe contract
- Wait for receipt and validate
- Return `{ txHash, safeTxHash, receipt }`

**`buildSafeTx(params: SafeTxParams)`**
- Create SafeTx object with proper parameters
- Set gas limits, nonce, etc.

**`signTransaction(safeTx: SafeTx)`**
- Create EIP712 signature
- Format for Safe contract

**Python Reference:** `chain/safe/safe.py`

#### 2.4 Safe Contracts

**File:** `src/chain/safe/contracts/safeV1_3_0.ts`

**Purpose:** Gnosis Safe v1.3.0 ABI and interface

**Key Methods:**
- `execTransaction()` - Execute Safe transaction
- `getTransactionHash()` - Get transaction hash
- `nonce()` - Get current nonce
- `getThreshold()` - Get signature threshold

**File:** `src/chain/safe/contracts/multisendV1_3_0.ts`

**Purpose:** MultiSend v1.3.0 ABI

**Key Methods:**
- `multiSend(bytes transactions)` - Execute multiple transactions

**Python Reference:** `chain/safe/safe_contracts/`

#### 2.5 Safe Signature Handling

**File:** `src/chain/safe/signatures.ts`

**Purpose:** Handle different signature types for Safe

**Signature Types:**
```typescript
enum SafeSignatureType {
  CONTRACT_SIGNATURE = 0,
  APPROVED_HASH = 1,
  EOA = 2,
  ETH_SIGN = 3,
}
```

**Functions:**
- `buildSignatureBytes(signatures: Signature[])` - Combine multiple signatures
- `encodeSignature(v: number, r: string, s: string, type: number)` - Encode single signature
- `adjustVInSignature(signature: string)` - Adjust v value for Safe

**Python Reference:** `chain/safe/signatures.py`

#### 2.6 Safe Utilities

**File:** `src/chain/safe/utils.ts`

**Purpose:** Helper functions for Safe operations

**Functions:**
- `getEmptyTxParams()` - Get empty tx params for building transaction data
- `fastToChecksumAddress(address: string)` - Fast checksum conversion
- `encodeMultiSendData(txs: MultiSendTx[])` - Encode MultiSend transaction data

**Python Reference:** `chain/safe/utils.py`

#### 2.7 Safe Constants

**File:** `src/chain/safe/constants.ts`

**Constants:**
```typescript
export const NULL_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const SENTINEL_OWNERS = "0x0000000000000000000000000000000000000001";
export const SAFE_OPERATION_CALL = 0;
export const SAFE_OPERATION_DELEGATECALL = 1;
```

**Python Reference:** `chain/safe/constants.py`

### 3. Client Integration

Update `src/client.ts` to include blockchain methods:

```typescript
class Client {
  private contractCaller?: ContractCaller;

  // Add to constructor
  if (config.rpcUrl && config.privateKey && config.multiSigAddr) {
    this.contractCaller = new ContractCaller({
      rpcUrl: config.rpcUrl,
      privateKey: config.privateKey,
      multiSigAddr: config.multiSigAddr,
      conditionalTokensAddr: config.conditionalTokensAddr || DEFAULT_ADDRESSES[chainId].conditionalTokens,
      multisendAddr: config.multisendAddr || DEFAULT_ADDRESSES[chainId].multisend,
    });
  }

  // New methods
  async enableTrading(): Promise<TransactionReceipt> { ... }
  async split(marketId: number, amount: bigint): Promise<TransactionReceipt> { ... }
  async merge(marketId: number, amount: bigint): Promise<TransactionReceipt> { ... }
  async redeem(marketId: number): Promise<TransactionReceipt> { ... }
}
```

### 4. Enhanced Error Handling

Add blockchain-specific errors to `src/types/errors.ts`:

```typescript
export class TransactionFailedError extends Error {
  constructor(message: string, public txHash?: string) {
    super(message);
    this.name = "TransactionFailedError";
  }
}

export class GasEstimationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GasEstimationError";
  }
}

export class ApprovalRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalRequiredError";
  }
}
```

### 5. Type Definitions

Add to `src/types/blockchain.ts`:

```typescript
export interface TransactionReceipt {
  txHash: string;
  safeTxHash?: string;
  blockNumber: number;
  gasUsed: bigint;
  status: number; // 1 = success, 0 = failure
}

export interface MultiSendTx {
  operation: number;
  to: string;
  value: bigint;
  data: string;
}

export interface SafeTxParams {
  to: string;
  value: bigint;
  data: string;
  operation?: number;
  safeTxGas?: bigint;
  baseGas?: bigint;
  gasPrice?: bigint;
  gasToken?: string;
  refundReceiver?: string;
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1)
- [ ] Set up Safe contract ABIs
- [ ] Implement MultiSend encoding
- [ ] Create Safe transaction builder
- [ ] Add blockchain error types

### Phase 2: Contract Caller (Day 2)
- [ ] Implement ContractCaller class
- [ ] Add gas estimation and balance checking
- [ ] Implement token decimals cache
- [ ] Add ERC20 and ConditionalTokens contract interfaces

### Phase 3: Position Management (Day 3)
- [ ] Implement split functionality
- [ ] Implement merge functionality
- [ ] Implement redeem functionality
- [ ] Add transaction receipt validation

### Phase 4: Token Approvals (Day 4)
- [ ] Implement enableTrading
- [ ] Add approval caching
- [ ] Handle USDT-style tokens
- [ ] Batch approvals with MultiSend

### Phase 5: Integration & Testing (Day 5)
- [ ] Integrate with Client class
- [ ] Create comprehensive examples
- [ ] Update README
- [ ] Manual testing on BNB testnet
- [ ] Code review and refinement

## Success Metrics

1. **Functionality:** All Python SDK blockchain features working in TypeScript
2. **Type Safety:** Zero TypeScript compilation errors
3. **Error Handling:** Graceful failures with clear error messages
4. **Gas Efficiency:** Transaction costs comparable to Python SDK
5. **Developer Experience:** Clear examples and documentation

## Testing Strategy

### Manual Testing Checklist
- [ ] Enable trading with multiple quote tokens
- [ ] Split position on active market
- [ ] Merge position back to collateral
- [ ] Redeem position on resolved market
- [ ] Handle insufficient balance errors
- [ ] Handle insufficient gas errors
- [ ] Validate transaction receipts
- [ ] Test with actual BNB testnet

### Example Test Scenarios

```typescript
// Test 1: Enable Trading
const receipt = await client.enableTrading();
assert(receipt.status === 1);

// Test 2: Split Position
const splitReceipt = await client.split(marketId, parseUnits("10", 6));
assert(splitReceipt.status === 1);

// Test 3: Merge Position
const mergeReceipt = await client.merge(marketId, parseUnits("5", 6));
assert(mergeReceipt.status === 1);

// Test 4: Redeem Position (after resolution)
const redeemReceipt = await client.redeem(marketId);
assert(redeemReceipt.status === 1);

// Test 5: Error Handling
try {
  await client.split(marketId, parseUnits("1000000", 6)); // Too much
} catch (error) {
  assert(error instanceof BalanceNotEnoughError);
}
```

## Documentation Requirements

1. **README Updates:**
   - Add "Smart Contract Operations" section
   - Document enable_trading, split, merge, redeem
   - Show gas estimation examples
   - Error handling patterns

2. **Code Examples:**
   - Create `examples/blockchain-operations.ts`
   - Show complete workflow: approve → split → trade → merge/redeem
   - Include error handling examples

3. **API Documentation:**
   - JSDoc comments for all public methods
   - Type definitions for all interfaces
   - Error documentation

## Dependencies

No new dependencies required. Continue using:
- `ethers` v6.13.0 - Blockchain interactions
- `axios` v1.7.0 - HTTP requests

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Gas estimation failures on BNB Chain | Implement fallback estimates, extensive testing |
| Safe signature incompatibility | Follow Safe v1.3.0 spec exactly, test with real Safe |
| Transaction failures | Validate all preconditions, check balances before tx |
| POA middleware issues | Use correct ethers.js POA handling for BNB Chain |
| Type safety complexity | Leverage ethers.js types, create clear interfaces |

## Open Questions

1. Should we support Safe signature types other than EOA?
   - **Decision:** Start with EOA, add others if needed

2. Should gas price be configurable?
   - **Decision:** Use default ethers.js gas estimation, allow override in future

3. Should we implement transaction retry logic?
   - **Decision:** No automatic retries, let users handle

4. Cache approval status across client instances?
   - **Decision:** No, use in-memory cache with TTL per instance

## Appendix

### Key Python SDK Files to Reference

1. **contract_caller.py** (Main reference)
   - Lines 26-59: ContractCaller initialization
   - Lines 69-85: Token decimals caching
   - Lines 87-153: Gas checking and estimation
   - Lines 156-192: Split implementation
   - Lines 194-232: Merge implementation
   - Lines 234-277: Redeem implementation
   - Lines 279-398: Enable trading implementation

2. **safe/safe.py**
   - Safe transaction building
   - MultiSend execution
   - Signature handling

3. **safe/multisend.py**
   - Transaction encoding
   - Data packing

4. **safe/safe_tx.py**
   - SafeTx class
   - EIP712 hashing

### EIP-712 Domain for Safe

```typescript
{
  name: "GnosisSafe",
  version: "1.3.0",
  chainId: 56, // BNB Chain
  verifyingContract: safeAddress
}
```

### MultiSend Contract Address (BNB Chain)

- **Address:** `0x998739BFdAAdde7C933B942a68053933098f9EDa`
- **Spec:** MultiSend v1.3.0

### Conditional Tokens Contract Address (BNB Chain)

- **Address:** `0xAD1a38cEc043e70E83a3eC30443dB285ED10D774`
- **Spec:** Conditional Tokens Framework

---

**Document Version:** 1.0
**Last Updated:** 2024-11-18
**Status:** Ready for Implementation
