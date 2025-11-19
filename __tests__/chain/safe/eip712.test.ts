/**
 * Unit tests for EIP-712 encoding
 */

import {
  hashStruct,
  eip712Encode,
  eip712EncodeHash,
} from "../../../src/chain/safe/eip712";
import { EIP712TypedData } from "../../../src/chain/safe/types";

describe("EIP-712 Encoding", () => {
  describe("hashStruct", () => {
    it("should hash a struct correctly", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
      };

      const data = {
        name: "Alice",
        wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
      };

      const hash = hashStruct("Person", data, types);
      expect(hash).toBeValidHash();
      expect(hash.startsWith("0x")).toBe(true);
      expect(hash.length).toBe(66);
    });

    it("should handle nested structs", () => {
      const types = {
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      };

      const data = {
        from: {
          name: "Alice",
          wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        },
        to: {
          name: "Bob",
          wallet: "0x9876543210fedcba9876543210fedcba98765432",
        },
        contents: "Hello Bob!",
      };

      const hash = hashStruct("Mail", data, types);
      expect(hash).toBeValidHash();
    });

    it("should produce consistent hashes for same data", () => {
      const types = {
        Test: [{ name: "value", type: "uint256" }],
      };

      const data = { value: 42 };

      const hash1 = hashStruct("Test", data, types);
      const hash2 = hashStruct("Test", data, types);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different data", () => {
      const types = {
        Test: [{ name: "value", type: "uint256" }],
      };

      const hash1 = hashStruct("Test", { value: 42 }, types);
      const hash2 = hashStruct("Test", { value: 43 }, types);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("eip712Encode", () => {
    it("should encode EIP-712 typed data", () => {
      const typedData: EIP712TypedData = {
        types: {
          EIP712Domain: [
            { name: "verifyingContract", type: "address" },
          ],
          SafeTx: [
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "data", type: "bytes" },
            { name: "operation", type: "uint8" },
            { name: "safeTxGas", type: "uint256" },
            { name: "baseGas", type: "uint256" },
            { name: "gasPrice", type: "uint256" },
            { name: "gasToken", type: "address" },
            { name: "refundReceiver", type: "address" },
            { name: "nonce", type: "uint256" },
          ],
        },
        primaryType: "SafeTx",
        domain: {
          verifyingContract: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        },
        message: {
          to: "0xCeAfDD6bc0bEF976fdCd1112955828E00543c0Ce",
          value: 0,
          data: "0x",
          operation: 0,
          safeTxGas: 0,
          baseGas: 0,
          gasPrice: 0,
          gasToken: "0x0000000000000000000000000000000000000000",
          refundReceiver: "0x0000000000000000000000000000000000000000",
          nonce: 5,
        },
      };

      const [magic, domainHash, messageHash] = eip712Encode(typedData);

      expect(magic).toBe("0x1901");
      expect(domainHash).toBeValidHash();
      expect(messageHash).toBeValidHash();
    });

    it("should handle complex types", () => {
      const typedData: EIP712TypedData = {
        types: {
          EIP712Domain: [
            { name: "verifyingContract", type: "address" },
          ],
          Person: [
            { name: "name", type: "string" },
            { name: "wallet", type: "address" },
          ],
          Mail: [
            { name: "from", type: "Person" },
            { name: "to", type: "Person" },
            { name: "contents", type: "string" },
          ],
        },
        primaryType: "Mail",
        domain: {
          verifyingContract: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        },
        message: {
          from: {
            name: "Alice",
            wallet: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
          },
          to: {
            name: "Bob",
            wallet: "0x9876543210fedcba9876543210fedcba98765432",
          },
          contents: "Hello!",
        },
      };

      const [magic, domainHash, messageHash] = eip712Encode(typedData);

      expect(magic).toBe("0x1901");
      expect(domainHash).toBeValidHash();
      expect(messageHash).toBeValidHash();
    });
  });

  describe("eip712EncodeHash", () => {
    it("should compute final EIP-712 hash", () => {
      const typedData: EIP712TypedData = {
        types: {
          EIP712Domain: [
            { name: "verifyingContract", type: "address" },
          ],
          SafeTx: [
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
          ],
        },
        primaryType: "SafeTx",
        domain: {
          verifyingContract: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        },
        message: {
          to: "0xCeAfDD6bc0bEF976fdCd1112955828E00543c0Ce",
          value: 0,
          nonce: 5,
        },
      };

      const hash = eip712EncodeHash(typedData);
      expect(hash).toBeValidHash();
      expect(hash.startsWith("0x")).toBe(true);
      expect(hash.length).toBe(66);
    });

    it("should produce consistent hashes for same data", () => {
      const typedData: EIP712TypedData = {
        types: {
          EIP712Domain: [
            { name: "verifyingContract", type: "address" },
          ],
          Test: [{ name: "value", type: "uint256" }],
        },
        primaryType: "Test",
        domain: {
          verifyingContract: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        },
        message: { value: 42 },
      };

      const hash1 = eip712EncodeHash(typedData);
      const hash2 = eip712EncodeHash(typedData);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different data", () => {
      const typedData1: EIP712TypedData = {
        types: {
          EIP712Domain: [
            { name: "verifyingContract", type: "address" },
          ],
          Test: [{ name: "value", type: "uint256" }],
        },
        primaryType: "Test",
        domain: {
          verifyingContract: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        },
        message: { value: 42 },
      };

      const typedData2: EIP712TypedData = {
        ...typedData1,
        message: { value: 43 },
      };

      const hash1 = eip712EncodeHash(typedData1);
      const hash2 = eip712EncodeHash(typedData2);

      expect(hash1).not.toBe(hash2);
    });

    it("should match ethers TypedDataEncoder for simple types", () => {
      const { TypedDataEncoder } = require("ethers");

      const types = {
        Test: [
          { name: "value", type: "uint256" },
          { name: "message", type: "string" },
        ],
      };

      const domain = {
        verifyingContract: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
      };

      const message = {
        value: 123,
        message: "Hello World",
      };

      const typedData: EIP712TypedData = {
        types: {
          EIP712Domain: [
            { name: "verifyingContract", type: "address" },
          ],
          Test: types.Test,
        },
        primaryType: "Test",
        domain,
        message,
      };

      // Our implementation
      const ourHash = eip712EncodeHash(typedData);

      // Ethers implementation
      const encoder = TypedDataEncoder.from({
        ...types,
        EIP712Domain: [{ name: "verifyingContract", type: "address" }],
      });
      const ethersHash = encoder.hash(message, domain);

      expect(ourHash).toBe(ethersHash);
    });

    it("should handle Gnosis Safe transaction encoding", () => {
      const typedData: EIP712TypedData = {
        types: {
          EIP712Domain: [
            { name: "verifyingContract", type: "address" },
          ],
          SafeTx: [
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "data", type: "bytes" },
            { name: "operation", type: "uint8" },
            { name: "safeTxGas", type: "uint256" },
            { name: "baseGas", type: "uint256" },
            { name: "gasPrice", type: "uint256" },
            { name: "gasToken", type: "address" },
            { name: "refundReceiver", type: "address" },
            { name: "nonce", type: "uint256" },
          ],
        },
        primaryType: "SafeTx",
        domain: {
          verifyingContract: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
        },
        message: {
          to: "0xCeAfDD6bc0bEF976fdCd1112955828E00543c0Ce",
          value: 0,
          data: "0x095ea7b3",
          operation: 0,
          safeTxGas: 100000,
          baseGas: 0,
          gasPrice: 0,
          gasToken: "0x0000000000000000000000000000000000000000",
          refundReceiver: "0x0000000000000000000000000000000000000000",
          nonce: 5,
        },
      };

      const hash = eip712EncodeHash(typedData);

      expect(hash).toBeValidHash();
      expect(hash).toBeDefined();
      expect(hash.length).toBe(66);
    });
  });
});
