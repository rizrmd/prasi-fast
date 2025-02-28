import hash from "hash-object";

/**
 * Generates a stable hash from an object
 * @param obj - The object to generate a hash from
 * @returns A stable hash string
 */
export const generateHash = (obj: Record<string, any>): string => {
  const hashValue = hash(obj);
  // Store the hash and its corresponding object in localStorage
  localStorage.setItem(`hash_${hashValue}`, JSON.stringify(obj));
  return hashValue;
};

/**
 * Parses a hash string into an object
 * @param hashStr - The hash string to parse
 * @returns The parsed object
 */
export const parseHash = (hashStr: string): Record<string, any> => {
  if (!hashStr) return {};

  // Try to get the value from localStorage first
  const storedValue = localStorage.getItem(`hash_${hashStr}`);
  if (storedValue) {
    try {
      return JSON.parse(storedValue);
    } catch (error) {
      console.error("Error parsing stored hash value:", error);
    }
  }

  try {
    // Remove any leading '#' if present
    const cleanHash = hashStr.startsWith("#") ? hashStr.substring(1) : hashStr;

    // Split the hash string into key-value pairs
    return Object.fromEntries(
      cleanHash.split("&").map((pair) => {
        const [key, value] = pair.split("=");
        return [key, decodeURIComponent(value)];
      })
    );
  } catch (error) {
    console.error("Error parsing hash:", error);
    return {};
  }
};
