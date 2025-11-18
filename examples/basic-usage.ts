/**
 * Basic usage example for Opinion CLOB SDK
 */

import { Client, OrderSide, OrderType, TopicType, TopicStatusFilter, CHAIN_ID_BNB_MAINNET } from "../src";

async function main() {
  // Initialize client (read-only mode - no private key needed for queries)
  const client = new Client({
    host: "https://proxy.opinion.trade:8443",
    apiKey: process.env.API_KEY || "your_api_key",
    chainId: CHAIN_ID_BNB_MAINNET,
  });

  console.log("=== Opinion CLOB SDK Example ===\n");

  // 1. Get markets
  console.log("1. Fetching markets...");
  const markets = await client.getMarkets({
    topicType: TopicType.BINARY,
    status: TopicStatusFilter.ACTIVATED,
    page: 1,
    limit: 5,
  });
  console.log(`Found ${markets.result?.list?.length || 0} markets`);

  // 2. Get specific market
  if (markets.result?.list && markets.result.list.length > 0) {
    const firstMarket = markets.result.list[0];
    console.log(`\n2. Fetching market details for market ID: ${firstMarket.market_id}`);
    const market = await client.getMarket(firstMarket.market_id);
    console.log(`Market: ${market.result?.data?.topic_name || "N/A"}`);
  }

  // 3. Get quote tokens
  console.log("\n3. Fetching supported quote tokens...");
  const quoteTokens = await client.getQuoteTokens();
  console.log(`Supported quote tokens: ${quoteTokens.result?.list?.length || 0}`);

  // For trading operations, you need to provide private key and multi-sig address:
  const tradingClient = new Client({
    host: "https://proxy.opinion.trade:8443",
    apiKey: process.env.API_KEY || "your_api_key",
    chainId: CHAIN_ID_BNB_MAINNET,
    rpcUrl: process.env.RPC_URL || "https://bsc-dataseed.binance.org",
    privateKey: process.env.PRIVATE_KEY || "",
    multiSigAddr: process.env.MULTI_SIG_ADDRESS || "",
  });

  // Example: Place a limit order (requires private key)
  if (process.env.PRIVATE_KEY && process.env.MULTI_SIG_ADDRESS) {
    console.log("\n4. Example: Placing a limit order (not executed)");
    console.log("   Order parameters:");
    console.log({
      marketId: 123,
      tokenId: "token_yes",
      side: "BUY",
      orderType: "LIMIT_ORDER",
      price: "0.5",
      makerAmountInQuoteToken: "10",
    });
    // Uncomment to actually place an order:
    // const order = await tradingClient.placeOrder({
    //   marketId: 123,
    //   tokenId: 'token_yes',
    //   side: OrderSide.BUY,
    //   orderType: OrderType.LIMIT_ORDER,
    //   price: '0.5',
    //   makerAmountInQuoteToken: '10'
    // });
    // console.log('Order placed:', order);
  }

  // Example: Get user data
  if (process.env.API_KEY) {
    console.log("\n5. Fetching user balances...");
    try {
      const balances = await tradingClient.getMyBalances();
      console.log(`Balance data available: ${!!balances.result}`);
    } catch (error: any) {
      console.log(`Could not fetch balances: ${error.message}`);
    }
  }

  console.log("\n=== Example completed ===");
}

// Run the example
if (require.main === module) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}

export { main };
