import { SourceItem, SourceType } from '../types/models';
import { splitSentences } from './textUtils';

interface SourcePattern {
  pattern: RegExp;
  type: SourceType;
  nameExtractor: (match: RegExpMatchArray) => string;
}

const SOURCE_PATTERNS: SourcePattern[] = [
  {
    pattern:
      /(?:^|\s)([A-Z][a-z]+ (?:[A-Z]\. )?[A-Z][a-z]+)(?:,\s*[^,]+,?)?\s+(?:said|told|stated|confirmed|denied|argued|claimed|explained|noted|added|warned|suggested|insisted|announced|revealed|acknowledged|testified|recalled)/,
    type: 'person',
    nameExtractor: (m) => m[1],
  },
  {
    pattern: /according to\s+([A-Z][a-z]+ (?:[A-Z]\. )?[A-Z][a-z]+)/i,
    type: 'person',
    nameExtractor: (m) => m[1],
  },
  {
    pattern:
      /according to\s+(?:the\s+)?([A-Z][A-Za-z\s]+(?:Department|Agency|Bureau|Commission|Institute|Organization|Association|Foundation|Center|Administration|Office|Council|Board|Authority|Service|Corps))/i,
    type: 'agency',
    nameExtractor: (m) => m[1].trim(),
  },
  {
    pattern:
      /(?:the\s+)?([A-Z][A-Za-z\s]+(?:Department|Agency|Bureau|Commission|Institute|University|Organization))\s+(?:report|study|data|findings|analysis|survey|assessment|investigation)/i,
    type: 'agency',
    nameExtractor: (m) => m[1].trim(),
  },
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

  const items = found.slice(0, 3);

  if (items.length === 0) {
    warnings.push(
      'No explicitly attributed sources were identified in this article.'
    );
  }

  return { items, warnings };
}
