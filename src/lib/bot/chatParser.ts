/**
 * Chat parser for Minecraft server messages.
 * Supports NaturalSMP format and vanilla format.
 */
export interface ParsedChat {
  username: string;
  message: string;
}

export function parsePlayerChat(rawMessage: string): ParsedChat | null {
  // Format server NaturalSMP: [Not Secure] <emoji> <username> <rank> » <message>
  const notSecureRegex = /^\[Not Secure\]\s+\S+\s+([a-zA-Z0-9_]+)\s+.*?\s+»\s+(.*)$/;
  let match = rawMessage.match(notSecureRegex);
  if (match) {
    return { username: match[1], message: match[2] };
  }

  // Vanilla format: <Steve> Hello
  const vanillaRegex = /^<([a-zA-Z0-9_]+)> (.*)$/;
  match = rawMessage.match(vanillaRegex);
  if (match) {
    return { username: match[1], message: match[2] };
  }

  // Common plugin format: [Player] message
  const pluginRegex = /^\[([a-zA-Z0-9_]+)\]\s+(.*)$/;
  match = rawMessage.match(pluginRegex);
  if (match) {
    return { username: match[1], message: match[2] };
  }

  return null;
}
