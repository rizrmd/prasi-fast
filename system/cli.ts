#!/usr/bin/env bun
import { spawn } from "child_process";
import { resolve } from "path";
import { buildRoutes, watchRoutes } from "./gen-route";
import { buildApis } from "./api/build-api";
import { watchApis } from "./api/watch-api";
import config from "../config.json";
import { parseServerUrl } from "../shared/types/config";

const { port: DEFAULT_PORT, host: DEFAULT_HOST } = parseServerUrl(
  config.frontend.url
);
const { port: API_PORT, host: API_HOST } = parseServerUrl(config.backend.url);

// ANSI Colors
const cyan = "\u001b[36m";
const green = "\u001b[32m";
const red = "\u001b[31m";
const reset = "\u001b[0m";

interface RunOptions {
  port?: number;
  host?: string;
  hot?: boolean;
  prod?: boolean;
}

// Track child processes for cleanup
const childProcesses: { kill: () => void }[] = [];

// Global cleanup function
const cleanup = () => {
  console.log(
    `\n${cyan}⚡️ Shutting down ${childProcesses.length} running processes...${reset}`
  );
  childProcesses.forEach((process) => process.kill());
};

// Track if cleanup has already run
let isCleaningUp = false;

// Handle process termination
const handleTermination = () => {
  if (!isCleaningUp) {
    isCleaningUp = true;
    cleanup();
    process.exit(0);
  }
};

process.on("SIGINT", handleTermination);
process.on("SIGTERM", handleTermination);
process.on("exit", () => {
  if (!isCleaningUp) {
    isCleaningUp = true;
    cleanup();
  }
});

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  stdio: "inherit" | "ignore" = "inherit"
): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      cwd,
      stdio: stdio === "inherit" ? "inherit" : ["inherit", "pipe", "pipe"], // fully inherit or just inherit stdin
      shell: true,
    });

    childProcesses.push(process);

    const isServer =
      args.includes("server.ts") || args.includes("src/index.html");

    // For servers, wait a short delay to ensure initialization
    if (isServer) {
      setTimeout(() => {
        // If process is still running after delay, consider it initialized
        if (childProcesses.includes(process)) {
          resolve();
        }
      }, 100);
    } else {
      // For non-server processes, resolve immediately
      resolve();
    }

    // Only show stderr
    process.stderr?.on("data", (data) => {
      console.error(`${red}${data.toString().trim()}${reset}`);
    });

    process.on("error", (error) => {
      console.error(`${red}${error.message}${reset}`);
      reject(new Error(`Failed to start process: ${error.message}`));
    });

    process.on("close", (code) => {
      const index = childProcesses.indexOf(process);
      if (index > -1) {
        childProcesses.splice(index, 1);
      }

      // For non-zero exit codes, reject with error
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

async function runFrontend({
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
  hot = true,
  prod = false,
}: RunOptions) {
  const cwd = resolve(import.meta.dir, "../frontend");

  if (prod) {
    // For production, just build routes once
    buildRoutes();
    buildApis();
  } else {
    // For development, start the watcher
    watchRoutes();
    watchApis();
  }

  const command = "bun";
  const args = [
    hot && !prod ? "--watch" : "",
    "src/index.html",
    `--port ${port}`,
    `--hostname ${host}`,
  ].filter(Boolean);

  if (prod) {
    process.env.NODE_ENV = "production";
  }

  await runCommand(command, args, cwd, "inherit");
}

async function runBackend({
  port = API_PORT,
  host = API_HOST,
  hot = true,
  prod = false,
}: RunOptions) {
  const cwd = resolve(import.meta.dir, "../backend");
  const command = "bun";
  const args = [
    hot && !prod ? "--hot" : "",
    "src/server.ts",
    `--port ${port}`,
    `--hostname ${host}`,
  ].filter(Boolean);

  if (prod) {
    process.env.NODE_ENV = "production";
  }

  await runCommand(command, args, cwd, "inherit");
}

async function build() {
  // Build routes first
  buildRoutes();

  // Build frontend
  const frontendCwd = resolve(import.meta.dir, "../frontend");
  await runCommand("bun", ["run", "build.ts"], frontendCwd);
}

async function runCombined({
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
    console.log(
      `\n${cyan}⚡️ Starting ${
        prod ? "Production" : "Development"
      } Server${reset}\n`
    );

    // Build phase
    console.log(`${cyan}[1/3]${reset} Building API...`);
    try {
      await buildApis();
      console.log(`${green}✓${reset} API build complete\n`);
    } catch (error) {
      console.error(`\n${red}✕ API build failed: ${error}${reset}`);
      process.exit(1);
    }

    // Start servers
    console.log(`${cyan}[2/3]${reset} Starting servers in parallel...`);
    try {
      await Promise.all([
        runFrontend({ port, hot, prod })
          .then(() => console.log(`${green}✓${reset} Frontend server ready`))
          .catch((error: any) => {
            console.error(
              `\n${red}✕ Frontend failed: ${error.message}${reset}`
            );
            process.exit(1);
          }),
        runBackend({ port: API_PORT, host: API_HOST, hot, prod })
          .then(() => console.log(`${green}✓${reset} Backend server ready`))
          .catch((error: any) => {
            console.error(`\n${red}✕ Backend failed: ${error.message}${reset}`);
            process.exit(1);
          }),
      ]);

      // Final status
      console.log(`\n${cyan}[3/3]${reset} All services ready!\n`);
      // console.clear();
      console.log(`🚀 Prasi Fast\n`);
      console.log(` ${green}• Frontend${reset} ▸  ${config.frontend.url}`);
      console.log(` ${cyan}• Backend${reset}  ▸  ${config.backend.url}\n`);
    } catch (error: any) {
      console.error(
        `\n${red}✕ Server initialization failed: ${error.message}${reset}`
      );
      process.exit(1);
    }

    // Keep the process alive
    process.stdin.resume();
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
(async () => {
  switch (command) {
    case "frontend":
      runFrontend(options);
      break;
    case "backend":
      runBackend(options);
      break;
    case "combined":
      await runCombined(options);
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
})();
