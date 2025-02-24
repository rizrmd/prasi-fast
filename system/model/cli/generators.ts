import { Model, produceSchema } from "@mrleebo/prisma-ast";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { sortByEstimatedImportance } from "./utils";

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

  modelBlock.properties
    .filter((prop: any) => prop.type === "field")
    .forEach((field: any) => {
      // Check if field type exists as a model name (relation)
      const isRelation = allModelNames.includes(field.fieldType);

      if (isRelation) {
        // Field is a relation - determine type based on array property
        const relationType = field.array ? "hasMany" : "belongsTo";
        relations[field.name] = {
          model: field.fieldType,
          type: relationType,
          foreignKey: field.name,
          label: capitalize(field.name),
        };
      } else {
        // Regular field - add as column
        columns[field.name] = {
          type: getFieldType(field.fieldType),
          label: capitalize(field.name),
          required: !field.optional,
        };
      }
    });

  const titleColumn = sortByEstimatedImportance(Object.keys(columns))[0];
  // Prepare the model file content using the shared model sample as reference
  const className = capitalize(modelName);
  const fileContent = `import type { Prisma, ${className} as Prisma${className} } from "@prisma/client";
import { BaseModel } from "system/model/model";
import { ModelConfig } from "system/types";

export class ${className} extends BaseModel<Prisma${className}, Prisma.${className}WhereInput> {
  title(data: Partial<Prisma${className}>) {
    return \`\${data.${titleColumn}}\`;
  }
  protected config: ModelConfig = {
    modelName: "${className}",
    tableName: "${tableName}",
    relations: ${JSON.stringify(relations, null, 2)},
    columns: ${JSON.stringify(columns, null, 2)}
  };
}
`;

  // Write the model file to the appropriate directory
  const modelDir = join(MODELS_DIR, modelName.toLowerCase());
  mkdirSync(modelDir, { recursive: true });
  const modelFilePath = join(modelDir, "model.ts");
  writeFileSync(modelFilePath, fileContent);
  console.log(`Generated model file at: ${modelFilePath}`);
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

export async function updateModelsRegistry(modelName: string) {
  const content = readFileSync(MODELS_FILE, "utf-8");
  const importStatement = `import { ${capitalize(
    modelName
  )} } from "./models/${modelName.toLowerCase()}/model";\n`;
  const exportStatement = `export const ${modelName.toLowerCase()}: ${capitalize(
    modelName
  )} = ModelRegistry.getInstance("${capitalize(modelName)}", ${capitalize(
    modelName
  )});\n`;

  const updatedContent = content.includes(importStatement)
    ? content
    : content
        .replace(
          "import { ModelRegistry }",
          `${importStatement}import { ModelRegistry }`
        )
        .replace("export const", `${exportStatement}export const`);

  writeFileSync(MODELS_FILE, updatedContent);
  console.log(`Updated models registry in: ${MODELS_FILE}`);
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
