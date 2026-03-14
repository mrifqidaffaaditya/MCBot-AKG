/**
 * Chat parser for Minecraft server messages.
 * Supports custom regex patterns and vanilla format as default.
 * 
 * Custom regex must have exactly 2 capture groups:
 *   Group 1 = username
 *   Group 2 = message
 * 
 * Example patterns:
 *   Vanilla:    ^<([a-zA-Z0-9_]+)> (.*)$
 *   NaturalSMP: ^\[Not Secure\]\s+\S+\s+([a-zA-Z0-9_]+)\s+.*?\s+»\s+(.*)$
 */

export interface ParsedChat {
  username: string;
  message: string;
}

// Default vanilla Minecraft chat format: <Steve> Hello
const DEFAULT_REGEX = /^<([a-zA-Z0-9_]+)> (.*)$/;

export function parsePlayerChat(
  rawMessage: string,
  customRegexPatterns?: string[]
): ParsedChat | null {
  // Try custom regex patterns first
  if (customRegexPatterns && customRegexPatterns.length > 0) {
    for (const pattern of customRegexPatterns) {
      try {
        const regex = new RegExp(pattern);
        const match = rawMessage.match(regex);
        if (match && match[1] && match[2] !== undefined) {
          return { username: match[1], message: match[2] };
        }
      } catch {
        // Invalid regex pattern, skip
        console.warn(`⚠️ Invalid chat regex pattern: ${pattern}`);
      }
    }
  }

  // Fallback to vanilla format
  const match = rawMessage.match(DEFAULT_REGEX);
  if (match) {
    return { username: match[1], message: match[2] };
  }

  return null;
}
