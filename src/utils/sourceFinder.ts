import { SourceItem, SourceType } from '../types/models';
import { splitSentences } from './textUtils';

// ------------------------------------------------------------
// Speech verbs
// ------------------------------------------------------------

const SPEECH_VERBS =
  'said|told|stated|confirmed|denied|argued|claimed|explained|' +
  'noted|added|warned|suggested|insisted|announced|revealed|' +
  'acknowledged|testified|recalled';

// ------------------------------------------------------------
// Name pattern
// Supports "Linzi B." or "Rich Thau"
// ------------------------------------------------------------

const NAME =
  '[A-Z][a-z]+(?:\\s[A-Z][a-z]+|\\s[A-Z]\\.)?';

// ------------------------------------------------------------
// Speaker detection patterns
// ------------------------------------------------------------

const NAME_SAID = new RegExp(`\\b(${NAME})\\s+(?:${SPEECH_VERBS})`, 'i');

const SAID_NAME = new RegExp(`(?:${SPEECH_VERBS})\\s+(${NAME})`, 'i');

const NAME_INTRO =
  new RegExp(`\\b(${NAME})\\s*,\\s*(?:a|an|the)\\s+[^.]{0,80}`, 'i');

const PRONOUN_SAID =
  new RegExp(`\\b(he|she|they)\\s+(?:${SPEECH_VERBS})`, 'i');

// ------------------------------------------------------------
// Quote detection
// ------------------------------------------------------------

function extractQuotes(text: string) {

  const quotes: { text: string; index: number }[] = [];

  const regex = /["“”]([\s\S]+?)["“”]/g;

  let match;

  while ((match = regex.exec(text)) !== null) {

    const q = match[1].trim();

    if (q.length < 10) continue;

    quotes.push({
      text: q,
      index: match.index
    });

  }

  return quotes;

}

// ------------------------------------------------------------
// Evidence extraction
// ------------------------------------------------------------

function buildEvidence(text: string, quoteIndex: number) {

  const start = Math.max(0, quoteIndex - 30);
  const end = Math.min(text.length, quoteIndex + 220);

  return (
    '...' +
    text.substring(start, end).trim() +
    '...'
  );

}

// ------------------------------------------------------------
// NEW: Post-quote attribution detection
// ------------------------------------------------------------

function findPostQuoteSpeaker(text: string, quoteEnd: number) {

  const window = text.substring(
    quoteEnd,
    quoteEnd + 120
  );

  const nameMatch = window.match(
    new RegExp(`(${NAME})\\s+(?:${SPEECH_VERBS})`, 'i')
  );

  if (nameMatch) return nameMatch[1];

  const pronounMatch = window.match(
    new RegExp(`\\b(he|she|they)\\s+(?:${SPEECH_VERBS})`, 'i')
  );

  if (pronounMatch) return 'PRONOUN';

  return null;

}

// ------------------------------------------------------------
// Main algorithm
// ------------------------------------------------------------

export function findSources(
  text: string
): { items: SourceItem[]; warnings: string[] } {

  const cleaned = text.trim();

  const found: SourceItem[] = [];
  const seen = new Set<string>();

  const warnings: string[] = [];

  let currentSpeaker: string | null = null;

  const paragraphs = cleaned.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {

    if (found.length >= 5) break;

    // --------------------------------------------------------
    // Detect speaker introductions
    // --------------------------------------------------------

    const intro = paragraph.match(NAME_INTRO);

    if (intro) {
      currentSpeaker = intro[1];
    }

    const speaker1 = paragraph.match(NAME_SAID);

    if (speaker1) {
      currentSpeaker = speaker1[1];
    }

    const speaker2 = paragraph.match(SAID_NAME);

    if (speaker2) {
      currentSpeaker = speaker2[1];
    }

    // --------------------------------------------------------
    // Extract quotes
    // --------------------------------------------------------

    const quotes = extractQuotes(paragraph);

    for (const quote of quotes) {

      // -----------------------------------------
      // Check for attribution AFTER the quote
      // -----------------------------------------

      const postSpeaker = findPostQuoteSpeaker(
        paragraph,
        quote.index + quote.text.length
      );

      if (postSpeaker && postSpeaker !== 'PRONOUN') {
        currentSpeaker = postSpeaker;
      }

      if (!currentSpeaker) continue;

      const name = currentSpeaker;

      const key = name.toLowerCase();

      if (seen.has(key)) continue;

      seen.add(key);

      found.push({
        source_name: name,
        source_type: 'person',
        evidence_quote: buildEvidence(cleaned, quote.index)
      });

      if (found.length >= 5) break;

    }

  }

  // ------------------------------------------------------------
  // Anonymous source detection
  // ------------------------------------------------------------

  const sentences = splitSentences(cleaned);

  const ANON_PATTERNS = [
    /officials?\s+(?:who\s+)?(?:said|say|told|confirmed)/i,
    /sources?\s+(?:familiar|close|with\s+knowledge)/i,
    /spoke\s+(?:on\s+)?condition\s+of\s+anonymity/i
  ];

  for (const sentence of sentences) {

    for (const p of ANON_PATTERNS) {

      if (p.test(sentence)) {

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

  if (found.length === 0) {

    warnings.push(
      'Quoted material was detected but could not be attributed to specific sources.'
    );

  }

  return {
    items: found,
    warnings
  };

}