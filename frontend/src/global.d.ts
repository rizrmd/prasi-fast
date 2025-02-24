interface ImportMetaEnv {
  // add env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly hot?: {
    data: Record<string, any>;
    accept(): void;
  };
}

module globalThis {
  const config = { backend: { url: string }, frontend: { url: string } };
}

declare module "*.png";
declare module "*.jpeg";
declare module "*.jpg";
