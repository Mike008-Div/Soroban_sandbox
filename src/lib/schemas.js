export const CONFIG_SCHEMA = {
  $id: "sandbox.config.json",
  type: "object",
  required: ["accounts"],
  additionalProperties: false,
  properties: {
    accounts: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["name"],
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1 },
          startingBalance: { type: "number", exclusiveMinimum: 0 },
        },
      },
    },
  },
};

const ARG_VALUE = {
  // A raw scalar, or { "account": "<name>" } resolved to that account's public key.
  anyOf: [
    { type: ["string", "number", "boolean"] },
    { type: "object", required: ["account"], additionalProperties: false, properties: { account: { type: "string" } } },
  ],
};

export const SCENARIO_SCHEMA = {
  $id: "scenario.json",
  type: "object",
  required: ["steps"],
  additionalProperties: false,
  properties: {
    steps: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["contract", "as", "method"],
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          contract: { type: "string", minLength: 1 },
          as: { type: "string", minLength: 1 },
          method: { type: "string", minLength: 1 },
          args: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "value"],
              additionalProperties: false,
              properties: { name: { type: "string", minLength: 1 }, value: ARG_VALUE },
            },
          },
          expect: { type: ["string", "number", "boolean"] },
        },
      },
    },
  },
};
