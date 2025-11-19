/**
 * Unit tests for signature handling
 */

import {
  signatureToBytes,
  signatureSplit,
  buildSignatureBytes,
  adjustVInSignature,
  getSigningAddress,
} from "../../../src/chain/safe/signatures";
import { ethers } from "ethers";

describe("Signature Handling", () => {
  describe("signatureToBytes", () => {
    it("should convert v, r, s to bytes", () => {
      const v = 27;
      const r = BigInt("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
      const s = BigInt("0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321");

      const bytes = signatureToBytes(v, r, s);

      expect(bytes).toBeDefined();
      expect(bytes.startsWith("0x")).toBe(true);
      expect(bytes.length).toBe(132); // 0x + 64 (r) + 64 (s) + 2 (v)
    });

    it("should pad values correctly", () => {
      const v = 27;
      const r = BigInt("0x1");
      const s = BigInt("0x2");

      const bytes = signatureToBytes(v, r, s);

      // Should be 0x + 64 zeros except last char (r) + 64 zeros except last char (s) + 1b (v=27)
      expect(bytes.length).toBe(132);
      expect(bytes.endsWith("1b")).toBe(true);
    });
  });

  describe("signatureSplit", () => {
    it("should split signature into components", () => {
      const r = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      const s = "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321";
      const v = 27;
      const signature = r + s.slice(2) + v.toString(16).padStart(2, "0");

      const { v: splitV, r: splitR, s: splitS } = signatureSplit(signature);

      expect(splitV).toBe(v);
      expect(splitR.toString(16).padStart(64, "0")).toBe(r.slice(2));
      expect(splitS.toString(16).padStart(64, "0")).toBe(s.slice(2));
    });

    it("should handle position parameter", () => {
      // Create two concatenated signatures
      const sig1 = "0x" + "11".repeat(64) + "22".repeat(64) + "1b";
      const sig2 = "0x" + "33".repeat(64) + "44".repeat(64) + "1c";
      const combined = sig1 + sig2.slice(2);

      const split1 = signatureSplit(combined, 0);
      expect(split1.v).toBe(27);

      const split2 = signatureSplit(combined, 1);
      expect(split2.v).toBe(28);
    });

    it("should throw on invalid signature length", () => {
      const shortSig = "0x1234";
      expect(() => signatureSplit(shortSig)).toThrow();
    });
  });

  describe("buildSignatureBytes", () => {
    it("should build signature from ethers signature", async () => {
      const wallet = ethers.Wallet.createRandom();
      const message = "Hello, World!";
      const signature = await wallet.signMessage(message);

      const built = buildSignatureBytes(signature);

      expect(built).toBeDefined();
      expect(built.startsWith("0x")).toBe(true);
      expect(built.length).toBe(132); // 65 bytes * 2 + 0x
    });

    it("should adjust v value to be >= 27", async () => {
      const wallet = ethers.Wallet.createRandom();
      const message = "Test message";
      const signature = await wallet.signMessage(message);

      const built = buildSignatureBytes(signature);

      // Extract v value (last byte)
      const vHex = built.slice(-2);
      const v = parseInt(vHex, 16);

      expect(v).toBeGreaterThanOrEqual(27);
    });

    it("should handle signatures with v < 27", () => {
      // Create a signature with v = 0
      const r = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      const s = "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321";
      const v = 0;
      const signature = r + s.slice(2) + v.toString(16).padStart(2, "0");

      const built = buildSignatureBytes(signature);

      // v should be adjusted to 27
      expect(built.endsWith("1b")).toBe(true);
    });
  });

  describe("adjustVInSignature", () => {
    it("should adjust v value to be >= 27", () => {
      // Signature with v = 0
      const signature1 =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00";
      const adjusted1 = adjustVInSignature(signature1);
      expect(adjusted1.endsWith("1b")).toBe(true); // 27 in hex

      // Signature with v = 1
      const signature2 =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef01";
      const adjusted2 = adjustVInSignature(signature2);
      expect(adjusted2.endsWith("1c")).toBe(true); // 28 in hex

      // Signature with v = 27 (already correct)
      const signature3 =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b";
      const adjusted3 = adjustVInSignature(signature3);
      expect(adjusted3).toBe(signature3);
    });

    it("should handle uppercase hex", () => {
      const signature =
        "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF00";
      const adjusted = adjustVInSignature(signature);
      expect(adjusted.endsWith("1b")).toBe(true);
    });

    it("should throw on invalid signature length", () => {
      const shortSig = "0x1234";
      expect(() => adjustVInSignature(shortSig)).toThrow();
    });
  });

  describe("getSigningAddress", () => {
    it("should recover signer address from signature", async () => {
      const wallet = ethers.Wallet.createRandom();
      const message = "Test message";
      const messageHash = ethers.hashMessage(message);
      const signature = await wallet.signMessage(message);

      const recovered = getSigningAddress(messageHash, signature);

      expect(recovered.toLowerCase()).toBe(wallet.address.toLowerCase());
    });

    it("should return zero address on invalid signature", () => {
      const messageHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      const invalidSig = "0xinvalid";

      const recovered = getSigningAddress(messageHash, invalidSig);

      expect(recovered).toBe(ethers.ZeroAddress);
    });
  });

  describe("Signature integration", () => {
    it("should work with ethers signature", async () => {
      const wallet = ethers.Wallet.createRandom();
      const message = "Hello, World!";
      const signature = await wallet.signMessage(message);

      // Should be valid ethers signature
      expect(signature).toBeDefined();
      expect(signature.startsWith("0x")).toBe(true);
      expect(signature.length).toBe(132); // 65 bytes * 2 + 0x

      // Should be splittable
      const split = signatureSplit(signature);
      expect(split.r).toBeDefined();
      expect(split.s).toBeDefined();
      expect(split.v).toBeGreaterThanOrEqual(0);
    });

    it("should round-trip split and build", () => {
      const r = BigInt("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
      const s = BigInt("0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321");
      const v = 27;

      // Build signature
      const signature = signatureToBytes(v, r, s);

      // Split it back
      const split = signatureSplit(signature);

      expect(split.v).toBe(v);
      expect(split.r).toBe(r);
      expect(split.s).toBe(s);
    });
  });
});
