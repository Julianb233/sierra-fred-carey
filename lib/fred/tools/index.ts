/**
 * FRED Tool Registry
 *
 * Barrel export for all FRED AI tools.
 * getFredTools(userId) returns all tools bound to the current user.
 */

export { recommendContentTool } from "./content-recommender";
export { findProviderTool } from "./provider-finder";
export { createMemorySearchTool } from "./memory-search";

import { recommendContentTool } from "./content-recommender";
import { findProviderTool } from "./provider-finder";
import { createMemorySearchTool } from "./memory-search";

/**
 * Get all FRED tools bound to a specific user.
 * Pass the returned object as the `tools` parameter to generate().
 */
export function getFredTools(userId: string) {
  return {
    recommendContent: recommendContentTool,
    findProvider: findProviderTool,
    searchMemory: createMemorySearchTool(userId),
  };
}
