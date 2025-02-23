import { BunRequest } from "bun";

export const modelRoute = async (req: BunRequest<"/models/:model">) => {
  const modelName = req.params.model;
  const post = (await req.json()) as { method: string; args: any[] };

  const model = await import(`../models/${modelName}`);
  const result = await model[post.method](...post.args);

  return Response.json(result);
};
