import { Changelog, changelogModel } from "./changelog";

// Export individual models
export { Changelog as SChangelog, changelogModel };

// Export singleton instances for easy access
export const systemModels = {
  changelog: changelogModel,
} as const;
