import { config, machineType } from "./mud.config.js";
import { fetchRecords } from "./fetchRecords.js";
import { concatHex, keccak256 } from "viem";
import { getMaterials } from "./getMaterials.js";

export async function getRecipes() {
  const materials = await getMaterials();
  const { records } = await fetchRecords([config.tables.Recipe]);

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
}
