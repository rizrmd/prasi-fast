import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractTypes(content: string): string[] {
  const types: string[] = [];
  const regex = /(export\s+)?(interface|type)\s+\w+[\s\S]*?(?=(\n\n|$))/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    types.push(match[0]);
  }

  return types;
}

async function generateApiTypes() {
  const backendDir = join(process.cwd(), "backend/src");
  const outputDir = join(process.cwd(), "frontend/generated");

  // Create output directory if it doesn't exist
  mkdirSync(outputDir, { recursive: true });

  // Read all TypeScript files in the backend/src directory
  const files = readdirSync(backendDir).filter((file) => file.endsWith(".ts"));

  let types: string[] = [];

  // Extract types from each file
  for (const file of files) {
    const filePath = join(backendDir, file);
    const content = readFileSync(filePath, "utf-8");
    const extractedTypes = extractTypes(content);
    types = types.concat(extractedTypes);
  }
}

// Run the generator
generateApiTypes();
