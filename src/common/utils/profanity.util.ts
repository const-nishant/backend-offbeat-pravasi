const BLOCKED_WORDS = [
  'spam',
  'scam',
  'fraud',
  'abuse',
  'hate',
  'violence',
  'explicit',
  'obscene',
];

const BLOCKED_PATTERNS = [
  /\b(\d{10,})\b/g,
  /https?:\/\/(?:www\.)?(?:bit\.ly|tinyurl|shorturl)\/\S+/gi,
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((word) =>
    new RegExp(`\\b${word}\\b`, 'i').test(lower),
  );
}

export function containsSuspiciousContent(text: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

export function moderateContent(text: string): {
  flagged: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (containsProfanity(text)) {
    reasons.push('contains_profanity');
  }

  if (containsSuspiciousContent(text)) {
    reasons.push('contains_suspicious_content');
  }

  return {
    flagged: reasons.length > 0,
    reasons,
  };
}
