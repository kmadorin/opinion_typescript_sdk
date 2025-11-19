/**
 * MultiSend v1.3.0 ABI
 */

export const MULTISEND_V1_3_0_ABI = [
  {
    inputs: [
      {
        internalType: "bytes",
        name: "transactions",
        type: "bytes",
      },
    ],
    name: "multiSend",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;
