import { SourceItem } from '../types/models';

// ─────────────────────────────────────────────────────────────
// Speech verbs (used across all attribution patterns)
// ─────────────────────────────────────────────────────────────
const SPEECH_VERBS =
  'said|told|asked|stated|confirmed|denied|argued|claimed|explained|' +
  'noted|added|warned|suggested|insisted|announced|revealed|' +
  'acknowledged|testified|recalled|wrote|reported';

// ─────────────────────────────────────────────────────────────
// Name patterns
// Supports:
// - Michael Pearce
// - Linzi B.
// - Jean-Pierre
// - O'Brien
// ─────────────────────────────────────────────────────────────
const NAME_TOK = "[A-Z][a-zA-Z'\\u2019\\-]+";
const NAME_INIT = '[A-Z]\\.';

const NAME_PAT =
  `((?:${NAME_TOK}|${NAME_INIT})(?:\\s+(?:${NAME_TOK}|${NAME_INIT})){0,3})`;

// ─────────────────────────────────────────────────────────────
// Attribution patterns
// ─────────────────────────────────────────────────────────────

// "Michael Pearce said"
const NAME_SAID_RE = new RegExp(
  `\\b${NAME_PAT}\\s+(?:${SPEECH_VERBS})\\b`
);

// "said Michael Pearce"
const SAID_NAME_RE = new RegExp(
  `(?:${SPEECH_VERBS})\\s+${NAME_PAT}`
);

// Pronoun attribution ("he said")
const PRONOUN_SAID_RE = new RegExp(
  `\\b(he|she|they)\\s+(?:${SPEECH_VERBS})\\b`,
  'i'
);

// ─────────────────────────────────────────────────────────────
// Invalid tokens (prevents "Several voters", "Monday", etc.)
// ─────────────────────────────────────────────────────────────
const INVALID_TOKENS = new Set([
  'he', 'she', 'they', 'it', 'we', 'i', 'you',
  'several', 'many', 'some', 'most', 'all',
  'voters', 'participants', 'people',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]);

// ─────────────────────────────────────────────────────────────
// Validate detected name
// ─────────────────────────────────────────────────────────────
function isValidName(name: string): boolean {

  if (!name || name.length < 2) return false;

  const tokens = name.trim().split(/\s+/);

  if (tokens.length > 5) return false;

  for (const tok of tokens) {

    if (!/^[A-Z]/.test(tok)) return false;

    const lower = tok.replace(/\.$/, '').toLowerCase();

    if (INVALID_TOKENS.has(lower)) return false;

  }

  return true;

}

// ─────────────────────────────────────────────────────────────
// Extract only REAL quotes (filters out URLs etc.)
// ─────────────────────────────────────────────────────────────
function extractQuotes(para: string) {

  const results: { text: string; endIndex: number }[] = [];

  const re = /["\u201C]([\s\S]+?)["\u201D]/g;

  let m: RegExpExecArray | null;

  while ((m = re.exec(para)) !== null) {

    const q = m[1].trim();

    // Filter garbage like embeds / URLs
    if (q.length < 15) continue;
    if (/https?:\/\//.test(q)) continue;

    results.push({
      text: q,
      endIndex: m.index + m[0].length
    });

  }

  return results;

}

// ─────────────────────────────────────────────────────────────
// CORE FIX: Find speaker NEAR the quote
// This replaces paragraph-level guessing
// ─────────────────────────────────────────────────────────────
function findSpeakerNearQuote(
  para: string,
  quoteEnd: number
): string | null {

  const before = para.substring(
    Math.max(0, quoteEnd - 150),
    quoteEnd
  );

  const after = para.substring(
    quoteEnd,
    quoteEnd + 250
  );

  let m;

  // "Michael Pearce said"
  m = NAME_SAID_RE.exec(before);
  if (m && isValidName(m[1])) return m[1].trim();

  // "said Michael Pearce"
  m = SAID_NAME_RE.exec(before);
  if (m && isValidName(m[1])) return m[1].trim();

  // "...," Michael Pearce said
  m = NAME_SAID_RE.exec(after);
  if (m && isValidName(m[1])) return m[1].trim();

  // Pronoun attribution fallback (he said / she said)
  m = PRONOUN_SAID_RE.exec(after);
  if (m) return '__PRONOUN__';

  return null;

}

// ─────────────────────────────────────────────────────────────
// Main function
// ─────────────────────────────────────────────────────────────
export function findSources(text: string) {

  const paragraphs = text
    .trim()
    .split(/\n\s*\n/)
    .filter(p => p.length > 20);

  const found: SourceItem[] = [];
  const seen = new Set<string>();
  const warnings: string[] = [];

  for (const para of paragraphs) {

    if (found.length >= 5) break;

    const quotes = extractQuotes(para);

    if (quotes.length === 0) continue;

    // Track last valid speaker within this paragraph
    let paragraphSpeaker: string | null = null;

    for (const q of quotes) {

      // Try to find speaker near THIS quote
      let speaker = findSpeakerNearQuote(para, q.endIndex);

      // FIX 1: Handle pronoun attribution ("he said")
      if (speaker === '__PRONOUN__' && paragraphSpeaker) {
        speaker = paragraphSpeaker;
      }

      // If we found a valid speaker, lock it in
      if (speaker && isValidName(speaker)) {
        paragraphSpeaker = speaker;
      }

      // Reuse previous speaker if none found
      if (!speaker && paragraphSpeaker) {
        speaker = paragraphSpeaker;
      }

      // Still no usable speaker → skip (KEEP THIS)
      if (!speaker) continue;

      // Invalid name → skip (KEEP THIS)
      if (!isValidName(speaker)) continue;

      const key = speaker.toLowerCase();

      if (seen.has(key)) continue;

      seen.add(key);

      found.push({
        source_name: speaker,
        source_type: 'person',
        evidence_quote: `“${q.text}”`
      });

      if (found.length >= 5) break;

    }
  }

  if (found.length === 0) {
    warnings.push(
      'Quotes detected but no clear speakers identified.'
    );
  }

  return {
    items: found,
    warnings
  };

}