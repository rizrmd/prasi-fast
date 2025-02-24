import { readdir } from "fs/promises";
import { join } from "path";

const BACKEND_API_DIR = "backend/src/api";
const FRONTEND_API_FILE = "frontend/src/lib/generated/api.ts";
const BACKEND_GENERATED_API = "backend/src/lib/generated/api.ts";

async function scanAPIFiles() {
  const apiFiles = await readdir(join(process.cwd(), BACKEND_API_DIR));
  return apiFiles.filter((file) => file.endsWith(".ts"));
}

async function generateAPICode(apiFiles: string[]): Promise<string> {
  let imports = "";
  let apiObject = "";

  for (const file of apiFiles) {
    const { path } = require(`backend/src/api/${file}`).default;
    const name = file.replace(".ts", "");
    const camelName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    imports += `import type ${camelName} from "backend/src/api/${name}";\n`;

    apiObject += `  ${camelName}: apiClient<typeof ${camelName}>("${path}"),\n`;
  }

  return `// This file is auto-generated. Do not edit manually.
import { apiClient } from "system/api/client";
${imports}
export const api = {
${apiObject}};
`;
}

export async function buildApis() {
  const apiFiles = await scanAPIFiles();
  const generatedCode = await generateAPICode(apiFiles);

  // Generate frontend types
  await Bun.write(join(process.cwd(), FRONTEND_API_FILE), generatedCode);

  // Generate backend exports
  let backendExports = "";
  for (const file of apiFiles) {
    const name = file.replace(".ts", "");
    const camelName = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    backendExports += `import ${camelName} from "../api/${name}";\n`;
  }
  backendExports += `\nexport { ${apiFiles
    .map((f) =>
      f.replace(".ts", "").replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    )
    .join(", ")} };\n`;

  await Bun.write(join(process.cwd(), BACKEND_GENERATED_API), backendExports);
}

if (import.meta.main) {
  buildApis().catch(console.error);
}
