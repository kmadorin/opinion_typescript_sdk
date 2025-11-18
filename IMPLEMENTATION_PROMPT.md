# Implementation Prompt: Advanced Blockchain Features for Opinion TypeScript SDK

## Context

The Opinion CLOB TypeScript SDK has been successfully ported from the Python SDK v0.2.7 with core API functionality. The initial port focused on market data queries, order management, and user portfolio tracking.

**Current Status:**
- ✅ Base SDK ported and working (branch: `claude/port-sdk-typescript-01DjBq3uHbyMQ4RurYYryPJX`)
- ✅ API client for market data and trading
- ✅ Order building and EIP712 signing
- ❌ Missing: Advanced blockchain features (see PRD below)

## Task

Implement the remaining advanced blockchain features from the Python SDK to achieve feature parity. These features involve direct smart contract interactions for token management on BNB Chain.

## Reference Implementation

**Python SDK Source:** https://files.pythonhosted.org/packages/07/d0/8d6e5294828aec93364d2d2148aa311edd4458de035611ab0d9608dfa62a/opinion_clob_sdk-0.2.7.tar.gz

**Key Python Files to Port:**
- `chain/contract_caller.py` - Main contract interaction logic
- `chain/safe/safe.py` - Gnosis Safe integration
- `chain/safe/multisend.py` - Multi-send transaction batching
- `chain/safe/safe_tx.py` - Safe transaction building
- `chain/safe/signatures.py` - Safe signature handling
- `chain/contracts/erc20.py` - ERC20 ABI
- `chain/contracts/conditional_tokens.py` - Conditional tokens ABI

## Requirements

Implement the following features (see detailed PRD in PRD.md):

1. **Contract Caller Module** - Direct smart contract interactions
   - Token approval management (enable_trading)
   - Split position (convert collateral to outcome tokens)
   - Merge positions (convert outcome tokens back to collateral)
   - Redeem positions (claim winnings after market resolution)
   - Gas balance checking and estimation

2. **Gnosis Safe Integration** - Multi-signature wallet support
   - Safe transaction building and signing
   - Multi-send transaction batching
   - EIP712 signature handling for Safe
   - Safe contract interaction

3. **Enhanced Error Handling** - Blockchain-specific errors
   - Insufficient balance errors
   - Gas estimation errors
   - Transaction failure handling
   - Position validation errors

## Acceptance Criteria

- [ ] All Python SDK blockchain features ported to TypeScript
- [ ] Full type safety with TypeScript interfaces
- [ ] Comprehensive error handling
- [ ] Gas estimation and balance checking
- [ ] Transaction receipt validation
- [ ] Support for BNB Chain (POA middleware)
- [ ] Code compiles without errors
- [ ] Examples demonstrating all features
- [ ] Updated README with new features
- [ ] All changes committed and pushed to new branch

## Starting Point

Start from the `main` branch (or the merged initial port) and create a new branch:
```bash
git checkout main
git pull origin main
git checkout -b claude/advanced-blockchain-features-[SESSION_ID]
```

## Additional Context

- The SDK uses ethers.js v6 for blockchain interactions
- BNB Chain is a Proof of Authority (POA) chain requiring special middleware
- Gnosis Safe integration allows for secure multi-sig operations
- All contract interactions should validate transaction success
- Cache token decimals to avoid repeated contract calls
- Implement retry logic for gas estimation failures

Please review the attached PRD (PRD.md) for detailed specifications and implementation guidelines.
