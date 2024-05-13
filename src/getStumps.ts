import { config } from "./mud.config.js";
import { fetchRecords } from "./fetchRecords.js";
import { decodeAbiParameters } from "viem";

export async function getStumps() {
  const { records } = await fetchRecords([config.tables.Name]);

  const stumpNames = records.map((record) => {
    const [address] = decodeAbiParameters(
      [{ type: "address" }],
      record.fields.id
    );
    return {
      address,
      name: record.fields.name,
    };
  });

  return stumpNames;
}
