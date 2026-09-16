import Ajv from "ajv";
import { CONFIG_SCHEMA, SCENARIO_SCHEMA } from "./schemas.js";

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
const validateConfigSchema = ajv.compile(CONFIG_SCHEMA);
const validateScenarioSchema = ajv.compile(SCENARIO_SCHEMA);

function formatErrors(errors) {
  return (errors || []).map((e) => {
    const path = e.instancePath || "(root)";
    return `${path} ${e.message}`;
  });
}

/** Validates a parsed seed config object against the schema. Returns { valid, errors }. */
export function validateConfig(config) {
  const valid = validateConfigSchema(config);
  return { valid, errors: valid ? [] : formatErrors(validateConfigSchema.errors) };
}

/** Validates a parsed scenario object against the schema. Returns { valid, errors }. */
export function validateScenario(scenario) {
  const valid = validateScenarioSchema(scenario);
  return { valid, errors: valid ? [] : formatErrors(validateScenarioSchema.errors) };
}
