import type { PrismaClient } from "@prisma/client";
import { BunRequest } from "bun";
import { unpack } from "msgpackr";
import * as models from "shared/models";
import { ModelName } from "shared/types";
const g = global as unknown as { prisma: PrismaClient };

export const transactionRoute = async (
  req: BunRequest<"/_system/transaction">
) => {
  if (req.method === "POST") {
    try {
      // Unpack the transaction operations
      const operations = unpack(
        new Uint8Array(await req.arrayBuffer())
      ) as Array<{
        modelName: string;
        method: string;
        args: any[];
      }>;

      // Initialize Prisma if needed
      if (!g.prisma) {
        g.prisma = new (await import("@prisma/client")).PrismaClient();
      }

      // Execute the transaction
      const results = await g.prisma.$transaction(async (tx) => {
        const txResults = [];

        // Process each operation in order
        for (const op of operations) {
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
    return new Response("Method not allowed", { status: 405 });
  }
};
