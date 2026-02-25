// Matches paragraph-opening phrases that are navigation, ads, or teaser links —
// not article prose. "read\s+" catches any "Read X" directive (publisher-agnostic).
const BOILERPLATE_PATTERN =
  /^(?:menu|home|subscribe|sign in|log in|log out|share|tweet|email|read\s+|related:|you might also like|more from|recommended|advertisement|sponsored|ad choices|©|\d+ comments?|leave a comment|tags?:|topics?:|filed under|skip to|navigation|breadcrumb|print|save|bookmark|watch\s+|listen\s+to|see\s+also|photo\s*(?:by|credit)|image\s*(?:by|credit)|file\s+photo|courtesy\s+of)/i;

// Short paragraphs with no quoted speech that end with a news dateline are almost
// certainly photo captions, not article body text.
const PHOTO_CAPTION_PATTERN =
  /,\s+on\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}/i;

export function preprocessArticle(text: string, maxChars = 15000): string {
  // Split into paragraphs
  let paragraphs = text.split(/\n{2,}/);

  const seenParagraphs = new Set<string>();

  paragraphs = paragraphs.filter((p) => {
    const trimmed = p.trim();

    // Drop very short fragments
    if (trimmed.length < 20) return false;

    // Drop nav/footer boilerplate
    if (BOILERPLATE_PATTERN.test(trimmed)) return false;

    // Drop likely photo captions: short, no quoted speech, ends with a news dateline
    if (
      trimmed.length < 250 &&
      !/[""\u201C\u201D]/.test(trimmed) &&
      PHOTO_CAPTION_PATTERN.test(trimmed)
    ) return false;

    // Deduplicate (normalize whitespace + lowercase)
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
    if (seenParagraphs.has(normalized)) return false;
    seenParagraphs.add(normalized);

    return true;
  });

  // Normalize whitespace within each paragraph
  const cleaned = paragraphs
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .join('\n\n');

  if (cleaned.length <= maxChars) return cleaned;

  // Trim to maxChars, cutting at a paragraph boundary where possible
  const truncated = cleaned.substring(0, maxChars);
  const lastBreak = truncated.lastIndexOf('\n\n');
  return lastBreak > maxChars * 0.8
    ? truncated.substring(0, lastBreak)
    : truncated;
}
