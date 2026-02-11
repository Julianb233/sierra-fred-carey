/**
 * Content sanitization for community user-generated content.
 * Phase 41: Founder Communities
 *
 * Strips HTML tags to prevent XSS in posts, replies, and community descriptions.
 */

/**
 * Strip all HTML tags from user input. Preserves text content.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Sanitize and truncate user-generated content.
 */
export function sanitizeContent(
  input: string,
  maxLength: number = 10000
): string {
  const stripped = stripHtml(input);
  return stripped.slice(0, maxLength);
}

/**
 * Generate a URL-safe slug from a community name.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
