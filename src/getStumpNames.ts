import { config } from "./mud.config.js";
import { fetchRecords } from "./fetchRecords.js";

interface Record {
  fields: {
    id: string;
    value: string;
  };
}

export async function getStumpNames() {
  const { records } = await fetchRecords([config.tables.Name]);

  const stumpNames = records
    .filter((record: Record) => record.table.tableId === config.tables.Name.tableId)
    .map((record: Record) => ({
      id: record.fields.id,
      value: record.fields.value
    }));

  return stumpNames;
}