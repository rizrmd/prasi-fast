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
