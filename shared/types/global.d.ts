declare module "*.json" {
  const value: {
    frontend: { url: string };
    backend: { url: string };
  };
  export default value;
}
