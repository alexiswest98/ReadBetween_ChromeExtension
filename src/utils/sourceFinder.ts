import { SourceItem } from '../types/models';
import { splitSentences } from './textUtils';

const SPEECH_VERBS =
  'said|told|stated|confirmed|denied|argued|claimed|explained|' +
  'noted|added|warned|suggested|insisted|announced|revealed|' +
  'acknowledged|testified|recalled';

const NAME =
  '[A-Z][a-z]+(?:\\s[A-Z][a-z]+|\\s[A-Z]\\.)?';

const NAME_SAID = new RegExp(`\\b(${NAME})\\s+(?:${SPEECH_VERBS})`, 'i');

const SAID_NAME = new RegExp(`(?:${SPEECH_VERBS})\\s+(${NAME})`, 'i');

const NAME_INTRO =
  new RegExp(`\\b(${NAME})\\s*,\\s*(?:a|an|the)\\s+[^.]{0,80}`, 'i');

const PRONOUN_SAID =
  new RegExp(`\\b(he|she|they)\\s+(?:${SPEECH_VERBS})`, 'i');

const GROUP_WORDS = [
  'Several',
  'Many',
  'Some',
  'Participants',
  'Voters'
];

const CONJUNCTIONS = [
  'But',
  'And',
  'So',
  'Then'
];

// --------------------------------------------
// Clean speaker name
// --------------------------------------------

function cleanSpeaker(name: string) {

  const parts = name.trim().split(' ');

  if (CONJUNCTIONS.includes(parts[0])) {
    parts.shift();
  }

  return parts.join(' ');

}

// --------------------------------------------
// Reject invalid speakers
// --------------------------------------------

function isValidSpeaker(name: string) {

  if (!name) return false;

  if (GROUP_WORDS.includes(name)) return false;

  if (name.length < 2) return false;

  return true;

}

// --------------------------------------------
// Quote extraction
// --------------------------------------------

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

// --------------------------------------------
// Evidence builder
// --------------------------------------------

function buildEvidence(text: string, quoteIndex: number) {

  const start = Math.max(0, quoteIndex - 40);
  const end = Math.min(text.length, quoteIndex + 220);

  return '...' + text.substring(start, end).trim() + '...';

}

// --------------------------------------------
// Post quote attribution
// --------------------------------------------

function findPostQuoteSpeaker(text: string, quoteEnd: number) {

  const window = text.substring(
    quoteEnd,
    quoteEnd + 120
  );

  const nameMatch = window.match(
    new RegExp(`(${NAME})\\s+(?:${SPEECH_VERBS})`, 'i')
  );

  if (nameMatch) return cleanSpeaker(nameMatch[1]);

  return null;

}

// --------------------------------------------
// Main function
// --------------------------------------------

export function findSources(text: string) {

  const cleaned = text.trim();

  const found: SourceItem[] = [];
  const seen = new Set<string>();
  const warnings: string[] = [];

  let currentSpeaker: string | null = null;

  const paragraphs = cleaned.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {

    const intro = paragraph.match(NAME_INTRO);
    if (intro) currentSpeaker = cleanSpeaker(intro[1]);

    const speaker1 = paragraph.match(NAME_SAID);
    if (speaker1) currentSpeaker = cleanSpeaker(speaker1[1]);

    const speaker2 = paragraph.match(SAID_NAME);
    if (speaker2) currentSpeaker = cleanSpeaker(speaker2[1]);

    const quotes = extractQuotes(paragraph);

    for (const quote of quotes) {

      const postSpeaker = findPostQuoteSpeaker(
        paragraph,
        quote.index + quote.text.length
      );

      if (postSpeaker) currentSpeaker = postSpeaker;

      if (!currentSpeaker) continue;

      if (!isValidSpeaker(currentSpeaker)) continue;

      const key = currentSpeaker.toLowerCase();

      if (seen.has(key)) continue;

      seen.add(key);

      found.push({
        source_name: currentSpeaker,
        source_type: 'person',
        evidence_quote: buildEvidence(cleaned, quote.index)
      });

      if (found.length >= 5) break;

    }

    if (found.length >= 5) break;

  }

  if (found.length === 0) {
    warnings.push(
      'Quoted material detected but no clear speakers identified.'
    );
  }

  return {
    items: found,
    warnings
  };

}