import React from "react";

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
        endIndex: match.index + match[0].length,
      });
    }
  }

  return mentions;
};

export const highlightMentions = ({
  text,
  allUsers,
}: {
  text: string;
  allUsers?: Array<{ id: number; username: string }>;
}) => {
  // If no users provided, fall back to simple parsing
  if (!allUsers || allUsers.length === 0) {
    const mentions = parseMentions(text);

    if (mentions.length === 0) {
      return React.createElement("span", null, text);
    }

    const parts: React.ReactElement[] = [];
    let lastIndex = 0;

    mentions.forEach((mention, index) => {
      // Add text before mention
      if (mention.startIndex > lastIndex) {
        parts.push(
          React.createElement(
            "span",
            { key: `text-${index}` },
            text.substring(lastIndex, mention.startIndex)
          )
        );
      }

      // Add highlighted mention
      const mentionText = text.substring(mention.startIndex, mention.endIndex);

      parts.push(
        React.createElement(
          "span",
          {
            key: `mention-${index}`,
            className:
              "inline-block px-1 py-0.5 rounded text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200",
          },
          mentionText
        )
      );

      lastIndex = mention.endIndex;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        React.createElement(
          "span",
          { key: "text-end" },
          text.substring(lastIndex)
        )
      );
    }

    return React.createElement("span", null, ...parts);
  }

  // Advanced highlighting with actual usernames
  const parts: React.ReactElement[] = [];
  const currentText = text;
  let keyCounter = 0;

  // Sort users by username length (longest first) to match longer names first
  const sortedUsers = [...allUsers].sort(
    (a, b) => b.username.length - a.username.length
  );

  // Look for @username patterns
  const atIndex = currentText.indexOf("@");
  if (atIndex === -1) {
    return React.createElement("span", null, text);
  }

  // Add text before @
  if (atIndex > 0) {
    parts.push(
      React.createElement(
        "span",
        { key: `text-${keyCounter++}` },
        currentText.substring(0, atIndex)
      )
    );
  }

  // Get text after @
  const afterAt = currentText.substring(atIndex + 1);

  // Try to match users
  let matchFound = false;
  for (const user of sortedUsers) {
    const username = user.username.toLowerCase();
    const textLower = afterAt.toLowerCase();

    if (textLower.startsWith(username)) {
      // Check if it's a complete word (followed by space, end of string, or punctuation)
      const nextCharIndex = username.length;
      const nextChar = afterAt[nextCharIndex];

      if (!nextChar || nextChar === " " || /[^\w]/.test(nextChar)) {
        // Match found! Highlight it
        const mentionText = "@" + afterAt.substring(0, username.length);

        parts.push(
          React.createElement(
            "span",
            {
              key: `mention-${keyCounter++}`,
              className:
                "inline-block px-1 py-0.5 rounded text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200",
            },
            mentionText
          )
        );

        // Add remaining text after mention
        const remainingText = afterAt.substring(username.length);
        if (remainingText) {
          parts.push(
            React.createElement(
              "span",
              { key: `text-${keyCounter++}` },
              remainingText
            )
          );
        }

        matchFound = true;
        break;
      }
    }
  }

  // If no match found, treat as regular text
  if (!matchFound) {
    parts.push(
      React.createElement(
        "span",
        { key: `text-${keyCounter++}` },
        currentText.substring(atIndex)
      )
    );
  }

  return React.createElement("span", null, ...parts);
};

export const extractMentionedUserIds = (
  text: string,
  allUsers: Array<{ id: number; username: string }>
): number[] => {
  const mentions = parseMentions(text);
  const mentionedIds: number[] = [];

  mentions.forEach((mention) => {
    const user = allUsers.find(
      (u) => u.username.toLowerCase() === mention.username.toLowerCase()
    );
    if (user) {
      mentionedIds.push(user.id);
    }
  });

  return mentionedIds;
};
