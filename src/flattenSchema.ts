import { mapObject } from "@latticexyz/common/utils";
import { SchemaAbiType, StaticAbiType } from "@latticexyz/schema-type/internal";

export type KeySchema = {
  readonly [k: string]: {
    readonly type: StaticAbiType;
  };
};

export type ValueSchema = {
  readonly [k: string]: {
    readonly type: SchemaAbiType;
  };
};

export function flattenSchema<schema extends ValueSchema>(
  schema: schema
): { readonly [k in keyof schema]: schema[k]["type"] } {
  return mapObject(schema, (value) => value.type);
}
