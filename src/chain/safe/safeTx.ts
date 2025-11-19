/**
 * Safe Transaction builder for Gnosis Safe
 */

import { ethers } from "ethers";
import { SafeTxParams, EIP712TypedData } from "./types";
import { NULL_ADDRESS, SafeOperation } from "./constants";
import { eip712Encode, hashStruct } from "./eip712";
import { fastKeccak } from "./utils";
import { SAFE_V1_3_0_ABI } from "./contracts/safeV1_3_0";
import { signatureToBytes, adjustVInSignature } from "./signatures";

/**
 * Safe Transaction class
 */
export class SafeTx {
  public provider: ethers.Provider;
  public safeAddress: string;
  public to: string;
  public value: bigint;
  public data: string;
  public operation: SafeOperation;
  public safeTxGas: bigint;
  public baseGas: bigint;
  public gasPrice: bigint;
  public gasToken: string;
  public refundReceiver: string;
  public signatures: string;
  public safeNonce: number;
  public safeVersion: string;
  public chainId: number;

  constructor(
    provider: ethers.Provider,
    safeAddress: string,
    params: SafeTxParams & { nonce: number; safeVersion: string; chainId: number }
  ) {
    this.provider = provider;
    this.safeAddress = safeAddress;
    this.to = params.to;
    this.value = params.value;
    this.data = params.data || "0x";
    this.operation = params.operation ?? SafeOperation.CALL;
    this.safeTxGas = params.safeTxGas ?? BigInt(0);
    this.baseGas = params.baseGas ?? BigInt(0);
    this.gasPrice = params.gasPrice ?? BigInt(0);
    this.gasToken = params.gasToken || NULL_ADDRESS;
    this.refundReceiver = params.refundReceiver || NULL_ADDRESS;
    this.signatures = "0x";
    this.safeNonce = params.nonce;
    this.safeVersion = params.safeVersion;
    this.chainId = params.chainId;
  }

  /**
   * Get EIP-712 structured data for this transaction
   */
  getEIP712TypedData(): EIP712TypedData {
    // Determine base gas key based on Safe version
    const baseGasKey = this.safeVersion >= "1.0.0" ? "baseGas" : "dataGas";

    const types: any = {
      EIP712Domain: [{ name: "verifyingContract", type: "address" }],
      SafeTx: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "operation", type: "uint8" },
        { name: "safeTxGas", type: "uint256" },
        { name: baseGasKey, type: "uint256" },
        { name: "gasPrice", type: "uint256" },
        { name: "gasToken", type: "address" },
        { name: "refundReceiver", type: "address" },
        { name: "nonce", type: "uint256" },
      ],
    };

    const message: any = {
      to: this.to,
      value: this.value.toString(),
      data: this.data,
      operation: this.operation,
      safeTxGas: this.safeTxGas.toString(),
      [baseGasKey]: this.baseGas.toString(),
      gasPrice: this.gasPrice.toString(),
      gasToken: this.gasToken,
      refundReceiver: this.refundReceiver,
      nonce: this.safeNonce,
    };

    const domain: any = {
      verifyingContract: this.safeAddress,
    };

    // Add chainId for Safe >= 1.3.0
    if (this.safeVersion >= "1.3.0") {
      types.EIP712Domain.unshift({ name: "chainId", type: "uint256" });
      domain.chainId = this.chainId;
    }

    return {
      types,
      primaryType: "SafeTx",
      domain,
      message,
    };
  }

  /**
   * Get the Safe transaction hash
   */
  getSafeTxHash(): string {
    const typedData = this.getEIP712TypedData();
    const [magic, domainHash, messageHash] = eip712Encode(typedData);
    return fastKeccak(ethers.concat([magic, domainHash, messageHash]));
  }

  /**
   * Sign the transaction with a private key
   */
  async sign(privateKey: string): Promise<string> {
    const wallet = new ethers.Wallet(privateKey);
    const safeTxHash = this.getSafeTxHash();

    // Sign the hash
    const signature = await wallet.signMessage(ethers.getBytes(safeTxHash));

    // Adjust v value for Safe
    const adjustedSignature = adjustVInSignature(signature);

    // Store the signature
    this.signatures = adjustedSignature;

    return adjustedSignature;
  }

  /**
   * Get recommended gas for the ethereum transaction
   */
  getRecommendedGas(): bigint {
    return this.baseGas + this.safeTxGas + BigInt(75000);
  }

  /**
   * Get the contract function for executing this transaction
   */
  getExecuteFunction(): ethers.Interface {
    const iface = new ethers.Interface(SAFE_V1_3_0_ABI);
    return iface;
  }

  /**
   * Encode the execTransaction call
   */
  encodeExecTransaction(): string {
    const iface = this.getExecuteFunction();
    return iface.encodeFunctionData("execTransaction", [
      this.to,
      this.value,
      this.data,
      this.operation,
      this.safeTxGas,
      this.baseGas,
      this.gasPrice,
      this.gasToken,
      this.refundReceiver,
      this.signatures,
    ]);
  }
}
