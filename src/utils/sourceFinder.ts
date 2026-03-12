import { SourceItem, SourceType } from '../types/models';
import { splitSentences } from './textUtils';

// -----------------------------------------------------------------
// Internal Types
// -----------------------------------------------------------------

interface QuoteSpan {
  quoteText: string;
  startIndex: number;
  endIndex: number;
}

interface AttributionCandidate {
  name: string;
  type: SourceType;
  matchIndexInFullText: number;
}

// -----------------------------------------------------------------
// Speech Verbs
// -----------------------------------------------------------------

const SPEECH_VERBS_STR =
  'said|told|stated|confirmed|denied|argued|claimed|explained|' +
  'noted|added|warned|suggested|insisted|announced|revealed|' +
  'acknowledged|testified|recalled';

// -----------------------------------------------------------------
// Name Regex (UPDATED: supports last initials)
// -----------------------------------------------------------------

const NAME_STR =
  `\\b([A-Z][a-zA-Z''\u2019\\-]+(?:\\s(?:[A-Z]\\.|[A-Z][a-zA-Z''\u2019\\-]+)){0,3})\\b`;

// -----------------------------------------------------------------
// Title Regex
// -----------------------------------------------------------------

const TITLE_STR =
  `(?:Chief\\s+Justice|Vice\\s+President|Deputy\\s+Director|` +
  `Sen\\.|Rep\\.|President|Secretary|Director|Dr\\.|Prof\\.|` +
  `Gov\\.|Mayor|Chairman|Chairwoman|Gen\\.|Adm\\.|Col\\.)\\s+`;

// -----------------------------------------------------------------
// Attribution Patterns
// -----------------------------------------------------------------

const PAT_B = new RegExp(
  `["\u201C\u201D]\\s*,?\\s*${NAME_STR}\\s+(?:${SPEECH_VERBS_STR})`
);

const PAT_A = new RegExp(
  `(?:^|\\s)${NAME_STR}(?:,\\s*[^,]+,?)?\\s+(?:${SPEECH_VERBS_STR})`
);

const PAT_C = new RegExp(
  `(?:${SPEECH_VERBS_STR})\\s+${NAME_STR}`
);

const PAT_E = new RegExp(`${TITLE_STR}${NAME_STR}`);

const PAT_D =
  /according\s+to\s+(?:the\s+)?([A-Z][A-Za-z''\u2019\-]+(?:\s+[A-Z][A-Za-z''\u2019\-]+){0,3})/;

// NEW: pronoun attribution
const PAT_PRONOUN = new RegExp(
  `\\b(he|she|they)\\s+(?:${SPEECH_VERBS_STR})`,
  'i'
);

// NEW: paragraph introduction pattern
const SPEAKER_INTRO =
  /\b([A-Z][a-z]+(?:\s[A-Z]\.)?)\s*,\s*(?:a|an|the)\s+[^.]{0,80}/;

// -----------------------------------------------------------------
// Quote Detection (IMPROVED)
// -----------------------------------------------------------------

function extractQuoteSpans(text: string): QuoteSpan[] {

  const results: QuoteSpan[] = [];

  const regex = /["“”]([\s\S]+?)["“”]/g;

  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {

    const quoteText = m[1];

    if (quoteText.length < 10) continue;

    results.push({
      quoteText,
      startIndex: m.index,
      endIndex: m.index + m[0].length - 1
    });

  }

  return results;
}

// -----------------------------------------------------------------
// Attribution Pattern Matcher
// -----------------------------------------------------------------

function tryAttributionPatterns(
  windowText: string,
  windowOffset: number
): AttributionCandidate | null {

  const patterns: Array<{ re: RegExp; type: SourceType }> = [
    { re: PAT_B, type: 'person' },
    { re: PAT_A, type: 'person' },
    { re: PAT_C, type: 'person' },
    { re: PAT_E, type: 'person' },
    { re: PAT_D, type: 'person' }
  ];

  for (const { re, type } of patterns) {

    const m = windowText.match(re);

    if (m && m[1]) {

      return {
        name: m[1].trim(),
        type,
        matchIndexInFullText: windowOffset + (m.index ?? 0)
      };

    }

  }

  return null;
}

// -----------------------------------------------------------------
// Main Export
// -----------------------------------------------------------------

export function findSources(
  text: string
): { items: SourceItem[]; warnings: string[] } {

  const cleaned = text.trim();

  const found: SourceItem[] = [];
  const seenNames = new Set<string>();
  const warnings: string[] = [];

  // NEW: paragraph speaker memory
  let currentSpeaker: string | null = null;

  function recordCandidate(
    name: string,
    type: SourceType,
    evidenceIndex: number
  ) {

    const key = name.toLowerCase();

    if (seenNames.has(key)) return;

    seenNames.add(key);

    const snippetStart = Math.max(0, evidenceIndex - 60);
    const snippetEnd = Math.min(cleaned.length, evidenceIndex + 160);

    const evidence_quote =
      '...' +
      cleaned.substring(snippetStart, snippetEnd).trim() +
      '...';

    found.push({
      source_name: name,
      source_type: type,
      evidence_quote
    });

  }

  // -----------------------------------------------------------------
  // Paragraph Processing (NEW CORE LOGIC)
  // -----------------------------------------------------------------

  const paragraphs = cleaned.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {

    if (found.length >= 5) break;

    // detect speaker introduction
    const introMatch = paragraph.match(SPEAKER_INTRO);

    if (introMatch) {
      currentSpeaker = introMatch[1];
    }

    const quotes = extractQuoteSpans(paragraph);

    for (const quote of quotes) {

      if (found.length >= 5) break;

      const quoteStart = cleaned.indexOf(quote.quoteText);

      const windowStart = Math.max(0, quoteStart - 150);
      const windowEnd = Math.min(cleaned.length, quoteStart + 150);

      const windowText = cleaned.substring(windowStart, windowEnd);

      const candidate = tryAttributionPatterns(windowText, windowStart);

      if (candidate) {

        recordCandidate(
          candidate.name,
          candidate.type,
          candidate.matchIndexInFullText
        );

        continue;

      }

      // pronoun attribution fallback
      const pronounMatch = windowText.match(PAT_PRONOUN);

      if (pronounMatch && currentSpeaker) {

        recordCandidate(
          currentSpeaker,
          'person',
          quoteStart
        );

      }

    }

  }

  // -----------------------------------------------------------------
  // Anonymous detection (unchanged)
  // -----------------------------------------------------------------

  const sentences = splitSentences(cleaned);

  const ANONYMOUS_PATTERNS = [
    /officials?\s+(?:who\s+)?(?:said|say|told|confirmed)/i,
    /sources?\s+(?:familiar|close|with\s+knowledge)/i,
    /(?:spoke|speaking)\s+(?:on\s+)?(?:condition\s+of\s+)?anonymity/i
  ];

  for (const sentence of sentences) {

    for (const anonPattern of ANONYMOUS_PATTERNS) {

      if (anonPattern.test(sentence)) {

        warnings.push(
          `Anonymous or unattributed source referenced: "${sentence.slice(
            0,
            100
          )}..."`
        );

        break;

      }

    }

  }

  // -----------------------------------------------------------------
  // Final output
  // -----------------------------------------------------------------

  const items = found.slice(0, 5);

  if (items.length === 0) {

    warnings.push(
      'No explicitly attributed sources were identified in this article.'
    );

  }

  return { items, warnings };

}
