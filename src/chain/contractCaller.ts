/**
 * Contract caller for blockchain interactions
 * Handles token approvals, position management (split/merge/redeem)
 */

import { ethers } from "ethers";
import { Safe } from "./safe/safe";
import { MultiSendTx } from "./safe/types";
import { SafeOperation, NULL_HASH } from "./safe/constants";
import { getEmptyTxParams } from "./safe/utils";
import { ERC20_ABI } from "./contracts/erc20Abi";
import { CONDITIONAL_TOKENS_ABI } from "./contracts/conditionalTokensAbi";
import { BalanceNotEnoughError, NoPositionsToRedeemError, InsufficientGasBalanceError } from "../types/errors";

export interface ContractCallerConfig {
  rpcUrl: string;
  privateKey: string;
  multiSigAddr: string;
  conditionalTokensAddr: string;
  multisendAddr: string;
  enableTradingCheckInterval?: number;
}

/**
 * ContractCaller handles all blockchain interactions
 */
export class ContractCaller {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private multiSigAddr: string;
  private conditionalTokensAddr: string;
  private multisendAddr: string;
  private safe: Safe;
  private enableTradingCheckInterval: number;
  private enableTradingLastTime?: number;
  private tokenDecimalsCache: Map<string, number> = new Map();

  constructor(config: ContractCallerConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.multiSigAddr = ethers.getAddress(config.multiSigAddr);
    this.conditionalTokensAddr = ethers.getAddress(config.conditionalTokensAddr);
    this.multisendAddr = ethers.getAddress(config.multisendAddr);
    this.enableTradingCheckInterval = config.enableTradingCheckInterval ?? 3600;

    // Initialize Safe
    this.safe = new Safe(this.provider, config.privateKey, this.multiSigAddr, this.multisendAddr);
  }

  /**
   * Get ERC20 contract instance
   */
  private getERC20Contract(address: string): ethers.Contract {
    return new ethers.Contract(address, ERC20_ABI, this.provider);
  }

  /**
   * Get Conditional Tokens contract instance
   */
  private get conditionalTokens(): ethers.Contract {
    return new ethers.Contract(this.conditionalTokensAddr, CONDITIONAL_TOKENS_ABI, this.provider);
  }

  /**
   * Get token decimals with caching
   */
  async getTokenDecimals(tokenAddress: string): Promise<number> {
    const key = tokenAddress.toLowerCase();

    if (!this.tokenDecimalsCache.has(key)) {
      const erc20 = this.getERC20Contract(tokenAddress);
      try {
        const decimals = await erc20.decimals();
        this.tokenDecimalsCache.set(key, Number(decimals));
        console.log(`Token ${tokenAddress} uses ${decimals} decimals`);
      } catch (error) {
        console.warn(`Failed to get decimals for ${tokenAddress}, defaulting to 18:`, error);
        this.tokenDecimalsCache.set(key, 18);
      }
    }

    return this.tokenDecimalsCache.get(key)!;
  }

  /**
   * Check if signer has enough gas balance
   */
  async checkGasBalance(estimatedGas: number = 500000): Promise<void> {
    const signerAddress = this.wallet.address;
    const gasBalance = await this.provider.getBalance(signerAddress);

    // Get current gas price
    const feeData = await this.provider.getFeeData();
    let gasPrice: bigint;

    if (feeData.maxFeePerGas) {
      // EIP-1559: maxFeePerGas = baseFee * 2 + maxPriorityFeePerGas
      gasPrice = feeData.maxFeePerGas;
    } else {
      // Legacy: use gasPrice
      gasPrice = feeData.gasPrice ?? BigInt(0);
    }

    // Add 20% safety margin to estimated gas
    const estimatedGasWithMargin = Math.floor(estimatedGas * 1.2);

    // Calculate required balance
    const requiredBalance = BigInt(estimatedGasWithMargin) * gasPrice;

    if (gasBalance < requiredBalance) {
      const gasPriceGwei = ethers.formatUnits(gasPrice, "gwei");
      throw new InsufficientGasBalanceError(
        `Insufficient gas balance. Signer ${signerAddress} has ${ethers.formatEther(gasBalance)} ETH, ` +
          `but needs approximately ${ethers.formatEther(requiredBalance)} ETH for gas ` +
          `(gas: ${estimatedGasWithMargin}, price: ${gasPriceGwei} gwei)`
      );
    }

    console.log(
      `Gas balance check passed. Signer has ${ethers.formatEther(gasBalance)} ETH, ` +
        `estimated cost: ${ethers.formatEther(requiredBalance)} ETH ` +
        `(gas: ${estimatedGasWithMargin}, price: ${ethers.formatUnits(gasPrice, "gwei")} gwei)`
    );
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateTransactionGas(txParams: ethers.TransactionRequest): Promise<number> {
    try {
      const estimated = await this.provider.estimateGas(txParams);
      console.log(`Estimated gas for transaction: ${estimated}`);
      return Number(estimated);
    } catch (error) {
      console.warn("Gas estimation failed, using fallback:", error);
      return 500000; // Conservative fallback
    }
  }

  /**
   * Get position ID for a specific outcome
   */
  async getPositionId(conditionId: string, indexSet: number, collateralToken: string, parentCollectionId: string = NULL_HASH): Promise<bigint> {
    const collectionId = await this.conditionalTokens.getCollectionId(parentCollectionId, conditionId, indexSet);
    return await this.conditionalTokens.getPositionId(collateralToken, collectionId);
  }

  /**
   * Split position: convert collateral tokens into outcome tokens
   */
  async split(
    collateralToken: string,
    conditionId: string,
    amount: bigint,
    partition: number[] = [1, 2],
    parentCollectionId: string = NULL_HASH
  ): Promise<{ txHash: string; safeTxHash: string }> {
    // Check gas balance
    await this.checkGasBalance(300000);

    // Check collateral balance
    const erc20 = this.getERC20Contract(collateralToken);
    const balance = await erc20.balanceOf(this.multiSigAddr);
    console.log(`Collateral balance: ${balance}`);

    if (balance < amount) {
      throw new BalanceNotEnoughError(`Insufficient collateral balance. Have ${balance}, need ${amount}`);
    }

    // Build split transaction
    const multiSendTxs: MultiSendTx[] = [];

    const iface = new ethers.Interface(CONDITIONAL_TOKENS_ABI);
    const data = iface.encodeFunctionData("splitPosition", [collateralToken, parentCollectionId, conditionId, partition, amount]);

    multiSendTxs.push({
      operation: SafeOperation.CALL,
      to: this.conditionalTokensAddr,
      value: BigInt(0),
      data,
    });

    // Execute via Safe
    const result = await this.safe.executeMultisend(multiSendTxs);

    // Wait for transaction receipt and validate
    const receipt = await this.provider.waitForTransaction(result.txHash, 1, 120000);
    if (!receipt || receipt.status !== 1) {
      throw new Error(`Split transaction failed. Transaction hash: ${result.txHash}`);
    }

    console.log(`Split successful. Transaction hash: ${result.txHash}`);
    return result;
  }

  /**
   * Merge position: convert outcome tokens back into collateral
   */
  async merge(
    collateralToken: string,
    conditionId: string,
    amount: bigint,
    partition: number[] = [1, 2],
    parentCollectionId: string = NULL_HASH
  ): Promise<{ txHash: string; safeTxHash: string }> {
    // Check gas balance
    await this.checkGasBalance(300000);

    // Check balance of all positions
    for (const indexSet of partition) {
      const positionId = await this.getPositionId(conditionId, indexSet, collateralToken, parentCollectionId);
      const balance = await this.conditionalTokens.balanceOf(this.multiSigAddr, positionId);

      if (balance < amount) {
        throw new BalanceNotEnoughError(`Insufficient position balance for index ${indexSet}. Have ${balance}, need ${amount}`);
      }
    }

    // Build merge transaction
    const multiSendTxs: MultiSendTx[] = [];

    const iface = new ethers.Interface(CONDITIONAL_TOKENS_ABI);
    const data = iface.encodeFunctionData("mergePositions", [collateralToken, parentCollectionId, conditionId, partition, amount]);

    multiSendTxs.push({
      operation: SafeOperation.CALL,
      to: this.conditionalTokensAddr,
      value: BigInt(0),
      data,
    });

    // Execute via Safe
    const result = await this.safe.executeMultisend(multiSendTxs);

    // Wait for transaction receipt and validate
    const receipt = await this.provider.waitForTransaction(result.txHash, 1, 120000);
    if (!receipt || receipt.status !== 1) {
      throw new Error(`Merge transaction failed. Transaction hash: ${result.txHash}`);
    }

    console.log(`Merge successful. Transaction hash: ${result.txHash}`);
    return result;
  }

  /**
   * Redeem position: claim winnings after market resolution
   */
  async redeem(
    collateralToken: string,
    conditionId: string,
    partition: number[] = [1, 2],
    parentCollectionId: string = NULL_HASH
  ): Promise<{ txHash: string; safeTxHash: string }> {
    // Check gas balance
    await this.checkGasBalance(300000);

    // Check if user has any positions to redeem
    let hasPositions = false;
    for (const indexSet of partition) {
      const positionId = await this.getPositionId(conditionId, indexSet, collateralToken, parentCollectionId);
      const balance = await this.conditionalTokens.balanceOf(this.multiSigAddr, positionId);

      if (balance > 0) {
        hasPositions = true;
        break;
      }
    }

    if (!hasPositions) {
      throw new NoPositionsToRedeemError();
    }

    // Build redeem transaction
    const multiSendTxs: MultiSendTx[] = [];

    const iface = new ethers.Interface(CONDITIONAL_TOKENS_ABI);
    const data = iface.encodeFunctionData("redeemPositions", [collateralToken, parentCollectionId, conditionId, partition]);

    multiSendTxs.push({
      operation: SafeOperation.CALL,
      to: this.conditionalTokensAddr,
      value: BigInt(0),
      data,
    });

    // Execute via Safe
    const result = await this.safe.executeMultisend(multiSendTxs);

    // Wait for transaction receipt and validate
    const receipt = await this.provider.waitForTransaction(result.txHash, 1, 120000);
    if (!receipt || receipt.status !== 1) {
      throw new Error(`Redeem transaction failed. Transaction hash: ${result.txHash}`);
    }

    console.log(`Redeem successful. Transaction hash: ${result.txHash}`);
    return result;
  }

  /**
   * Enable trading: approve tokens for trading on CTF Exchange
   */
  async enableTrading(supportedQuoteTokens: Map<string, string>): Promise<{ txHash: string; safeTxHash: string } | null> {
    // Check cache to avoid unnecessary transactions
    if (this.enableTradingLastTime && Date.now() - this.enableTradingLastTime < this.enableTradingCheckInterval * 1000) {
      console.log("Enable trading check interval not elapsed, skipping");
      return null;
    }

    this.enableTradingLastTime = Date.now();

    // Check gas balance
    await this.checkGasBalance(500000);

    const multiSendTxs: MultiSendTx[] = [];
    const iface = new ethers.Interface(ERC20_ABI);
    const maxApproval = ethers.MaxUint256;

    for (const [erc20Address, ctfExchangeAddress] of supportedQuoteTokens.entries()) {
      const erc20 = this.getERC20Contract(erc20Address);

      // Get token decimals
      const decimals = await this.getTokenDecimals(erc20Address);

      // Check allowance for CTF Exchange
      const allowance = await erc20.allowance(this.multiSigAddr, ctfExchangeAddress);
      const minThreshold = BigInt(1000000000) * BigInt(10 ** decimals);

      if (allowance < minThreshold) {
        // Reset to 0 first if needed (USDT-style tokens)
        if (allowance > 0) {
          const resetData = iface.encodeFunctionData("approve", [ctfExchangeAddress, 0]);
          multiSendTxs.push({
            operation: SafeOperation.CALL,
            to: erc20Address,
            value: BigInt(0),
            data: resetData,
          });
          console.log(`Resetting approval to 0 for ${erc20Address} -> ${ctfExchangeAddress}`);
        }

        // Set new approval
        const approveData = iface.encodeFunctionData("approve", [ctfExchangeAddress, maxApproval]);
        multiSendTxs.push({
          operation: SafeOperation.CALL,
          to: erc20Address,
          value: BigInt(0),
          data: approveData,
        });
        console.log(`Approving unlimited allowance for ${erc20Address} -> ${ctfExchangeAddress}`);
      }

      // Check allowance for Conditional Tokens (for splitting)
      const ctAllowance = await erc20.allowance(this.multiSigAddr, this.conditionalTokensAddr);
      if (ctAllowance < minThreshold) {
        // Reset to 0 first if needed
        if (ctAllowance > 0) {
          const resetData = iface.encodeFunctionData("approve", [this.conditionalTokensAddr, 0]);
          multiSendTxs.push({
            operation: SafeOperation.CALL,
            to: erc20Address,
            value: BigInt(0),
            data: resetData,
          });
          console.log(`Resetting approval to 0 for ${erc20Address} -> ${this.conditionalTokensAddr}`);
        }

        // Set new approval
        const approveData = iface.encodeFunctionData("approve", [this.conditionalTokensAddr, maxApproval]);
        multiSendTxs.push({
          operation: SafeOperation.CALL,
          to: erc20Address,
          value: BigInt(0),
          data: approveData,
        });
        console.log(`Approving unlimited allowance for ${erc20Address} -> ${this.conditionalTokensAddr}`);
      }

      // Approve CTF Exchange for using conditional tokens
      const isApprovedForAll = await this.conditionalTokens.isApprovedForAll(this.multiSigAddr, ctfExchangeAddress);
      if (!isApprovedForAll) {
        const ctIface = new ethers.Interface(CONDITIONAL_TOKENS_ABI);
        const approvalData = ctIface.encodeFunctionData("setApprovalForAll", [ctfExchangeAddress, true]);
        multiSendTxs.push({
          operation: SafeOperation.CALL,
          to: this.conditionalTokensAddr,
          value: BigInt(0),
          data: approvalData,
        });
        console.log(`Setting approval for all conditional tokens to ${ctfExchangeAddress}`);
      }
    }

    // Execute if there are any transactions to send
    if (multiSendTxs.length > 0) {
      const result = await this.safe.executeMultisend(multiSendTxs);

      // Wait for transaction receipt and validate
      const receipt = await this.provider.waitForTransaction(result.txHash, 1, 120000);
      if (!receipt || receipt.status !== 1) {
        throw new Error(`Enable trading transaction failed. Transaction hash: ${result.txHash}`);
      }

      console.log(`Enable trading successful. Transaction hash: ${result.txHash}`);
      return result;
    }

    console.log("No approvals needed");
    return null;
  }
}
