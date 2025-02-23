export interface ServerConfig {
  url: string;
}

export interface AppConfig {
  frontend: ServerConfig;
  backend: ServerConfig;
}

export function parseServerUrl(url: string): { host: string; port: number } {
  const parsedUrl = new URL(url);
  return {
    host: parsedUrl.hostname,
    port: parseInt(parsedUrl.port)
  };
}
