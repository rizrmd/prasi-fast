#!/usr/bin/env bun
import { listModels, removeModel, repairModels } from "./commands";
import { createModel } from "./createModel";

const command = process.argv[2];
const modelName = process.argv[3];

// Main command handler
switch (command) {
  case "add":
    createModel(modelName);
    break;
  case "list":
    listModels();
    break;
  case "remove":
    removeModel(modelName);
    break;
  case "repair":
    repairModels();
    break;
  default:
    console.log(`
Usage:
  bun model add [table_name]    Create a new model (run without table_name to see available tables)
  bun model list                List all models
  bun model remove [table_name] Remove a model by its table name
  bun model repair              Repair models registry
`);
}
