import { unwrap } from "@latticexyz/common";
import { createIndexerClient } from "@latticexyz/store-sync/indexer-client";
import { Table } from "@latticexyz/store/config/v2";
import { flattenSchema, KeySchema } from "./flattenSchema.js";
import {
  decodeKey,
  decodeValueArgs,
  getKeySchema,
  getValueSchema,
} from "@latticexyz/protocol-parser/internal";
import { isDefined } from "@latticexyz/common/utils";

const indexerClient = createIndexerClient({
  url: "https://indexer.mud.redstonechain.com",
});

export async function fetchRecords(tables: readonly Table[]) {
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

  return { records, blockNumber: results.blockNumber };
}
