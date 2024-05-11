import { AutoRouter, createResponse } from "itty-router";
import { config, machineType } from "./mud.config.js";
import materialLabels from "./materials.json";
import { fetchRecords } from "./fetchRecords.js";
import { concatHex, keccak256 } from "viem";

const router = AutoRouter({
  format: createResponse("application/json; charset=utf-8", (data) =>
    JSON.stringify(
      data,
      (key: string, value: any) =>
        typeof value === "bigint" ? value.toString() : value,
      2
    )
  ),
});

router.get("/", () => ({ message: "Have you eaten your $BUGS today?" }));

router.get("/orders", async () => {
  const { records, blockNumber } = await fetchRecords([
    config.tables.Order,
    config.tables.MaterialMetadata,
    config.tables.CompletedPlayers,
  ]);

  const orders = records
    .filter((record) => record.table.tableId === config.tables.Order.tableId)
    .map((record) => {
      const order = record.fields;

      const material = records.find(
        (r) =>
          r.table.tableId === config.tables.MaterialMetadata.tableId &&
          r.fields.materialId === record.fields.materialId
      )?.fields;

      const materialData = material
        ? materialLabels.find((row) => row.name === material.name)
        : undefined;

      const completed = records.find(
        (r) =>
          r.table.tableId === config.tables.CompletedPlayers.tableId &&
          r.fields.orderId === record.fields.orderId
      )?.fields;

      return {
        ...order,
        orderNumber: parseInt(order.orderId.replace(/^0x/, ""), 16),
        material: material
          ? {
              ...material,
              label: materialData?.label,
            }
          : undefined,
        completed: completed?.count,
        remaining: completed
          ? Math.max(0, order.maxPlayers - completed.count)
          : undefined,
      };
    })
    .filter(
      (order) => order.remaining > 0 && order.expirationBlock > blockNumber
    );

  return orders;
});

router.get("/recipes", async () => {
  const { records } = await fetchRecords([
    config.tables.Recipe,
    config.tables.MaterialMetadata,
  ]);

  const materials = records
    .filter(
      (record) =>
        record.table.tableId === config.tables.MaterialMetadata.tableId
    )
    .map((record) => ({
      ...record.fields,
      label: materialLabels.find((row) => row.name === record.fields.name)
        ?.label,
    }));

  const materialCombos = [
    ...materials.map((material) => ({
      inputHash: keccak256(material.materialId),
      materials: [material],
    })),
    ...materials.flatMap((firstMaterial) =>
      materials.map((secondMaterial) => {
        const combo = [firstMaterial, secondMaterial];
        combo.sort((a, b) => a.materialId.localeCompare(b.materialId));
        return {
          inputHash: keccak256(
            concatHex(combo.map((material) => material.materialId))
          ),
          materials: combo,
        };
      })
    ),
  ];

  const recipes = records
    .filter((record) => record.table.tableId === config.tables.Recipe.tableId)
    .map((record) => {
      const machine = machineType[record.fields.machine];

      const outputs = record.fields.outputs.map((output) =>
        materials.find((material) => material.materialId === output)
      );

      const inputHash = record.fields.input;
      const input = materialCombos.find(
        (combo) => combo.inputHash === inputHash
      )?.materials;

      return { inputHash, input, machine, outputs };
    });

  return recipes;
});

export default router;
