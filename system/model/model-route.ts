import type { PrismaClient, User } from "@prisma/client";
import { BunRequest } from "bun";
import { unpack } from "msgpackr";
import * as models from "shared/models";
import { ModelName } from "shared/types";
const g = global as unknown as { prisma: PrismaClient };

export const modelRoute = async (req: BunRequest<"/_system/model/:model">) => {
  if (req.method === "POST") {
    try {
      // Unpack the transaction operations
      const posts = unpack(new Uint8Array(await req.arrayBuffer())) as Array<{
        modelName: string;
        method: string;
        args: any[];
      }>;

      // Initialize Prisma if needed
      if (!g.prisma) {
        g.prisma = new (await import("@prisma/client")).PrismaClient();
      }

      const paramModelName = req.params.model;

      if (paramModelName === "_transaction") {
        const results = await handleModelTransaction(g.prisma, posts);
        return Response.json(results);
      }

      const modelName = Object.keys(models).find(
        (e) => paramModelName.toLowerCase() === e.toLowerCase()
      ) as ModelName;

      const results = await handleModelOperation(g.prisma, modelName, posts);
      return Response.json(results);
    } catch (error: any) {
      console.error("Transaction error:", error);
      return Response.json(
        [
          {
            error: {
              message: error.message,
              code: error.code,
            },
          },
        ],
        { status: 500 }
      );
    }
  } else {
    return new Response("OK", { status: 200 });
  }
};

async function handleModelTransaction(
  prisma: PrismaClient,
  posts: Array<{
    modelName: string;
    method: string;
    args: any[];
  }>
) {
  return await prisma.$transaction(async (tx) => {
    const txResults = [];

    // Process each operation in order
    for (const op of posts) {
      try {
        // Get model name with proper casing
        const modelName = Object.keys(models).find(
          (e) => e.toLowerCase() === op.modelName.toLowerCase()
        ) as ModelName;

        if (!modelName) {
          txResults.push({
            error: {
              message: `Model not found: ${op.modelName}`,
            },
          });
          continue;
        }

        // Get the model from transaction context
        const model = (tx as any)[
          modelName.charAt(0).toLowerCase() + modelName.slice(1)
        ];

        if (!model || typeof model[op.method] !== "function") {
          txResults.push({
            error: {
              message: `Invalid method: ${modelName}.${op.method}`,
            },
          });
          continue;
        }

        // Execute the operation
        const result = await model[op.method](...op.args);
        txResults.push(result);
      } catch (error: any) {
        console.error("Operation error:", error);
        // Store the error to return to the client
        txResults.push({
          error: {
            message: error.message,
            code: error.code,
          },
        });
        // Re-throw to abort the transaction
        throw error;
      }
    }

    return txResults;
  });
}

async function handleModelOperation(
  prisma: PrismaClient,
  modelName: ModelName,
  posts: Array<{
    method: string;
    args: any[];
  }>
) {
  const model = (prisma as any)[modelName];
  const results = [] as any[];

  for (const post of posts) {
    try {
      const done = await model[post.method](...post.args);
      results.push(done);
    } catch (e: any) {
      console.error(e);
      results.push({ error: { ...e, message: e.message } });
    }
  }

  return results;
}
