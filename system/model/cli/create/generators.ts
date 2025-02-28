import { Model, produceSchema } from "@mrleebo/prisma-ast";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join, basename, dirname } from "path";
import { RelationConfig } from "system/types";
import { defaultColumns } from "system/model/model";
import { sortByEstimatedImportance } from "system/model/layout/utils";

const MODELS_DIR = "shared/models";
const MODELS_FILE = "shared/models.ts";

// Helper to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export async function generateModelFile(modelName: string, schemaFile: string) {
  // Read the Prisma schema file
  const schemaContent = readFileSync(schemaFile, "utf-8");
  let modelBlock: any;
  let allModelNames: string[] = [];

  // Use produceSchema to parse the schema and locate the model block and get all model names
  produceSchema(schemaContent, (builder) => {
    const models = builder.findAllByType("model", {});
    allModelNames = models.map((m: any) => m.name);
    modelBlock = models.find(
      (m: any) => m.name.toLowerCase() === modelName.toLowerCase()
    );
  });

  if (!modelBlock) {
    throw new Error(
      `Model "${modelName}" not found in schema file: ${schemaFile}`
    );
  }

  // Determine table name as lower-case of the model name
  const tableName = modelName.toLowerCase();

  // Generate columns and relations based on modelBlock properties
  const columns: Record<string, any> = {};
  const relations: Record<string, any> = {};

  const models = {} as Record<string, { pk: string }>;

  // Analyze each model's primary key
  produceSchema(schemaContent, (builder) => {
    const allModels = builder.findAllByType("model", {});
    allModels.forEach((model: any) => {
      const idField = model.properties.find(
        (p: any) =>
          p.type === "field" &&
          p.attributes?.some(
            (a: any) =>
              a.name === "id" ||
              (a.name === "default" &&
                a.args?.[0]?.value?.type === "function" &&
                a.args[0].value.name === "autoincrement")
          )
      );
      models[model.name] = { pk: idField?.name || "id" };
    });
  });

  modelBlock.properties
    .filter((prop: any) => prop.type === "field")
    .forEach((field: any) => {
      // Check if field type exists as a model name (relation)
      const isRelation = allModelNames.includes(field.fieldType);

      if (defaultColumns.includes(field.name)) return;

      if (isRelation) {
        // Field is a relation - determine type based on array property
        const relationType = field.array ? "hasMany" : "belongsTo";

        relations[field.name] = {
          model: field.fieldType,
          type: relationType,
          prismaField: field.name,
          toColumn: models[field.fieldType].pk,
          label: capitalize(field.name),
        } as RelationConfig;
      } else {
        // Regular field - add as column
        columns[field.name] = {
          type: getFieldType(field.fieldType),
          label: capitalize(field.name),
          required: !field.optional,
        };
      }
    });

  // Get the primary key and determine title column
  const primaryKey = models[modelName].pk;
  const columnKeys = Object.keys(columns);
  const titleColumn = columnKeys.length > 0 ? sortByEstimatedImportance(columnKeys)[0] : primaryKey;
  // Prepare the model file content using the shared model sample as reference
  const className = capitalize(modelName);

  const fileContent = `import type { Prisma, ${className} as Prisma${className} } from "@prisma/client";
import { Model, DefaultColumns } from "system/model/model";
import { ModelRelations, RelationConfig, ColumnConfig, ModelConfig, ModelColumns } from "system/types";

export class ${className} extends Model<Prisma${className}> {
  constructor() {
    super({
      modelName: "${modelName}",
      tableName: "${tableName}",
      primaryKey: "${primaryKey}",
      relations: relations as ModelRelations,
      columns: columns as ModelColumns
    });
  }

  title(data: Partial<Prisma${className}>): string {
    return data['${titleColumn}'] ? String(data['${titleColumn}']) : '';
  }

  get columns(): (keyof typeof columns | DefaultColumns)[] {
    return Object.keys(this.state.config.columns);
  }

  get relations(): (keyof typeof relations)[] {
    return Object.keys(this.state.config.relations);
  }
}

/** Columns **/
const columns: Record<string, ColumnConfig> = {
${Object.entries(columns)
  .map(([key, value]) => {
    return `  ${key}: ${JSON.stringify(value, null, 2)
      .split("\n")
      .join("\n  ")}`;
  })
  .join(",\n")}
};

/** Relations **/
const relations: Record<string, RelationConfig> = {
${Object.entries(relations)
  .map(([key, value]) => {
    return `  ${key}: ${JSON.stringify(value, null, 2)
      .split("\n")
      .join("\n  ")}`;
  })
  .join(",\n")}
};
`;

  // Write the model file to the appropriate directory
  const modelDir = join(MODELS_DIR, modelName.toLowerCase());
  mkdirSync(modelDir, { recursive: true });
  const modelFilePath = join(modelDir, "model.ts");
  writeFileSync(modelFilePath, fileContent);
  console.log(`Generated model file at ${modelFilePath}`);
}

// Helper function to map Prisma types to system types
function getFieldType(prismaType: string): string {
  const typeMap: Record<string, string> = {
    String: "string",
    Int: "number",
    Float: "number",
    Boolean: "boolean",
    DateTime: "date",
    Json: "json",
    Decimal: "number",
  };

  // Clean up any modifiers like [], ? etc.
  const baseType = prismaType.replace(/\[\]|\?/g, "");

  return typeMap[baseType] || "string";
}

export async function updateModelsRegistry() {
  // Scan /shared/models directory for model.ts files
  const modelFiles: string[] = [];

  const scanModelFiles = (dir: string) => {
    const items = readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory()) {
        scanModelFiles(fullPath);
      } else if (item.name === "model.ts") {
        const modelName = basename(dirname(fullPath));
        modelFiles.push(modelName);
      }
    }
  };

  try {
    scanModelFiles(MODELS_DIR);
  } catch (error) {
    console.error("Error scanning model files:", error);
    return;
  }

  // Generate the models.ts file content
  const imports = modelFiles
    .map((name) => {
      const capName = capitalize(name);
      return `import { ${capName} as Model${capName} } from "./models/${name}/model";`;
    })
    .join("\n");

  const registrations = modelFiles
    .map((name) => {
      const capName = capitalize(name);
      return `export const ${capName}: Model${capName} = ModelRegistry.getInstance("${capName}", Model${capName});`;
    })
    .join("\n");

  const content = `/** AUTOGENERATED - DO NOT EDIT **/
import { ModelRegistry } from "system/model/model-registry";
${imports}

${registrations}`;

  try {
    writeFileSync(MODELS_FILE, content);
    console.log(`Updated ${MODELS_FILE}`);
  } catch (error) {
    console.error("Error writing models.ts:", error);
  }
}

export async function addModelToPrisma(
  modelBlock: Model,
  tableName: string,
  schemaPath: string
) {
  try {
    let schemaContent = readFileSync(schemaPath, "utf-8");

    const updatedSchemaContent = produceSchema(schemaContent, (builder) => {
      // Check if model already exists
      const existingModels = builder.findAllByType("model", {});
      const modelExists = existingModels.some(
        (model) => model && model.name === modelBlock.name
      );

      if (!modelExists) {
        // Create a new model using the fluent API
        const model = builder.model(modelBlock.name);

        // Add fields with their attributes
        modelBlock.properties
          .filter((p) => p.type === "field")
          .forEach((field) => {
            // Prepare field type with modifiers
            const fieldType =
              field.fieldType +
              (field.array ? "[]" : "") +
              (field.optional ? "?" : "");

            // Convert attributes to decorator strings
            const decorators = (field.attributes || [])
              .map((attr) => {
                if (typeof attr === "string") return "@" + attr;
                if (typeof attr === "object" && attr !== null) {
                  const args = attr.args;
                  if (attr.name === "default" && args && Array.isArray(args)) {
                    const firstArg = args[0];
                    if (
                      firstArg &&
                      typeof firstArg === "object" &&
                      "type" in firstArg &&
                      firstArg.type === "attributeArgument" &&
                      "value" in firstArg &&
                      firstArg.value &&
                      typeof firstArg.value === "object" &&
                      "type" in firstArg.value &&
                      firstArg.value.type === "function" &&
                      "name" in firstArg.value
                    ) {
                      // Handle function arguments like now()
                      return `@${attr.name}(${firstArg.value.name}())`;
                    }
                  }
                  // For other cases, serialize the args
                  return `@${attr.name}${
                    args ? `(${JSON.stringify(args)})` : ""
                  }`;
                }
                return "";
              })
              .filter(Boolean)
              .join(" ");

            if (field.name.startsWith("m_") || field.name.startsWith("t_")) {
              const modelName = capitalize(field.name.slice(2));

              if (modelName === field.fieldType) {
                field.name = field.name.slice(2);
              }
            }

            // Add field with type and decorator string
            model.field(
              field.name,
              decorators ? `${fieldType} ${decorators}` : fieldType
            );
          });

        // Add @@map attribute to map to the correct table name
        model.blockAttribute("map", `${tableName}`);
      }
    });

    writeFileSync(schemaPath, updatedSchemaContent);
    console.log(`Updated Prisma schema in: ${schemaPath}`);
  } catch (error) {
    console.error(
      `Failed to update Prisma schema: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}