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
