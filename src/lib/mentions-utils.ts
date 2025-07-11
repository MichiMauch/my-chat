// Server-side utility functions for mentions (no React dependencies)

interface Mention {
  id: number;
  username: string;
  startIndex: number;
  endIndex: number;
}

export const parseMentions = (text: string): Mention[] => {
  const mentions: Mention[] = [];
  // Updated regex to capture usernames with spaces: @username or @"username with spaces"
  const mentionRegex = /@(?:"([^"]+)"|([a-zA-Z0-9_\s]+?)(?=\s|$|[^\w\s]))/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Use quoted username (group 1) or unquoted username (group 2)
    const username = match[1] || match[2];
    if (username) {
      mentions.push({
        id: 0, // Will be resolved later with actual user data
        username: username.trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }

  return mentions;
};

export const extractMentionedUserIds = (text: string, allUsers: Array<{id: number, username: string}>): number[] => {
  console.log("=== EXTRACT MENTION DEBUG ===");
  console.log("Text to parse:", text);
  console.log("Available users:", allUsers);
  
  const mentionedIds: number[] = [];
  
  // Sort users by username length (longest first) to match longer names first
  const sortedUsers = [...allUsers].sort((a, b) => b.username.length - a.username.length);
  console.log("Sorted users (longest first):", sortedUsers);
  
  // Look for @username patterns in the text
  const atIndex = text.indexOf('@');
  if (atIndex === -1) {
    console.log("No @ found in text");
    return mentionedIds;
  }
  
  // Get text after @
  const afterAt = text.substring(atIndex + 1);
  console.log("Text after @:", afterAt);
  
  // Try to match each user (longest usernames first to avoid partial matches)
  for (const user of sortedUsers) {
    const username = user.username.toLowerCase();
    const textLower = afterAt.toLowerCase();
    
    console.log(`Checking if "${textLower}" starts with "${username}"`);
    
    if (textLower.startsWith(username)) {
      // Check if it's a complete word (followed by space, end of string, or punctuation)
      const nextCharIndex = username.length;
      const nextChar = afterAt[nextCharIndex];
      
      if (!nextChar || nextChar === ' ' || /[^\w]/.test(nextChar)) {
        console.log(`MATCH FOUND: User "${user.username}" (ID: ${user.id})`);
        mentionedIds.push(user.id);
        break; // Only match first user to avoid duplicates
      }
    }
  }
  
  console.log("Final mentioned IDs:", mentionedIds);
  return mentionedIds;
};