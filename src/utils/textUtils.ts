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
  const sentences = text.match(/[^.!?]*[.!?]+[\s]*/g) || [];
  return sentences.map((s) => s.trim()).filter((s) => s.length > 10);
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
