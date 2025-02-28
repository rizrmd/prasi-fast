export const parseHash = () => {
  const hash = window.location.hash.substring(1);
  if (!hash) return {};

  return Object.fromEntries(
    hash.split("&").map((pair) => {
      const [key, value] = pair.split("=");
      return [key, decodeURIComponent(value)];
    })
  );
};

export const extractHash = (key: string) => {
  const hash = window.location.hash.substring(1);
  if (!hash) return undefined;

  // If a specific key is requested, extract just that value
  if (key) {
    const keyValue = hash
      .split("&")
      .map((pair) => pair.split("="))
      .find(([k]) => k === key);

    return keyValue ? keyValue[1] : undefined;
  }
};

export const composeHash = (hash: Record<string, any>) => {
  const entries = Object.entries(hash).filter(([key, value]) => {
    if (value === undefined) return false;
    return true;
  });
  if (entries.length === 0) return "";
  return (
    "#" +
    Object.entries(hash)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&")
  );
};
