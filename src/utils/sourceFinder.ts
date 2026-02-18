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
  // Post-quote attribution: `," Name said` or `," said Name`
  {
    pattern: new RegExp(
      `[""\\u201C\\u201D]\\s*,?\\s*([A-Z][a-z]+ (?:[A-Z]\\. )?[A-Z][a-z]+)\\s+(?:${SPEECH_VERBS})`
    ),
    type: 'person',
    nameExtractor: (m) => m[1],
  },
  // Verb-before-name: `said John Thune`
  {
    pattern: new RegExp(
      `(?:${SPEECH_VERBS})\\s+([A-Z][a-z]+ (?:[A-Z]\\. )?[A-Z][a-z]+)`
    ),
    type: 'person',
    nameExtractor: (m) => m[1],
  },
  // Title + name: `Sen. Thune`, `President Biden`
  {
    pattern:
      /(?:Sen\.|Rep\.|President|Secretary|Director|Dr\.|Prof\.|Gov\.|Mayor|Chief|Chairman|Chairwoman|Gen\.|Adm\.|Col\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
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

const ANONYMOUS_PATTERNS = [
  /officials?\s+(?:who\s+)?(?:said|say|told|confirmed)/i,
  /sources?\s+(?:familiar|close|with\s+knowledge)/i,
  /(?:people|individuals?|persons?)\s+(?:familiar|briefed|with\s+knowledge)/i,
  /(?:spoke|speaking)\s+(?:on\s+)?(?:condition\s+of\s+)?anonymity/i,
  /(?:asked|requesting)\s+(?:not\s+to\s+be\s+(?:named|identified))/i,
];

export function findSources(
  text: string
): { items: SourceItem[]; warnings: string[] } {
  const sentences = splitSentences(text);
  const found: SourceItem[] = [];
  const seenNames = new Set<string>();
  const warnings: string[] = [];

  for (const sentence of sentences) {
    for (const pattern of SOURCE_PATTERNS) {
      const match = sentence.match(pattern.pattern);
      if (match) {
        const name = pattern.nameExtractor(match);
        if (!seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase());
          found.push({
            source_name: name,
            source_type: pattern.type,
            evidence_quote:
              sentence.length > 200
                ? sentence.substring(0, 200) + '...'
                : sentence,
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
