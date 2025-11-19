/**
 * Example: Blockchain Operations with Opinion CLOB SDK
 *
 * This example demonstrates how to use the advanced blockchain features:
 * - Enable trading (approve tokens)
 * - Split positions (convert collateral to outcome tokens)
 * - Merge positions (convert outcome tokens back to collateral)
 * - Redeem positions (claim winnings after market resolution)
 */

import { Client, CHAIN_ID_BNB_MAINNET } from "../src/index";
import { ethers } from "ethers";

async function main() {
  // Initialize the client with blockchain capabilities
  const client = new Client({
    host: "https://api.opinion.markets",
    apiKey: process.env.OPINION_API_KEY!,
    chainId: CHAIN_ID_BNB_MAINNET,
    rpcUrl: "https://bsc-dataseed.binance.org/",
    privateKey: process.env.PRIVATE_KEY!,
    multiSigAddr: process.env.MULTI_SIG_ADDR!,
  });

  console.log("=== Opinion CLOB SDK - Blockchain Operations Example ===\n");

  try {
    // ===== 1. Enable Trading =====
    console.log("1. Enabling trading (approving tokens)...");
    const enableResult = await client.enableTrading();

    if (enableResult) {
      console.log(`✓ Trading enabled successfully!`);
      console.log(`  Transaction hash: ${enableResult.txHash}`);
      console.log(`  Safe transaction hash: ${enableResult.safeTxHash}`);
    } else {
      console.log(`✓ All tokens already approved, no transaction needed`);
    }
    console.log();

    // ===== 2. Split Position =====
    // This converts collateral tokens (e.g., USDT) into outcome tokens
    // For a binary market with 2 outcomes, you'll get tokens for both YES and NO
    console.log("2. Splitting position...");
    const marketId = 12345; // Replace with actual market ID
    const amountToSplit = ethers.parseUnits("10", 6); // 10 USDT (6 decimals)

    const splitResult = await client.split({
      marketId,
      amount: amountToSplit,
      partition: [1, 2], // Binary market: outcome 1 and outcome 2
    });

    console.log(`✓ Position split successfully!`);
    console.log(`  Transaction hash: ${splitResult.txHash}`);
    console.log(`  You now have outcome tokens for both YES and NO`);
    console.log();

    // ===== 3. Place Orders (Already Implemented) =====
    console.log("3. You can now trade your outcome tokens...");
    console.log("   (Use client.placeOrder() to trade your positions)");
    console.log();

    // ===== 4. Merge Position =====
    // This converts outcome tokens back into collateral
    // You need equal amounts of all outcome tokens to merge
    console.log("4. Merging position (converting outcome tokens back to collateral)...");
    const amountToMerge = ethers.parseUnits("5", 6); // 5 USDT worth

    const mergeResult = await client.merge({
      marketId,
      amount: amountToMerge,
      partition: [1, 2],
    });

    console.log(`✓ Position merged successfully!`);
    console.log(`  Transaction hash: ${mergeResult.txHash}`);
    console.log(`  You now have your collateral back`);
    console.log();

    // ===== 5. Redeem Position (After Market Resolution) =====
    // This claims your winnings after the market is resolved
    console.log("5. Redeeming position (after market resolution)...");

    // Note: This will only work if the market is resolved
    // Uncomment the following code when the market is resolved:
    /*
    const redeemResult = await client.redeem({
      marketId,
      partition: [1, 2],
    });

    console.log(`✓ Position redeemed successfully!`);
    console.log(`  Transaction hash: ${redeemResult.txHash}`);
    console.log(`  Your winnings have been claimed!`);
    */
    console.log("   (This can only be done after the market is resolved)");
    console.log();

  } catch (error: any) {
    console.error("Error:", error.message);

    // Handle specific error types
    if (error.name === "BalanceNotEnoughError") {
      console.error("Insufficient balance to complete the operation");
    } else if (error.name === "InsufficientGasBalanceError") {
      console.error("Insufficient BNB for gas fees");
    } else if (error.name === "NoPositionsToRedeemError") {
      console.error("No positions available to redeem");
    }
  }

  console.log("=== Example Complete ===");
}

// Run the example
main().catch(console.error);
