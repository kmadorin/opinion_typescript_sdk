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
import { InvalidParamError, OpenApiError, ValidationError } from "opinion-clob-sdk";

try {
  const result = await client.placeOrder(orderData);
} catch (error) {
  if (error instanceof InvalidParamError) {
    console.error("Invalid parameter:", error.message);
  } else if (error instanceof OpenApiError) {
    console.error("API error:", error.message);
  } else if (error instanceof ValidationError) {
    console.error("Validation error:", error.message);
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

## Limitations

This initial port focuses on the core CLOB API functionality. Advanced features like:

- Direct blockchain contract calls (split, merge, redeem)
- Gnosis Safe integration
- Contract approval management

Are planned for future releases. For now, these operations should be performed through the Python SDK or direct contract interaction.

## Support

- Documentation: https://docs.opinion.trade
- Email: support@opinion.trade
- GitHub Issues: https://github.com/opinionlabs/openapi/issues

## License

MIT License - see LICENSE file for details

## Credits

Ported from the official Opinion CLOB Python SDK v0.2.7
