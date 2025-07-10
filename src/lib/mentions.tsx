interface Mention {
  id: number;
  username: string;
  startIndex: number;
  endIndex: number;
}

export const parseMentions = (text: string): Mention[] => {
  const mentions: Mention[] = [];
  const mentionRegex = /@(\w+)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      id: 0, // Will be resolved later with actual user data
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  return mentions;
};

export const highlightMentions = ({ text }: { text: string }) => {
  const mentions = parseMentions(text);
  
  if (mentions.length === 0) {
    return <span>{text}</span>;
  }

  const parts = [];
  let lastIndex = 0;

  mentions.forEach((mention, index) => {
    // Add text before mention
    if (mention.startIndex > lastIndex) {
      parts.push(
        <span key={`text-${index}`}>
          {text.substring(lastIndex, mention.startIndex)}
        </span>
      );
    }

    // Add highlighted mention
    const mentionText = text.substring(mention.startIndex, mention.endIndex);
    
    parts.push(
      <span
        key={`mention-${index}`}
        className="inline-block px-1 py-0.5 rounded text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
      >
        {mentionText}
      </span>
    );

    lastIndex = mention.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end">
        {text.substring(lastIndex)}
      </span>
    );
  }

  return <span>{parts}</span>;
};

export const extractMentionedUserIds = (text: string, allUsers: Array<{id: number, username: string}>): number[] => {
  const mentions = parseMentions(text);
  const mentionedIds: number[] = [];

  mentions.forEach(mention => {
    const user = allUsers.find(u => 
      u.username.toLowerCase() === mention.username.toLowerCase()
    );
    if (user) {
      mentionedIds.push(user.id);
    }
  });

  return mentionedIds;
};
