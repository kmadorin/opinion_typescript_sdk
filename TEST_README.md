# Test Suite for Opinion CLOB TypeScript SDK

This document describes the comprehensive test suite for the Opinion CLOB TypeScript SDK.

## Overview

The test suite provides comprehensive coverage of all SDK features including:
- API client operations
- Blockchain operations (split, merge, redeem, enableTrading)
- Gnosis Safe integration
- EIP-712 signing
- MultiSend transaction batching
- Complete trading workflows

## Test Structure

```
__tests__/
├── setup.ts                          # Jest test setup with custom matchers
├── mocks/
│   ├── apiResponses.ts              # Mock API responses for all endpoints
│   └── blockchain.ts                # Mock blockchain providers and contracts
├── chain/
│   ├── safe/
│   │   ├── eip712.test.ts          # EIP-712 encoding tests
│   │   ├── signatures.test.ts      # Signature handling tests
│   │   ├── multisend.test.ts       # MultiSend transaction batching tests
│   │   └── safe.test.ts            # Gnosis Safe integration tests
│   └── contractCaller.test.ts      # Blockchain operations tests
├── client.test.ts                   # API client tests
└── integration/
    └── tradingWorkflow.test.ts     # End-to-end workflow tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Categories

### 1. EIP-712 Encoding Tests (`__tests__/chain/safe/eip712.test.ts`)

Tests the EIP-712 typed data encoding implementation:
- `hashStruct()` - Hashing typed structs
- `eip712Encode()` - Full EIP-712 encoding
- `eip712EncodeHash()` - Final hash computation
- Compatibility with ethers.js TypedDataEncoder

**Coverage:**
- Simple and nested struct types
- Array handling
- Domain separator encoding
- Gnosis Safe transaction encoding

### 2. Signature Tests (`__tests__/chain/safe/signatures.test.ts`)

Tests signature creation and manipulation:
- `signatureToBytes()` - Convert v,r,s to bytes
- `signatureSplit()` - Split signature bytes into components
- `buildSignatureBytes()` - Build Safe-compatible signatures
- `adjustVInSignature()` - Adjust v value for Safe (v >= 27)
- `getSigningAddress()` - Recover signer from signature

**Coverage:**
- Signature component conversion
- V-value adjustment for Safe compatibility
- Round-trip signature operations
- Integration with ethers.js signing

### 3. MultiSend Tests (`__tests__/chain/safe/multisend.test.ts`)

Tests transaction batching via MultiSend:
- Transaction encoding
- Gas estimation with safety margins (50%)
- Multiple transaction batching
- Call and DelegateCall operations

**Coverage:**
- Single and multiple transaction encoding
- Gas estimation accuracy
- Safety margin application
- Realistic approval batches

### 4. Safe Tests (`__tests__/chain/safe/safe.test.ts`)

Tests Gnosis Safe wallet integration:
- Nonce management
- MultiSig transaction building
- MultiSend transaction execution
- Gas estimation and execution

**Coverage:**
- Transaction building
- Nonce retrieval
- Signature collection
- Transaction execution with 20% gas margin

### 5. ContractCaller Tests (`__tests__/chain/contractCaller.test.ts`)

Tests all blockchain operations:
- `split()` - Convert collateral to outcome tokens
- `merge()` - Convert outcome tokens to collateral
- `redeem()` - Claim winnings after resolution
- `enableTrading()` - Token approval management

**Coverage:**
- Balance checking
- Gas balance verification
- Error handling (insufficient balance, no positions, etc.)
- Token approval caching
- USDT-style token reset pattern
- Categorical market support

**Error Scenarios Tested:**
- `BalanceNotEnoughError` - Insufficient collateral/position balance
- `InsufficientGasBalanceError` - Not enough native token for gas
- `NoPositionsToRedeemError` - No positions to redeem after resolution

### 6. Client API Tests (`__tests__/client.test.ts`)

Tests REST API integration:
- Market data queries
- Order placement and cancellation
- Position and balance tracking
- Trade history
- User authentication

**Coverage:**
- All API endpoints
- Request/response handling
- Error handling
- Network failures
- Caching (quote tokens, markets)

**Endpoints Tested:**
- `getMarkets()` - List markets with filters
- `getMarket()` - Get market details
- `getCategoricalMarket()` - Get categorical market
- `getOrderbook()` - Get order book
- `getLatestPrice()` - Get current price
- `getPriceHistory()` - Get historical prices
- `getFeeRates()` - Get trading fees
- `getQuoteTokens()` - Get supported currencies
- `placeOrder()` - Place buy/sell orders
- `cancelOrder()` - Cancel orders
- `getMyOrders()` - Get user orders
- `getOrderById()` - Get order details
- `getMyBalances()` - Get user balances
- `getMyPositions()` - Get user positions
- `getMyTrades()` - Get trade history
- `getUserAuth()` - Get authentication info

### 7. Integration Tests (`__tests__/integration/tradingWorkflow.test.ts`)

End-to-end workflow testing:
- Complete trading workflow
- Market data queries
- Order placement workflow
- Position monitoring
- Error recovery
- Multi-market operations
- Market resolution flow
- Batch operations

**Scenarios Tested:**
- Get market → Enable trading → Split → Trade → Merge
- Sequential market queries
- Order placement and monitoring
- Position tracking across multiple markets
- Failed order recovery
- Parallel market queries
- Market resolution and redemption

## Mock Data

### API Mocks (`__tests__/mocks/apiResponses.ts`)

Comprehensive mock data for all API responses:
- Markets (binary and categorical)
- Orderbook data
- Quote tokens (USDT, USDC)
- Orders (limit and market)
- Trades
- Balances
- Positions
- Price history
- Fee rates
- User authentication

Helper functions:
- `wrapApiResponse()` - Wrap single data items
- `wrapApiListResponse()` - Wrap lists with pagination
- `wrapApiError()` - Create error responses

### Blockchain Mocks (`__tests__/mocks/blockchain.ts`)

Mock blockchain components:
- Providers (with gas estimation, balance checking)
- ERC20 contracts (USDT, USDC)
- Conditional Tokens contract
- Gnosis Safe contract
- MultiSend contract
- Wallets and signers
- Transaction receipts
- Events (PositionSplit, PositionsMerged, PayoutRedemption)

**Mock Addresses:**
- Multi-signature wallet
- Conditional Tokens contract
- MultiSend contract
- Quote tokens (USDT, USDC)
- CTF Exchange
- Test user wallet

## Custom Matchers

The test suite includes custom Jest matchers defined in `__tests__/setup.ts`:

```typescript
expect(value).toBeValidAddress();  // Validates Ethereum address format
expect(value).toBeValidHash();     // Validates 32-byte hash format
```

## Coverage Goals

The test suite aims for:
- **70%** branch coverage
- **70%** function coverage
- **70%** line coverage
- **70%** statement coverage

Run `npm run test:coverage` to generate a coverage report in the `coverage/` directory.

## Test Best Practices

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Mocking**: All external dependencies (API, blockchain) are mocked
3. **Error Testing**: Both success and error paths are tested
4. **Edge Cases**: Boundary conditions and edge cases are covered
5. **Integration**: Integration tests validate complete workflows

## Common Test Patterns

### Testing Blockchain Operations

```typescript
// Mock the providers and contracts
const mockProvider = createMockProvider();
const mockContract = createMockERC20Contract();

// Set up expected behavior
mockContract.balanceOf.mockResolvedValue(ethers.parseUnits("1000", 6));

// Execute operation
const result = await contractCaller.split(...);

// Verify result
expect(result.txHash).toBeDefined();
```

### Testing API Calls

```typescript
// Mock fetch response
(global.fetch as jest.Mock).mockResolvedValueOnce({
  ok: true,
  json: async () => wrapApiResponse(mockData),
});

// Execute API call
const result = await client.getMarket(123);

// Verify result
expect(result.result?.data.id).toBe(123);
```

### Testing Error Handling

```typescript
// Mock error scenario
mockContract.balanceOf.mockResolvedValue(BigInt(0));

// Expect error to be thrown
await expect(
  contractCaller.split(...)
).rejects.toThrow(BalanceNotEnoughError);
```

## Continuous Integration

The test suite is designed to run in CI/CD pipelines:
- All tests must pass before merging
- Coverage reports are generated automatically
- No external dependencies required (all mocked)
- Fast execution (< 30 seconds typical)

## Future Enhancements

Potential additions to the test suite:
- Visual regression tests for UI components
- Performance benchmarks
- Stress tests for high-volume scenarios
- Contract deployment tests (local blockchain)
- E2E tests against testnet

## Troubleshooting

### Tests Failing

1. **Check mocks**: Ensure all mocks are properly initialized
2. **Check imports**: Verify import paths are correct
3. **Check types**: Ensure TypeScript types match expectations
4. **Check async**: Make sure async operations use `await`

### Coverage Issues

1. Run tests with coverage: `npm run test:coverage`
2. Open `coverage/lcov-report/index.html` in browser
3. Identify uncovered lines
4. Add tests for uncovered code paths

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure all existing tests still pass
3. Add mocks for new external dependencies
4. Update this README if adding new test categories
5. Maintain or improve coverage percentages

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [ethers.js Testing Guide](https://docs.ethers.org/v6/api/utils/testing/)
- [Gnosis Safe Contracts](https://github.com/safe-global/safe-contracts)
