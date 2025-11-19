/**
 * Example: Complete Trading Workflow
 *
 * This example shows a complete workflow:
 * 1. Get market information
 * 2. Enable trading
 * 3. Split position
 * 4. Place orders
 * 5. Monitor positions
 * 6. Redeem winnings (after resolution)
 */

import { Client, CHAIN_ID_BNB_MAINNET, OrderSide, OrderType } from "../src/index";
import { ethers } from "ethers";

async function completeWorkflow() {
  const client = new Client({
    host: "https://api.opinion.markets",
    apiKey: process.env.OPINION_API_KEY!,
    chainId: CHAIN_ID_BNB_MAINNET,
    rpcUrl: "https://bsc-dataseed.binance.org/",
    privateKey: process.env.PRIVATE_KEY!,
    multiSigAddr: process.env.MULTI_SIG_ADDR!,
  });

  console.log("=== Complete Trading Workflow ===\n");

  try {
    // Step 1: Get market information
    console.log("Step 1: Fetching market information...");
    const marketId = 12345; // Replace with actual market ID
    const marketResponse = await client.getMarket(marketId);
    const market = marketResponse.result.data;

    console.log(`Market: ${market.title}`);
    console.log(`Status: ${market.status}`);
    console.log(`Outcomes: ${market.outcomes?.map((o: any) => o.name).join(", ")}`);
    console.log();

    // Step 2: Enable trading (one-time setup)
    console.log("Step 2: Enabling trading...");
    await client.enableTrading();
    console.log("✓ Trading enabled");
    console.log();

    // Step 3: Split position to get outcome tokens
    console.log("Step 3: Splitting position to get outcome tokens...");
    const collateralAmount = ethers.parseUnits("100", 6); // 100 USDT

    const splitResult = await client.split({
      marketId,
      amount: collateralAmount,
    });

    console.log(`✓ Split complete: ${splitResult.txHash}`);
    console.log(`  You now have 100 tokens for each outcome`);
    console.log();

    // Step 4: Place a buy order for YES outcome
    console.log("Step 4: Placing orders...");

    // Get the token ID for the YES outcome (outcome index 0)
    const yesTokenId = market.outcomes[0].token_id;

    // Place a sell order for YES at 0.60
    const sellOrder = await client.placeOrder({
      marketId,
      tokenId: yesTokenId,
      price: "0.60",
      makerAmountInBaseToken: "50", // Sell 50 YES tokens
      side: OrderSide.SELL,
      orderType: OrderType.LIMIT_ORDER,
    });

    console.log(`✓ Sell order placed: ${sellOrder.result?.order_id}`);
    console.log(`  Selling 50 YES tokens at $0.60 each`);
    console.log();

    // Step 5: Monitor positions
    console.log("Step 5: Checking your positions...");
    const positions = await client.getMyPositions({ marketId });

    if (positions.result?.list) {
      positions.result.list.forEach((pos: any) => {
        console.log(`  ${pos.outcome_name}: ${pos.amount} tokens`);
      });
    }
    console.log();

    // Step 6: Check orders
    console.log("Step 6: Checking your orders...");
    const orders = await client.getMyOrders({ marketId });

    if (orders.result?.list) {
      console.log(`  You have ${orders.result.list.length} active orders`);
    }
    console.log();

    // Step 7: Merge remaining tokens back to collateral (if needed)
    console.log("Step 7: Merging remaining tokens back to collateral...");
    const mergeAmount = ethers.parseUnits("50", 6); // Merge 50 tokens

    const mergeResult = await client.merge({
      marketId,
      amount: mergeAmount,
    });

    console.log(`✓ Merge complete: ${mergeResult.txHash}`);
    console.log(`  Converted 50 outcome tokens back to USDT`);
    console.log();

    // Note: After market resolution, you can redeem your winning positions
    console.log("After market resolution:");
    console.log("  Use client.redeem({ marketId }) to claim your winnings");
    console.log();

  } catch (error: any) {
    console.error("Error in workflow:", error.message);
    throw error;
  }

  console.log("=== Workflow Complete ===");
}

// Run the workflow
completeWorkflow().catch(console.error);
