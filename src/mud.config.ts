import { defineWorld } from "@latticexyz/world";

export const materialDifficulty = [
  "novice",
  "intermediate",
  "advanced",
  "nightmare",
] as const;

export const config = defineWorld({
  enums: {
    materialDifficulty,
  },
  tables: {
    MaterialMetadata: {
      key: ["materialId"],
      schema: {
        difficulty: "materialDifficulty",
        materialId: "bytes14",
        tokenAddress: "address",
        name: "string",
      },
    },
    Order: {
      key: ["orderId"],
      schema: {
        orderId: "bytes32",
        creationBlock: "uint256",
        creator: "address",
        materialId: "bytes14",
        amount: "uint256",
        expirationBlock: "uint256",
        reward: "uint256",
        maxPlayers: "uint32",
      },
    },
    // Number of players who have completed an order
    CompletedPlayers: {
      key: ["orderId"],
      schema: {
        orderId: "bytes32",
        count: "uint32",
      },
    },
  },
});
