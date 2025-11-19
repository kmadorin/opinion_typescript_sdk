/**
 * EIP-712 encoding utilities for Safe transactions
 * Based on https://eips.ethereum.org/EIPS/eip-712
 */

import { ethers } from "ethers";
import { fastKeccak } from "./utils";
import { EIP712TypedData } from "./types";

/**
 * Encode type string for EIP-712
 */
function encodeType(primaryType: string, types: Record<string, Array<{ name: string; type: string }>>): string {
  const deps = findTypeDependencies(primaryType, types);
  const sortedDeps = deps.filter((d) => d !== primaryType).sort();
  const allTypes = [primaryType, ...sortedDeps];

  let result = "";
  for (const typeName of allTypes) {
    const fields = types[typeName];
    if (!fields || fields.length === 0) {
      throw new Error(`No type definition specified: ${typeName}`);
    }
    const fieldStrings = fields.map((f) => `${f.type} ${f.name}`);
    result += `${typeName}(${fieldStrings.join(",")})`;
  }
  return result;
}

/**
 * Find all type dependencies for a given type
 */
function findTypeDependencies(
  primaryType: string,
  types: Record<string, Array<{ name: string; type: string }>>,
  results: string[] = []
): string[] {
  // Extract base type name (remove array brackets)
  const baseType = primaryType.split("[")[0];

  if (results.includes(baseType) || !types[baseType]) {
    return results;
  }

  results.push(baseType);

  for (const field of types[baseType]) {
    findTypeDependencies(field.type, types, results);
  }

  return results;
}

/**
 * Hash a type string
 */
function hashType(primaryType: string, types: Record<string, Array<{ name: string; type: string }>>): string {
  return fastKeccak(ethers.toUtf8Bytes(encodeType(primaryType, types)));
}

/**
 * Encode data according to EIP-712
 */
function encodeData(
  primaryType: string,
  data: Record<string, any>,
  types: Record<string, Array<{ name: string; type: string }>>
): string {
  const encodedTypes: string[] = ["bytes32"];
  const encodedValues: any[] = [hashType(primaryType, types)];

  for (const field of types[primaryType]) {
    const value = data[field.name];
    const type = field.type;

    if (types[type]) {
      // Nested struct type
      if (value === null || value === undefined) {
        encodedTypes.push("bytes32");
        encodedValues.push(ethers.ZeroHash);
      } else {
        encodedTypes.push("bytes32");
        encodedValues.push(fastKeccak(encodeData(type, value, types)));
      }
    } else if (type === "bytes") {
      encodedTypes.push("bytes32");
      encodedValues.push(fastKeccak(value));
    } else if (type === "string") {
      encodedTypes.push("bytes32");
      encodedValues.push(fastKeccak(ethers.toUtf8Bytes(value)));
    } else if (type.endsWith("]")) {
      // Array type
      const baseType = type.slice(0, type.lastIndexOf("["));
      if (value && value.length > 0) {
        const arrayEncodedTypes: string[] = [];
        const arrayEncodedValues: any[] = [];

        for (const item of value) {
          if (types[baseType]) {
            arrayEncodedTypes.push("bytes32");
            arrayEncodedValues.push(fastKeccak(encodeData(baseType, item, types)));
          } else {
            arrayEncodedTypes.push(baseType);
            arrayEncodedValues.push(item);
          }
        }

        const encoded = ethers.AbiCoder.defaultAbiCoder().encode(arrayEncodedTypes, arrayEncodedValues);
        encodedTypes.push("bytes32");
        encodedValues.push(fastKeccak(encoded));
      } else {
        encodedTypes.push("bytes32");
        encodedValues.push(fastKeccak("0x"));
      }
    } else {
      encodedTypes.push(type);
      encodedValues.push(value);
    }
  }

  return ethers.AbiCoder.defaultAbiCoder().encode(encodedTypes, encodedValues);
}

/**
 * Hash a struct according to EIP-712
 */
export function hashStruct(
  primaryType: string,
  data: Record<string, any>,
  types: Record<string, Array<{ name: string; type: string }>>
): string {
  return fastKeccak(encodeData(primaryType, data, types));
}

/**
 * Encode EIP-712 typed data
 * Returns tuple of [magic, domain hash, message hash]
 */
export function eip712Encode(typedData: EIP712TypedData): [string, string, string] {
  if (typedData.primaryType === "EIP712Domain") {
    throw new TypeError("primaryType cannot be EIP712Domain");
  }

  const magic = "0x1901";
  const domainHash = hashStruct("EIP712Domain", typedData.domain, typedData.types);
  const messageHash = hashStruct(typedData.primaryType, typedData.message, typedData.types);

  return [magic, domainHash, messageHash];
}

/**
 * Encode and hash EIP-712 typed data
 */
export function eip712EncodeHash(typedData: EIP712TypedData): string {
  const [magic, domainHash, messageHash] = eip712Encode(typedData);
  return fastKeccak(ethers.concat([magic, domainHash, messageHash]));
}
