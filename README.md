# Opinion CLOB SDK (TypeScript)

TypeScript SDK for interacting with Opinion prediction markets via the CLOB (Central Limit Order Book) API.

**Ported from Python SDK v0.2.7** - Supports BNB Chain mainnet (chain ID 56)

## Overview

The Opinion CLOB SDK provides a TypeScript/JavaScript interface for:

- Querying prediction market data
- Placing and managing orders
- Tracking positions and balances
- Interacting with smart contracts (split, merge, redeem)

## Installation

```bash
npm install opinion-clob-sdk
# or
yarn add opinion-clob-sdk
```

## Quick Start

```typescript
import { Client, OrderSide, OrderType, CHAIN_ID_BNB_MAINNET } from "opinion-clob-sdk";

// Initialize client
const client = new Client({
  host: "https://proxy.opinion.trade:8443",
  apiKey: "your_api_key",
  chainId: CHAIN_ID_BNB_MAINNET, // 56 for BNB Chain mainnet
  rpcUrl: "your_rpc_url",
  privateKey: "your_private_key",
  multiSigAddr: "your_multi_sig_address",
});

// Get markets
const markets = await client.getMarkets({ page: 1, limit: 10 });

// Get market detail
const market = await client.getMarket(123);

// Get orderbook
const orderbook = await client.getOrderbook("token_123");

// Get latest price
const price = await client.getLatestPrice("token_123");
```

## Core Features

### Market Data

```typescript
import { TopicType, TopicStatusFilter } from "opinion-clob-sdk";

// Get all markets with filters
const markets = await client.getMarkets({
  topicType: TopicType.BINARY,
  status: TopicStatusFilter.ACTIVATED,
  page: 1,
  limit: 20,
});

// Get specific market
const market = await client.getMarket(123);

// Get categorical market
const categorical = await client.getCategoricalMarket(456);

// Get supported quote tokens (currencies)
const quoteTokens = await client.getQuoteTokens();
```

### Token Data

```typescript
// Get orderbook
const orderbook = await client.getOrderbook("token_123");

// Get latest price
const price = await client.getLatestPrice("token_123");

// Get price history
const history = await client.getPriceHistory({
  tokenId: "token_123",
  interval: "1h",
  startAt: 1234567890,
  endAt: 1234567900,
});

// Get fee rates
const fees = await client.getFeeRates("token_123");
```

### Trading

```typescript
import { OrderSide, OrderType } from "opinion-clob-sdk";

// Place a limit order
const limitOrder = await client.placeOrder({
  marketId: 123,
  tokenId: "token_yes",
  side: OrderSide.BUY,
  orderType: OrderType.LIMIT_ORDER,
  price: "0.5",
  makerAmountInQuoteToken: "10", // 10 USDC
});

// Place a market order
const marketOrder = await client.placeOrder({
  marketId: 123,
  tokenId: "token_yes",
  side: OrderSide.SELL,
  orderType: OrderType.MARKET_ORDER,
  price: "0", // Market orders don't need price
  makerAmountInBaseToken: "5", // 5 YES tokens
});

// Cancel an order
await client.cancelOrder("order_id_123");

// Get my orders
const myOrders = await client.getMyOrders({
  marketId: 123,
  limit: 10,
});

// Get order by ID
const order = await client.getOrderById("order_123");
```

### User Data

```typescript
// Get balances
const balances = await client.getMyBalances();

// Get positions
const positions = await client.getMyPositions({
  page: 1,
  limit: 10,
});

// Get trade history
const trades = await client.getMyTrades({
  marketId: 123,
  limit: 20,
});

// Get user auth info
const auth = await client.getUserAuth();
```

### Smart Contract Operations

The SDK provides direct blockchain interactions for position management:

```typescript
import { ethers } from "ethers";

// Initialize client with blockchain capabilities
const client = new Client({
  host: "https://proxy.opinion.trade:8443",
  apiKey: "your_api_key",
  chainId: CHAIN_ID_BNB_MAINNET,
  rpcUrl: "https://bsc-dataseed.binance.org/",
  privateKey: "your_private_key", // Required for blockchain operations
  multiSigAddr: "your_multi_sig_address", // Required for blockchain operations
});

// Enable trading (approve tokens) - Run this once
await client.enableTrading();

// Split position: Convert collateral tokens into outcome tokens
// For a binary market, this gives you tokens for both YES and NO
const splitResult = await client.split({
  marketId: 123,
  amount: ethers.parseUnits("100", 6), // 100 USDT (6 decimals)
  partition: [1, 2], // Binary market outcomes
});
console.log("Split transaction:", splitResult.txHash);

// Merge position: Convert outcome tokens back to collateral
// You need equal amounts of all outcome tokens
const mergeResult = await client.merge({
  marketId: 123,
  amount: ethers.parseUnits("50", 6),
  partition: [1, 2],
});
console.log("Merge transaction:", mergeResult.txHash);

// Redeem position: Claim winnings after market resolution
const redeemResult = await client.redeem({
  marketId: 123,
  partition: [1, 2],
});
console.log("Redeem transaction:", redeemResult.txHash);
```

#### Complete Trading Workflow

```typescript
// 1. Enable trading (one-time setup)
await client.enableTrading();

// 2. Split collateral to get outcome tokens
const splitResult = await client.split({
  marketId: 123,
  amount: ethers.parseUnits("100", 6), // 100 USDT
});

// 3. Trade your outcome tokens
await client.placeOrder({
  marketId: 123,
  tokenId: "token_yes",
  side: OrderSide.SELL,
  orderType: OrderType.LIMIT_ORDER,
  price: "0.60",
  makerAmountInBaseToken: "50", // Sell 50 YES tokens
});

// 4. After trading, merge remaining tokens back to collateral
await client.merge({
  marketId: 123,
  amount: ethers.parseUnits("50", 6),
});

// 5. After market resolution, claim your winnings
await client.redeem({ marketId: 123 });
```

#### Error Handling for Blockchain Operations

```typescript
import {
  BalanceNotEnoughError,
  InsufficientGasBalanceError,
  NoPositionsToRedeemError,
} from "opinion-clob-sdk";

try {
  await client.split({
    marketId: 123,
    amount: ethers.parseUnits("1000", 6),
  });
} catch (error) {
  if (error instanceof BalanceNotEnoughError) {
    console.error("Insufficient token balance");
  } else if (error instanceof InsufficientGasBalanceError) {
    console.error("Insufficient BNB for gas fees");
  } else if (error instanceof NoPositionsToRedeemError) {
    console.error("No positions available to redeem");
  } else {
    console.error("Transaction failed:", error.message);
  }
}
```

## Configuration

### Client Options

```typescript
const client = new Client({
  host: string; // API host URL
  apiKey: string; // API authentication key
  chainId: number; // Blockchain chain ID (56 for BNB Chain)
  rpcUrl?: string; // RPC endpoint URL (optional)
  privateKey?: string; // Private key for signing transactions (optional)
  multiSigAddr?: string; // Multi-signature wallet address (optional)
  conditionalTokensAddr?: string; // Override default conditional tokens contract
  multisendAddr?: string; // Override default multisend contract
  quoteTokensCacheTtl?: number; // Quote tokens cache TTL in seconds (default: 3600)
  marketCacheTtl?: number; // Market data cache TTL in seconds (default: 300)
});
```

### Environment Variables

Create a `.env` file:

```
API_KEY=your_api_key
RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
MULTI_SIG_ADDRESS=your_multi_sig_address
```

### Chain IDs

- **BNB Chain Mainnet**: 56

## TypeScript Support

This SDK is written in TypeScript and provides full type definitions out of the box. All types and enums are exported for your convenience.

```typescript
import {
  Client,
  OrderSide,
  OrderType,
  TopicStatus,
  TopicType,
  PlaceOrderDataInput,
  ClientConfig,
} from "opinion-clob-sdk";
```

## Error Handling

The SDK provides specific error types for different scenarios:

```typescript
import {
  InvalidParamError,
  OpenApiError,
  ValidationError,
  BalanceNotEnoughError,
  InsufficientGasBalanceError,
  NoPositionsToRedeemError,
} from "opinion-clob-sdk";

try {
  const result = await client.placeOrder(orderData);
} catch (error) {
  if (error instanceof InvalidParamError) {
    console.error("Invalid parameter:", error.message);
  } else if (error instanceof OpenApiError) {
    console.error("API error:", error.message);
  } else if (error instanceof ValidationError) {
    console.error("Validation error:", error.message);
  } else if (error instanceof BalanceNotEnoughError) {
    console.error("Insufficient balance:", error.message);
  } else if (error instanceof InsufficientGasBalanceError) {
    console.error("Insufficient gas:", error.message);
  } else if (error instanceof NoPositionsToRedeemError) {
    console.error("No positions to redeem:", error.message);
  }
}
```

## Development

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## API Reference

See the [full API documentation](https://docs.opinion.trade) for detailed information.

## Key Differences from Python SDK

This TypeScript SDK maintains API compatibility with the Python SDK while following TypeScript/JavaScript conventions:

- **Naming**: Uses camelCase instead of snake_case for method names and parameters (while maintaining snake_case for API requests)
- **Async/Await**: All async methods return Promises
- **Type Safety**: Full TypeScript type definitions included
- **Error Handling**: Uses try/catch with custom error classes
- **Configuration**: Object-based configuration instead of keyword arguments

## Features

### Complete Feature Set

✅ **Market Data**
- Get markets with filters and pagination
- Get market details (binary and categorical)
- Get orderbook data
- Get price history and latest prices
- Get fee rates

✅ **Trading**
- Place limit and market orders
- Cancel orders
- Get order history
- Sign orders with EIP-712

✅ **User Data**
- Get balances and positions
- Get trade history
- User authentication

✅ **Blockchain Operations** (NEW)
- Enable trading (token approvals)
- Split positions (collateral → outcome tokens)
- Merge positions (outcome tokens → collateral)
- Redeem positions (claim winnings)
- Gnosis Safe multi-signature support
- Gas estimation and balance checking

### Blockchain Features

The SDK includes full support for direct smart contract interactions:

- **Token Approval Management**: Automated approval of ERC20 tokens and conditional tokens for trading
- **Position Management**: Split, merge, and redeem operations for outcome tokens
- **Gnosis Safe Integration**: Multi-signature wallet support with safe transaction batching
- **Gas Management**: Automatic gas estimation with safety margins
- **Error Handling**: Comprehensive error handling for blockchain operations
- **Transaction Validation**: Automatic receipt validation and status checking

## Support

- Documentation: https://docs.opinion.trade
- Email: support@opinion.trade
- GitHub Issues: https://github.com/opinionlabs/openapi/issues

## License

MIT License - see LICENSE file for details

## Credits

Ported from the official Opinion CLOB Python SDK v0.2.7
