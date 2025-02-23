#!/usr/bin/env bun
import { spawn } from "child_process";
import { resolve } from "path";

const DEFAULT_PORT = 3000;
const API_PORT = 3001;

// ANSI Colors
const cyan = "\u001b[36m";
const green = "\u001b[32m";
const red = "\u001b[31m";
const reset = "\u001b[0m";

interface RunOptions {
  port?: number;
  hot?: boolean;
  prod?: boolean;
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  stdio: "inherit" | "ignore" = "inherit"
): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd,
      stdio,
      shell: true,
    });

    process.on("error", (error) => {
      reject(new Error(`Failed to start process: ${error.message}`));
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    // Handle parent process exit
    process.on("SIGTERM", () => {
      process.kill();
    });
  });
}

async function runFrontend({
  port = DEFAULT_PORT,
  hot = true,
  prod = false,
}: RunOptions) {
  const cwd = resolve(import.meta.dir, "../frontend");
  const command = "bun";
  const args = [
    hot && !prod ? "--hot" : "",
    "src/index.html",
    `--port ${port}`,
  ].filter(Boolean);

  if (prod) {
    process.env.NODE_ENV = "production";
  }

  await runCommand(command, args, cwd, "ignore");
}

async function runBackend({
  port = API_PORT,
  hot = true,
  prod = false,
}: RunOptions) {
  const cwd = resolve(import.meta.dir, "../backend");
  const command = "bun";
  const args = [
    hot && !prod ? "--hot" : "",
    "src/server.ts",
    `--port ${port}`,
  ].filter(Boolean);

  if (prod) {
    process.env.NODE_ENV = "production";
  }

  await runCommand(command, args, cwd);
}

async function build() {
  // Build frontend
  const frontendCwd = resolve(import.meta.dir, "../frontend");
  await runCommand("bun", ["run", "build.ts"], frontendCwd);
}

function runCombined({
  port = DEFAULT_PORT,
  hot = true,
  prod = false,
}: RunOptions) {
  try {
    if (prod) {
      build().catch((error) => {
        console.error(`${red}Build failed: ${error.message}${reset}`);
        process.exit(1);
      });
    }

    console.clear();
    process.stdout.write(
      `${cyan}⚡️ Starting ${
        prod ? "production" : "development"
      } server...${reset}\n`
    );

    // Start both servers without awaiting them
    runFrontend({ port, hot, prod }).catch((error) => {
      console.error(`${red}Frontend failed: ${error.message}${reset}`);
      process.exit(1);
    });

    runBackend({ port: API_PORT, hot, prod }).catch((error) => {
      console.error(`${red}Backend failed: ${error.message}${reset}`);
      process.exit(1);
    });

    // Show URLs after a short delay to ensure servers have started
    setTimeout(() => {
      console.log(`   🌐 ${green}Frontend http://localhost:${port}${reset}`);
      console.log(`   🗄️  ${red}Backend  http://localhost:${API_PORT}${reset}`);
    }, 1000);

    // Keep the process alive
    process.stdin.resume();

    // Ensure clean shutdown
    process.on("SIGINT", () => {
      console.log("\nShutting down servers...");
      process.exit(0);
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(`${red}Failed to start servers: ${errorMessage}${reset}`);
    process.exit(1);
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];
const options: RunOptions = {
  port: args.includes("--port")
    ? parseInt(args[args.indexOf("--port") + 1]) || DEFAULT_PORT
    : undefined,
  hot: !args.includes("--no-hot"),
  prod: args.includes("--prod"),
};

// Command execution
switch (command) {
  case "frontend":
    runFrontend(options);
    break;
  case "backend":
    runBackend(options);
    break;
  case "combined":
    runCombined(options);
    break;
  case "build":
    build();
    break;
  default:
    console.error(
      "Unknown command. Available commands: frontend, backend, combined, build"
    );
    process.exit(1);
}
