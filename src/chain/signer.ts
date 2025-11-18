/**
 * Signer for signing orders using EIP712
 */

import { ethers } from "ethers";

export class Signer {
  private wallet: ethers.Wallet;

  constructor(privateKey: string) {
    this.wallet = new ethers.Wallet(privateKey);
  }

  /**
   * Sign an EIP712 struct hash
   */
  async sign(structHash: string): Promise<string> {
    const signature = await this.wallet.signMessage(ethers.getBytes(structHash));
    return signature.substring(2); // Remove 0x prefix
  }

  /**
   * Get signer address
   */
  address(): string {
    return this.wallet.address;
  }

  /**
   * Get the wallet instance
   */
  getWallet(): ethers.Wallet {
    return this.wallet;
  }
}
