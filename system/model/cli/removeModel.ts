import { execSync } from "child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import {
  getSchema,
  Model,
  printSchema,
  Schema,
  Property,
  Attribute,
  AttributeArgument,
} from "@mrleebo/prisma-ast";
import { capitalize } from "./utils";

const MODELS_DIR = "shared/models";
const MODELS_FILE = "shared/models.ts";

export function removeModel(tableName: string) {
  if (!tableName) {
    console.error("Table name is required");
    process.exit(1);
  }

  const schemaFile = "backend/prisma/schema.prisma";
  const schema = readFileSync(schemaFile, "utf-8");
  const parsedSchema = getSchema(schema);

  // First try to find model by table name mapping
  let modelToRemove = parsedSchema.list.find((item) => {
    if (item.type !== "model") return false;
    const model = item as Model & { attributes?: Attribute[] };
    const mapAttr = model.attributes?.find(
      (attr: Attribute) =>
        attr.type === "attribute" &&
        attr.name === "map" &&
        attr.args?.[0]?.value === tableName
    );
    return !!mapAttr;
  }) as Model | undefined;

  // If not found by table name, try to find by model name (for cases like Role -> m_role)
  if (!modelToRemove) {
    const candidateModelName = capitalize(tableName.replace(/^[mt]_/, ""));
    modelToRemove = parsedSchema.list.find((item) => {
      if (item.type !== "model") return false;
      const model = item as Model & { name: string };
      return model.name === candidateModelName;
    }) as Model | undefined;
  }

  if (!modelToRemove) {
    // Check if the model is referenced in relations
    const baseModelName = tableName.replace("m_", "");
    const models = parsedSchema.list.filter(
      (item) => item.type === "model"
    ) as (Model & { properties: Property[] })[];

    const references = models.flatMap((model) => {
      return model.properties
        .filter((prop) => {
          if (prop.type !== "field") return false;
          if (!("fieldType" in prop)) return false;
          const fieldProp = prop as {
            fieldType: string;
            attributes?: Attribute[];
          };
          return (
            (fieldProp.fieldType === baseModelName ||
              fieldProp.fieldType === tableName) &&
            fieldProp.attributes?.some(
              (attr) => attr.type === "attribute" && attr.name === "relation"
            )
          );
        })
        .map((prop) => ({
          modelName: (model as { name: string }).name,
          field: prop as unknown as { name: string; fieldType: string },
        }));
    });

    if (references.length > 0) {
      console.error(
        `Table "${tableName}" not found, but model "${baseModelName}" is still referenced.`
      );
      console.error("Please remove these relations first:");
      references.forEach((ref) => {
        console.error(
          `  - ${ref.modelName}: ${(ref.field as { name: string }).name} ${
            (ref.field as { fieldType: string }).fieldType
          }`
        );
      });
    } else {
      console.error(`Table "${tableName}" not found in schema.prisma`);
      const tables = models
        .map((model) => {
          const attr = model.properties.find(
            (e) => e.type === "attribute" && e.name === "map"
          ) as Attribute | undefined;
          const value = attr?.args?.[0]?.value;
          return typeof value === "string" ? value : undefined;
        })
        .filter((value): value is string => !!value);
      console.error(`Available tables: ${tables.join(", ")}`);
    }
    return;
  }

  const modelName = modelToRemove.name;
  const modelDir = join(MODELS_DIR, modelName.toLowerCase());
  const modelFile = join(modelDir, 'model.ts');

  try {
    // First check for relations referencing this model
    const models = parsedSchema.list.filter(
      (item) => item.type === "model"
    ) as (Model & { properties: Property[] })[];
    const relations = models.flatMap((model) => {
      return model.properties
        .filter((prop) => {
          if (prop.type !== "field" || !("fieldType" in prop)) return false;
          const fieldProp = prop as {
            name: string;
            fieldType: string;
            attributes?: Attribute[];
          };
          // Check for any fields that reference this model:
          // 1. Direct field type matches (e.g. Role field)
          const matchesType = fieldProp.fieldType === modelName;
          // 2. Foreign key fields (e.g. roleId)
          const isReferenceField =
            fieldProp.name.toLowerCase() === `${modelName.toLowerCase()}id`;
          // 3. Relation fields from either side (both User.Role and Role.m_user)
          const hasRelationToModel =
            fieldProp.attributes?.some(
              (attr) => attr.type === "attribute" && attr.name === "relation"
            ) &&
            (matchesType || isReferenceField);
          // 4. Fields in this model that relate to other models (e.g. Role.m_user)
          const isModelToRemove =
            (model as { name: string }).name === modelName;

          return (
            matchesType ||
            (hasRelationToModel && isReferenceField) ||
            (isModelToRemove && hasRelationToModel)
          );
        })
        .map((prop) => ({
          modelName: (model as { name: string }).name,
          fieldName: (prop as { name: string }).name,
          fieldType:
            (prop as { name: string; fieldType: string }).fieldType +
            ((prop as { array: boolean }).array ||
            (prop as { attributes?: Attribute[] }).attributes?.some(
              (attr: Attribute) =>
                attr.type === "attribute" &&
                attr.name === "relation" &&
                attr.args?.some((arg: { type: string }) => arg.type === "array")
            )
              ? "[]"
              : ""),
        }));
    });

    // Now we can start removing things
    if (existsSync(modelFile)) {
      if (existsSync(modelFile)) {
        unlinkSync(modelFile);
      }
      if (existsSync(modelDir)) {
        execSync(`rm -rf ${modelDir}`);
      }
      console.log(`Removed model directory: ${modelDir}`);
    }

    // Update models registry
    const content = readFileSync(MODELS_FILE, "utf-8");
    const updatedContent = content
      .replace(
        new RegExp(
          `import { ${capitalize(
            modelName
          )} } from "./models/${modelName.toLowerCase()}/model";\n`
        ),
        ""
      )
      .replace(
        new RegExp(
          `export const ${modelName.toLowerCase()}: ${capitalize(
            modelName
          )} = ModelRegistry.getInstance\\("${capitalize(
            modelName
          )}", ${capitalize(modelName)}\\);\n`
        ),
        ""
      );

    writeFileSync(MODELS_FILE, updatedContent);
    console.log(`Updated models registry`);

    // Log what we're about to remove from schema
    if (relations.length > 0) {
      console.log(`\nRemoving ${relations.length} relation(s):`);
      relations
        .sort(
          (a, b) =>
            a.modelName.localeCompare(b.modelName) ||
            a.fieldName.localeCompare(b.fieldName)
        )
        .forEach((relation) => {
          console.log(
            `  - ${relation.modelName}.${relation.fieldName}: ${relation.fieldType}`
          );
        });
    }

    // Update schema.prisma
    parsedSchema.list = parsedSchema.list.map((item) => {
      if (item.type !== "model") return item;
      const model = item as Model & { properties: Property[] };

      // Remove relation fields and their foreign key fields
      model.properties = model.properties.filter((prop) => {
        if (prop.type !== "field" || !("fieldType" in prop)) return true;
        const fieldProp = prop as { name: string; fieldType: string };
        const keepField = !(
          fieldProp.fieldType === modelName ||
          fieldProp.name.toLowerCase() === `${modelName.toLowerCase()}id`
        );
        return keepField;
      }) as Property[];

      return model;
    });

    // Remove the model itself
    parsedSchema.list = parsedSchema.list.filter(
      (item) => !(item.type === "model" && item.name === modelName)
    );

    writeFileSync(schemaFile, printSchema(parsedSchema));

    // Format schema
    execSync("bun prisma format", { stdio: "ignore" });
    execSync("bun prisma generate", { stdio: "ignore" });

    console.log(`Successfully removed model for table: ${tableName}`);
  } catch (error) {
    console.error("Error removing model:", error);
    process.exit(1);
  }
}
