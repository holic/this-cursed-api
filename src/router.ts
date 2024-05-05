import { AutoRouter, createResponse } from "itty-router";
import { createIndexerClient } from "@latticexyz/store-sync/indexer-client";
import { unwrap } from "@latticexyz/common";
import { flattenSchema } from "./flattenSchema.js";
import {
  decodeKey,
  decodeValueArgs,
  getKeySchema,
  getValueSchema,
  KeySchema,
} from "@latticexyz/protocol-parser/internal";
import { isDefined } from "@latticexyz/common/utils";
import { config } from "./mud.config.js";

const tables = Object.values(config.tables);

const indexerClient = createIndexerClient({
  url: "https://indexer.mud.redstonechain.com",
});

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
  const metadata = await fetch(
    "https://70kzkeor.api.sanity.io/v2023-10-23/data/query/production?query=*%5B_type+%3D%3D+%27material%27%5D%7B...%2C+hint-%3E%7D&returnQuery=false"
  )
    .then((res) => res.json())
    .then((res) => res.result);

  const results = unwrap(
    await indexerClient.getLogs({
      chainId: 690,
      address: "0x4ab7e8b94347cb0236e3de126db9c50599f7db2d",
      filters: tables.map((table) => ({
        tableId: table.tableId,
      })),
    })
  );

  const records = results.logs
    .map((log) => {
      if (log.eventName !== "Store_SetRecord") {
        throw new Error(`Unexpected log type from indexer: ${log.eventName}`);
      }

      const table = tables.find((table) => table.tableId === log.args.tableId);
      if (!table) return;

      config.tables.Order;

      const keySchema = flattenSchema(getKeySchema(table));
      const key = decodeKey(keySchema as KeySchema, log.args.keyTuple);
      const value = decodeValueArgs(
        flattenSchema(getValueSchema(table)),
        log.args
      );

      return {
        table,
        keyTuple: log.args.keyTuple,
        primaryKey: Object.values(key),
        key,
        value,
        fields: { ...key, ...value },
      };
    })
    .filter(isDefined);

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
        ? metadata.find((row) => row.materialType === material.name)
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
              metadata: materialData,
            }
          : undefined,
        completed: completed?.count,
        remaining: completed
          ? Math.max(0, order.maxPlayers - completed.count)
          : undefined,
      };
    })
    .filter(
      (order) =>
        order.remaining > 0 && order.expirationBlock > results.blockNumber
    );

  return orders;
});

export default router;
