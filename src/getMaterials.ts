import { config } from "./mud.config.js";
import materialLabels from "./materials.json";
import { fetchRecords } from "./fetchRecords.js";

export async function getMaterials() {
  const { records } = await fetchRecords([config.tables.MaterialMetadata]);

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

  return materials;
}
