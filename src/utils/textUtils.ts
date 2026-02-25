const WORDS_PER_MINUTE = 200;

export function calculateReadingTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
  if (minutes < 1) return '< 1 min read';
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function splitSentences(text: string): string[] {
  const ABBREV = '\x01'; // placeholder for abbreviation periods (not sentence ends)
  const DELIM  = '\x02'; // sentence boundary marker

  const masked = text
    // Titles and common abbreviations whose period is NOT a sentence end
    .replace(
      /\b(Dr|Mr|Mrs|Ms|Prof|Sen|Rep|Gov|Gen|Adm|Col|Lt|Sgt|Pvt|Capt|Jr|Sr|St|vs|etc|No|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Ave|Blvd|Rd)\./gi,
      '$1' + ABBREV
    )
    // Single uppercase initial before a space: "J. Smith", "U.S. News", "D.C. Circuit"
    .replace(/\b([A-Z])\.(?=\s)/g, '$1' + ABBREV);

  return masked
    // Mark real sentence boundaries: . ! ? followed by whitespace then uppercase
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1' + DELIM)
    .split(DELIM)
    .map(s => s.replace(/\x01/g, '.').trim())
    .filter(s => s.length > 10);
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
