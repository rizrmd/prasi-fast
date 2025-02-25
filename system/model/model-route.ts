import { BunRequest } from "bun";
import { unpack } from "msgpackr";
import * as models from "shared/models";
export const modelRoute = async (req: BunRequest<"/_system/models/:model">) => {
  const modelName = req.params.model;
  if (req.method === "POST") {
    const posts = unpack(new Uint8Array(await req.arrayBuffer())) as { method: string; args: any[] }[];

    const model = (models as any)[modelName];
    const prisma = model.prisma[model.config.tableName] as any;
    const result = [] as any[];
    for (const post of posts) {
      try {
        const done = await prisma[post.method](...post.args);
        result.push(done);
      } catch (e) {
        console.error(e);
        result.push({ error: e });
      }
    }

    return Response.json(result);
  } else {
    return new Response("OK", { status: 200 });
  }
};
