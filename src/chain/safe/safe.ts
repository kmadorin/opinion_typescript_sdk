/**
 * Gnosis Safe contract interaction handler
 */

import { ethers } from "ethers";
import { MultiSendTx, SafeTxParams } from "./types";
import { SafeOperation, NULL_ADDRESS } from "./constants";
import { MultiSend } from "./multisend";
import { SafeTx } from "./safeTx";
import { SAFE_V1_3_0_ABI } from "./contracts/safeV1_3_0";

const VERSION = "1.3.0";

/**
 * Safe class for managing Gnosis Safe transactions
 */
export class Safe {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private address: string;
  private multisendAddress: string;
  private multisend: MultiSend;
  private contract: ethers.Contract;
  private chainId?: number;

  constructor(provider: ethers.Provider, privateKey: string, safeAddress: string, multisendAddress: string) {
    this.provider = provider;
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.address = safeAddress;
    this.multisendAddress = multisendAddress;
    this.multisend = new MultiSend(provider, multisendAddress, false);
    this.contract = new ethers.Contract(safeAddress, SAFE_V1_3_0_ABI, this.wallet);
  }

  /**
   * Get the chain ID
   */
  async getChainId(): Promise<number> {
    if (!this.chainId) {
      const network = await this.provider.getNetwork();
      this.chainId = Number(network.chainId);
    }
    return this.chainId;
  }

  /**
   * Get Safe version
   */
  getVersion(): string {
    return VERSION;
  }

  /**
   * Retrieve current nonce from Safe contract
   */
  async retrieveNonce(): Promise<number> {
    const nonce = await this.contract.nonce();
    return Number(nonce);
  }

  /**
   * Build a MultiSend transaction
   */
  async buildMultisendTx(txs: MultiSendTx[], safeNonce?: number): Promise<SafeTx> {
    const nonce = safeNonce ?? (await this.retrieveNonce());
    const chainId = await this.getChainId();

    // Estimate gas for the multisend
    const safeGas = await this.multisend.estimateGas(txs, this.address);

    // Build transaction data
    const data = this.multisend.buildTxData(txs);

    // Create SafeTx
    const safeTx = new SafeTx(this.provider, this.address, {
      to: this.multisendAddress,
      value: BigInt(0),
      data,
      operation: SafeOperation.DELEGATE_CALL,
      safeTxGas: safeGas,
      baseGas: BigInt(0),
      gasPrice: BigInt(0),
      gasToken: NULL_ADDRESS,
      refundReceiver: NULL_ADDRESS,
      nonce,
      safeVersion: this.getVersion(),
      chainId,
    });

    return safeTx;
  }

  /**
   * Execute a MultiSend transaction
   */
  async executeMultisend(txs: MultiSendTx[], safeNonce?: number): Promise<{ txHash: string; safeTxHash: string }> {
    // Build the safe transaction
    const safeTx = await this.buildMultisendTx(txs, safeNonce);

    // Sign the transaction
    await safeTx.sign(this.wallet.privateKey);

    // Calculate recommended gas
    const recommendedGas = safeTx.getRecommendedGas();

    // Add 20% safety margin
    const gasLimit = (recommendedGas * BigInt(120)) / BigInt(100);

    // Prepare transaction parameters
    const txParams = {
      from: this.wallet.address,
      to: this.address,
      data: safeTx.encodeExecTransaction(),
      gasLimit,
    };

    // Send the transaction
    const tx = await this.wallet.sendTransaction(txParams);

    return {
      txHash: tx.hash,
      safeTxHash: safeTx.getSafeTxHash(),
    };
  }

  /**
   * Build a multisig transaction
   */
  async buildMultisigTx(params: SafeTxParams & { safeNonce?: number }): Promise<SafeTx> {
    const nonce = params.safeNonce ?? (await this.retrieveNonce());
    const chainId = await this.getChainId();

    return new SafeTx(this.provider, this.address, {
      to: params.to,
      value: params.value,
      data: params.data,
      operation: params.operation ?? SafeOperation.CALL,
      safeTxGas: params.safeTxGas ?? BigInt(0),
      baseGas: params.baseGas ?? BigInt(0),
      gasPrice: params.gasPrice ?? BigInt(0),
      gasToken: params.gasToken || NULL_ADDRESS,
      refundReceiver: params.refundReceiver || NULL_ADDRESS,
      nonce,
      safeVersion: this.getVersion(),
      chainId,
    });
  }

  /**
   * Get the Safe contract address
   */
  getAddress(): string {
    return this.address;
  }

  /**
   * Get the signer's address
   */
  getSignerAddress(): string {
    return this.wallet.address;
  }
}
