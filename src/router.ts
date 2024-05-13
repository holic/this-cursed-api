import { AutoRouter, createResponse } from "itty-router";
import { config } from "./mud.config.js";
import { fetchRecords } from "./fetchRecords.js";
import { getRecipes } from "./getRecipes.js";
import { getMaterials } from "./getMaterials.js";
import { getStumps } from "./getStumps.js";

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
  const materials = await getMaterials();
  const { records, blockNumber } = await fetchRecords([
    config.tables.Order,
    config.tables.CompletedPlayers,
  ]);

  const orders = records
    .filter((record) => record.table.tableId === config.tables.Order.tableId)
    .map((record) => {
      const order = record.fields;

      const completed = records.find(
        (r) =>
          r.table.tableId === config.tables.CompletedPlayers.tableId &&
          r.fields.orderId === record.fields.orderId
      )?.fields;

      return {
        ...order,
        orderNumber: parseInt(order.orderId.replace(/^0x/, ""), 16),
        material: materials.find(
          (material) => material.materialId === order.materialId
        ),
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

router.get("/materials", async () => {
  const { recipes, materials } = await getRecipes();

  const costs = {
    BUGS: 1,
    PELLETS: 1,
    "SILICON WAFER": 1,
  };

  function getMaterialCost(material, path: string[] = []) {
    if (costs[material.name]) return costs[material.name];

    const possibleRecipes = recipes
      .filter((recipe) =>
        recipe.outputs.some((output) => output.name === material.name)
      )
      // filter out recursive recipes
      .filter((recipe) =>
        recipe.inputs?.every((input) => !path.includes(input.name))
      );

    const recipeCosts = possibleRecipes.map((recipe) => {
      const inputCosts = recipe.inputs?.map((input) =>
        getMaterialCost(input, [input.name, ...path])
      );
      const inputCost = inputCosts?.reduce((next, sum) => sum + next, 0);
      return inputCost * recipe.outputs.length;
    });

    const cheapest = recipeCosts.reduce(
      (next, min) => Math.min(min, next),
      Infinity
    );

    if (cheapest < Infinity) {
      costs[material.name] = cheapest;
    }
    return cheapest;
  }

  return materials.map((material) => {
    return {
      ...material,
      cost: getMaterialCost(material),
    };
  });
});

router.get("/recipes", async () => {
  const { recipes } = await getRecipes();
  return recipes;
});

router.get("/recipes/:material", async (req) => {
  const { recipes } = await getRecipes();

  return recipes.filter((recipe) =>
    recipe.outputs.some((output) => output.name === req.params.material)
  );
});

router.get("/stumps", async () => {
  return await getStumps();
});

export default router;
