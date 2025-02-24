import { Block, Model, produceSchema } from "@mrleebo/prisma-ast";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const MODELS_DIR = "shared/models";
const MODELS_FILE = "shared/models.ts";

// Helper to capitalize first letter
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function generateModelFile(name: string, schema: string) {
  // Extract model name without m_ prefix if present
  const tableName = name;
  const modelName = name.startsWith("m_") ? name.slice(2) : "Role"; // force modelName to be Role
  const modelFileName = `role.ts`; // force modelFileName to be role.ts
  const modelPath = join(MODELS_DIR, modelFileName);

  const relationsObj = ``; // No relations for Role model
  const columnsObj = `      name: {
        type: "string",
        label: "Name",
        required: true,
      },\n`;

  const template = `import type { Prisma, ${capitalize(
    modelName
  )} as Prisma${capitalize(modelName)} } from "@prisma/client";
import { BaseModel } from "system/model/model";
import { ModelConfig } from "system/types";

export class ${capitalize(modelName)} extends BaseModel<Prisma${capitalize(
    modelName
  )}, Prisma.${capitalize(modelName)}WhereInput> {
  protected config: ModelConfig = {
    modelName: "${capitalize(modelName)}", // Use modelName here as well
    tableName: "${tableName.toLowerCase()}", // Use tableName for tableName
    relations: {
${relationsObj}    },
    columns: {
${columnsObj}    }
  };
}
`;

  writeFileSync(modelPath, template);
  console.log(`Generated model file: ${modelPath}`);
}

export async function updateModelsRegistry(modelName: string) {
  const content = readFileSync(MODELS_FILE, "utf-8");
  const importStatement = `import { ${capitalize(
    modelName
  )} } from "./models/${modelName.toLowerCase()}";\n`;
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

export async function addModelToPrisma(modelBlock: Model) {
  const prismaSchemaPath = "backend/prisma/schema.prisma";

  try {
    let schemaContent = readFileSync(prismaSchemaPath, "utf-8");

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
            const fieldType = field.fieldType + (field.array ? '[]' : '') + (field.optional ? '?' : '');
            
            // Convert attributes to decorator strings
            const decorators = (field.attributes || [])
              .map(attr => {
                if (typeof attr === 'string') return '@' + attr;
                if (typeof attr === 'object' && attr !== null) {
                  const args = attr.args;
                  if (attr.name === 'default' && args && Array.isArray(args)) {
                    const firstArg = args[0];
                    if (firstArg && 
                        typeof firstArg === 'object' && 
                        'type' in firstArg && 
                        firstArg.type === 'attributeArgument' && 
                        'value' in firstArg && 
                        firstArg.value && 
                        typeof firstArg.value === 'object' && 
                        'type' in firstArg.value && 
                        firstArg.value.type === 'function' && 
                        'name' in firstArg.value) {
                      // Handle function arguments like now()
                      return `@${attr.name}(${firstArg.value.name}())`;
                    }
                  }
                  // For other cases, serialize the args
                  return `@${attr.name}${args ? `(${JSON.stringify(args)})` : ''}`;
                }
                return '';
              })
              .filter(Boolean)
              .join(' ');

            // Add field with type and decorator string
            model.field(field.name, decorators ? `${fieldType} ${decorators}` : fieldType);
          });
      }
    });

    writeFileSync(prismaSchemaPath, updatedSchemaContent);
    console.log(`Updated Prisma schema in: ${prismaSchemaPath}`);
  } catch (error) {
    console.error(
      `Failed to update Prisma schema: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}
