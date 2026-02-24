import { SourceItem, SourceType } from '../types/models';
import { splitSentences } from './textUtils';

interface SourcePattern {
  pattern: RegExp;
  type: SourceType;
  nameExtractor: (match: RegExpMatchArray) => string;
}

const SPEECH_VERBS =
  'said|told|stated|confirmed|denied|argued|claimed|explained|noted|added|warned|suggested|insisted|announced|revealed|acknowledged|testified|recalled';

const SOURCE_PATTERNS: SourcePattern[] = [
  // "Name said" — standard pre-attribution
  {
    pattern: new RegExp(
      `(?:^|\\s)([A-Z][a-z]+ (?:[A-Z]\\. )?[A-Z][a-z]+)(?:,\\s*[^,]+,?)?\\s+(?:${SPEECH_VERBS})`
    ),
    type: 'person',
    nameExtractor: (m) => m[1],
  },
  // Post-quote attribution: `," Name said`
  {
    pattern: new RegExp(
      `[""\\u201C\\u201D]\\s*,?\\s*([A-Z][a-z]+ (?:[A-Z]\\. )?[A-Z][a-z]+)\\s+(?:${SPEECH_VERBS})`
    ),
    type: 'person',
    nameExtractor: (m) => m[1],
  },
  // Verb-before-name with quote context: `"..." said John Thune`
  {
    pattern: new RegExp(
      `[""\\u201C\\u201D].*?(?:${SPEECH_VERBS})\\s+([A-Z][a-z]+ (?:[A-Z]\\. )?[A-Z][a-z]+)`
    ),
    type: 'person',
    nameExtractor: (m) => m[1],
  },
  // Title + name: `Chief Justice Roberts`, `Sen. Thune`, `President Biden`
  {
    pattern:
      /(?:Chief Justice|Vice President|Deputy Director|Sen\.|Rep\.|President|Secretary|Director|Dr\.|Prof\.|Gov\.|Mayor|Chairman|Chairwoman|Gen\.|Adm\.|Col\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    type: 'person',
    nameExtractor: (m) => m[1],
  },
  // "according to Name"
  {
    pattern: /according to\s+([A-Z][a-z]+ (?:[A-Z]\. )?[A-Z][a-z]+)/i,
    type: 'person',
    nameExtractor: (m) => m[1],
  },
  // "according to the Department/Agency"
  {
    pattern:
      /according to\s+(?:the\s+)?([A-Z][A-Za-z\s]+(?:Department|Agency|Bureau|Commission|Institute|Organization|Association|Foundation|Center|Administration|Office|Council|Board|Authority|Service|Corps))/i,
    type: 'agency',
    nameExtractor: (m) => m[1].trim(),
  },
  // Agency + report/study
  {
    pattern:
      /(?:the\s+)?([A-Z][A-Za-z\s]+(?:Department|Agency|Bureau|Commission|Institute|University|Organization))\s+(?:report|study|data|findings|analysis|survey|assessment|investigation)/i,
    type: 'agency',
    nameExtractor: (m) => m[1].trim(),
  },
  // Legal documents
  {
    pattern:
      /((?:Senate|House)\s+Bill\s+\d+|(?:Executive\s+Order|Public\s+Law)\s+\d[\d-]*|[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+)/,
    type: 'document',
    nameExtractor: (m) => m[1],
  },
];

// Names that match person patterns but are actually organizations/publications
const NOT_PERSON_NAMES = new Set([
  'fox news', 'fox business', 'fox digital',
  'cnn digital', 'cbs news', 'abc news', 'nbc news',
  'associated press', 'the associated',
  'reuters news',
  'new york', 'los angeles', 'wall street', 'washington post',
  'supreme court', 'white house', 'united states', 'united nations',
  'close video', 'watch video',
]);

const ANONYMOUS_PATTERNS = [
  /officials?\s+(?:who\s+)?(?:said|say|told|confirmed)/i,
  /sources?\s+(?:familiar|close|with\s+knowledge)/i,
  /(?:people|individuals?|persons?)\s+(?:familiar|briefed|with\s+knowledge)/i,
  /(?:spoke|speaking)\s+(?:on\s+)?(?:condition\s+of\s+)?anonymity/i,
  /(?:asked|requesting)\s+(?:not\s+to\s+be\s+(?:named|identified))/i,
];

const BOILERPLATE_MARKERS =
  /^(?:close video|watch video|related:|advertisement|subscribe|sign up|click here|share this|getty images|ap photo)/i;

const PHOTO_CREDIT_PATTERN =
  /\([^)]*(?:Getty\s*Images|AP\s*Photo|Anadolu|AFP|Reuters|Shutterstock|iStock)[^)]*\)/gi;

export function findSources(
  text: string
): { items: SourceItem[]; warnings: string[] } {
  const sentences = splitSentences(text);
  const found: SourceItem[] = [];
  const seenNames = new Set<string>();
  const warnings: string[] = [];

  for (const sentence of sentences) {
    // Skip boilerplate/non-article content
    if (BOILERPLATE_MARKERS.test(sentence.trim())) continue;

    // Strip inline photo credits so they don't pollute matches or evidence quotes
    const cleaned = sentence.replace(PHOTO_CREDIT_PATTERN, '').trim();

    for (const pattern of SOURCE_PATTERNS) {
      const match = cleaned.match(pattern.pattern);
      if (match) {
        const name = pattern.nameExtractor(match);
        const nameLower = name.toLowerCase();

        // Skip known non-person names (organizations, publications)
        if (NOT_PERSON_NAMES.has(nameLower)) continue;

        if (!seenNames.has(nameLower)) {
          seenNames.add(nameLower);

          // Extract context around the match rather than from the sentence start
          const idx = match.index ?? 0;
          const start = Math.max(0, idx - 60);
          const end = Math.min(cleaned.length, idx + 160);
          const prefix = start > 0 ? '...' : '';
          const suffix = end < cleaned.length ? '...' : '';
          const evidence_quote =
            prefix + cleaned.substring(start, end).trim() + suffix;

          found.push({
            source_name: name,
            source_type: pattern.type,
            evidence_quote,
          });
        }
      }
    }

    for (const anonPattern of ANONYMOUS_PATTERNS) {
      if (anonPattern.test(sentence)) {
        const snippet =
          sentence.length > 100
            ? sentence.substring(0, 100) + '...'
            : sentence;
        warnings.push(
          `Anonymous or unattributed source referenced: "${snippet}"`
        );
        break;
      }
    }
  }

  const items = found.slice(0, 5);

  if (items.length === 0) {
    const hasQuotes = /[""\u201C\u201D]/.test(text);
    if (hasQuotes) {
      warnings.push(
        'Quoted material was detected but could not be attributed to specific sources.'
      );
    } else {
      warnings.push(
        'No explicitly attributed sources were identified in this article.'
      );
    }
  }

  return { items, warnings };
}
