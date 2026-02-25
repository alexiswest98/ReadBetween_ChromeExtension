import { SourceItem, SourceType } from '../types/models';
import { splitSentences } from './textUtils';

// -----------------------------------------------------------------
// Internal Types
// -----------------------------------------------------------------

interface QuoteSpan {
  quoteText: string;
  startIndex: number; // index of opening quote char in full text
  endIndex: number;   // index of closing quote char (inclusive)
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
// Name / Title Regex Pieces
// -----------------------------------------------------------------

// Allows: O'Connor, Jean-Pierre, Van Hollen, DeSantis, McCarthy
// 1 required token + 1 to 4 optional additional tokens (min 2 total)
// \b boundaries prevent partial/mid-word captures
const NAME_STR =
  `\\b([A-Z][a-zA-Z''\u2019\\-]+(?:\\s+[A-Z][a-zA-Z''\u2019\\-]+){1,4})\\b`;

const TITLE_STR =
  `(?:Chief\\s+Justice|Vice\\s+President|Deputy\\s+Director|` +
  `Sen\\.|Rep\\.|President|Secretary|Director|Dr\\.|Prof\\.|` +
  `Gov\\.|Mayor|Chairman|Chairwoman|Gen\\.|Adm\\.|Col\\.)\\s+`;

// -----------------------------------------------------------------
// Attribution Patterns (applied inside ±150-char window per quote)
// -----------------------------------------------------------------

// PAT_B: closing quote char + NAME + speech verb (most precise signal)
const PAT_B = new RegExp(
  `["\u201C\u201D]\\s*,?\\s*${NAME_STR}\\s+(?:${SPEECH_VERBS_STR})`
);

// PAT_A: NAME + optional parenthetical descriptor + speech verb
const PAT_A = new RegExp(
  `(?:^|\\s)${NAME_STR}(?:,\\s*[^,]+,?)?\\s+(?:${SPEECH_VERBS_STR})`
);

// PAT_C: speech verb + NAME
const PAT_C = new RegExp(
  `(?:${SPEECH_VERBS_STR})\\s+${NAME_STR}`
);

// PAT_E: Title + NAME — window-gated only (enforces Step 6: no standalone title matching)
const PAT_E = new RegExp(`${TITLE_STR}${NAME_STR}`);

// PAT_D: "according to [the] NAME" — used in Phase 2 window AND Phase 3 global pass.
// Uses its own name pattern with {0,3} (allows single-token names like "Biden") and
// no i flag (requires lowercase "according to" to prevent capital-A false starts).
// Optional "the" prefix: "according to the Council on Criminal Justice"
const PAT_D =
  /according\s+to\s+(?:the\s+)?([A-Z][A-Za-z''\u2019\-]+(?:\s+[A-Z][A-Za-z''\u2019\-]+){0,3})/;

// -----------------------------------------------------------------
// Full-Text Patterns (Phase 3: agency + global non-quoted attribution)
// -----------------------------------------------------------------

// PAT_F: "according to the Department/Agency/..."
const PAT_F =
  /according\s+to\s+(?:the\s+)?([A-Z][A-Za-z\s]+(?:Department|Agency|Bureau|Commission|Institute|Organization|Association|Foundation|Center|Administration|Office|Council|Board|Authority|Service|Corps))/i;

// PAT_G: AGENCY + report/study/data/...
const PAT_G =
  /(?:the\s+)?([A-Z][A-Za-z\s]+(?:Department|Agency|Bureau|Commission|Institute|University|Organization))\s+(?:report|study|data|findings|analysis|survey|assessment|investigation)/i;

// PAT_H: Legal documents (self-contained, no quote required)
const PAT_H =
  /((?:Senate|House)\s+Bill\s+\d+|(?:Executive\s+Order|Public\s+Law)\s+\d[\d-]*|[A-Z][a-z]+\s+v\.\s+[A-Z][a-z]+)/;

// -----------------------------------------------------------------
// Exclusion Sets
// -----------------------------------------------------------------

// If any lowercase token in a matched name is in this set,
// reclassify from 'person' to 'agency' (prevents "Baker Institute", etc.)
const ORG_TYPE_WORDS = new Set([
  'administration', 'university', 'institute', 'services', 'group',
  'firm', 'corporation', 'company', 'llc', 'inc', 'ltd', 'foundation',
  'association', 'organization', 'department', 'agency', 'bureau',
  'commission', 'center', 'council', 'authority', 'office', 'board',
  'committee', 'fund', 'trust', 'bank', 'holdings', 'partners', 'ventures',
  'industries', 'technologies', 'systems', 'solutions', 'international',
  'national', 'federal', 'global', 'network', 'alliance', 'coalition',
]);

// Known names that match person patterns but are actually organizations/publications
const NOT_PERSON_NAMES = new Set([
  'fox news', 'fox business', 'fox digital',
  'cnn digital', 'cbs news', 'abc news', 'nbc news',
  'associated press', 'the associated',
  'reuters news',
  'new york', 'los angeles', 'wall street', 'washington post',
  'supreme court', 'white house', 'united states', 'united nations',
  'close video', 'watch video',
]);

// Names that look like people but are known agencies/companies.
// Checked in recordCandidate to force type='agency'.
const KNOWN_AGENCIES = new Set([
  'baker hughes',
  'energy information administration',
  'council on criminal justice',
  'fbi', 'cia', 'nsa', 'doj', 'dhs', 'epa',
]);

// Single-token names accepted as people (common in political coverage).
// All other single-token matches are rejected to reduce noise.
const SINGLE_NAME_ALLOWLIST = new Set([
  'trump', 'biden', 'obama', 'clinton', 'reagan', 'bush',
  'harris', 'pence', 'pelosi', 'mcconnell', 'schumer', 'desantis',
]);

// -----------------------------------------------------------------
// Anonymous / Boilerplate Patterns (unchanged from original)
// -----------------------------------------------------------------

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

// Quoted text that starts with navigation/UI noise — skip it
const JUNK_QUOTE_PATTERN =
  /^(?:read|click|watch|subscribe|sign up|related:|advertisement|see more|learn more)/i;

// -----------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------

function isOrgName(name: string): boolean {
  return name
    .toLowerCase()
    .split(/\s+/)
    .some((token) => ORG_TYPE_WORDS.has(token));
}

function extractEvidence(
  text: string,
  matchIndex: number,
  windowBefore = 60,
  windowAfter = 160
): string {
  const start = Math.max(0, matchIndex - windowBefore);
  const end = Math.min(text.length, matchIndex + windowAfter);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return prefix + text.substring(start, end).trim() + suffix;
}

function extractQuoteSpans(text: string): QuoteSpan[] {
  const results: QuoteSpan[] = [];
  const regex = /["\u201C]([\s\S]+?)["\u201D]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const quoteText = m[1];
    if (quoteText.length < 10) continue;
    if (JUNK_QUOTE_PATTERN.test(quoteText.trim())) continue;
    results.push({
      quoteText,
      startIndex: m.index,
      endIndex: m.index + m[0].length - 1,
    });
  }
  return results;
}

// Try attribution patterns in priority order against a window substring.
// Returns the first candidate found, or null.
function tryAttributionPatterns(
  windowText: string,
  windowOffset: number
): AttributionCandidate | null {
  const patterns: Array<{ re: RegExp; type: SourceType }> = [
    { re: PAT_B, type: 'person' }, // post-quote "NAME said" — most precise
    { re: PAT_A, type: 'person' }, // "NAME said" pre-attribution
    { re: PAT_C, type: 'person' }, // "said NAME"
    { re: PAT_E, type: 'person' }, // "Title NAME" — window-gated only
    { re: PAT_D, type: 'person' }, // "according to NAME"
  ];

  for (const { re, type } of patterns) {
    const m = windowText.match(re);
    if (m && m[1]) {
      const name = m[1].trim();
      const nameLower = name.toLowerCase();
      if (NOT_PERSON_NAMES.has(nameLower)) continue;
      if (BOILERPLATE_MARKERS.test(name)) continue;
      // Reject single-token matches — too noisy (e.g. "Council", "Administration")
      // unless the name is a well-known single-name figure
      if (name.split(/\s+/).length === 1 && !SINGLE_NAME_ALLOWLIST.has(nameLower)) continue;
      // Reject names containing possessive tokens (e.g. "Trump's", "NPR's")
      // apostrophe-s signals ownership, not a person/agency name
      if (name.split(/\s+/).some(t => /[''\u2019]s$/i.test(t))) continue;

      // Reclassify org-sounding names (e.g. "Baker Institute") as agency
      const resolvedType: SourceType =
        type === 'person' && isOrgName(name) ? 'agency' : type;

      return {
        name,
        type: resolvedType,
        matchIndexInFullText: windowOffset + (m.index ?? 0),
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
  const cleaned = text.replace(PHOTO_CREDIT_PATTERN, '').trim();

  const found: SourceItem[] = [];
  const seenNames = new Set<string>();
  const warnings: string[] = [];

  function recordCandidate(
    name: string,
    type: SourceType,
    evidenceIndex: number,
    quoteAnchorStart?: number
  ): void {
    const nameLower = name.toLowerCase();
    if (seenNames.has(nameLower)) return;
    if (NOT_PERSON_NAMES.has(nameLower)) return;
    seenNames.add(nameLower);

    // Known companies/agencies that regex can't infer from name tokens alone
    const resolvedType: SourceType = KNOWN_AGENCIES.has(nameLower) ? 'agency' : type;

    let evidence_quote: string;
    if (quoteAnchorStart !== undefined) {
      // Evidence starts at the opening quote and extends forward
      const end = Math.min(cleaned.length, quoteAnchorStart + 200);
      const suffix = end < cleaned.length ? '...' : '';
      evidence_quote = cleaned.substring(quoteAnchorStart, end).trim() + suffix;
    } else {
      evidence_quote = extractEvidence(cleaned, evidenceIndex);
    }

    found.push({ source_name: name, source_type: resolvedType, evidence_quote });
  }

  // ------------------------------------------------------------------
  // Phase 1 + 2: Extract quotes, then search attribution window per quote
  // ------------------------------------------------------------------
  const quoteSpans = extractQuoteSpans(cleaned);

  for (const span of quoteSpans) {
    if (found.length >= 5) break;

    const windowStart = Math.max(0, span.startIndex - 150);
    const windowEnd = Math.min(cleaned.length, span.endIndex + 150);
    const windowText = cleaned.substring(windowStart, windowEnd);

    const candidate = tryAttributionPatterns(windowText, windowStart);
    if (candidate) {
      recordCandidate(
        candidate.name,
        candidate.type,
        candidate.matchIndexInFullText,
        span.startIndex // quote-anchored evidence
      );
    }
  }

  // ------------------------------------------------------------------
  // Phase 3: Quote-free global pass — "according to NAME/AGENCY", AGENCY report
  // ------------------------------------------------------------------
  if (found.length < 5) {
    // "according to NAME" — person (or agency if org-sounding)
    const reD = new RegExp(PAT_D.source, 'g');
    let mD: RegExpExecArray | null;
    while (found.length < 5 && (mD = reD.exec(cleaned)) !== null) {
      const name = (mD[1] ?? '').trim();
      if (!name) continue;
      const type: SourceType = isOrgName(name) ? 'agency' : 'person';
      recordCandidate(name, type, mD.index);
    }

    // "according to the Department/Agency"
    const reF = new RegExp(PAT_F.source, 'gi');
    let mF: RegExpExecArray | null;
    while (found.length < 5 && (mF = reF.exec(cleaned)) !== null) {
      const name = (mF[1] ?? '').trim();
      if (!name) continue;
      recordCandidate(name, 'agency', mF.index);
    }

    // "AGENCY report/study/data"
    const reG = new RegExp(PAT_G.source, 'gi');
    let mG: RegExpExecArray | null;
    while (found.length < 5 && (mG = reG.exec(cleaned)) !== null) {
      const name = (mG[1] ?? '').trim();
      if (!name) continue;
      recordCandidate(name, 'agency', mG.index);
    }
  }

  // ------------------------------------------------------------------
  // Phase 4: Legal document patterns (no quote required)
  // ------------------------------------------------------------------
  if (found.length < 5) {
    const reH = new RegExp(PAT_H.source, 'g');
    let mH: RegExpExecArray | null;
    while (found.length < 5 && (mH = reH.exec(cleaned)) !== null) {
      const name = (mH[1] ?? '').trim();
      if (!name) continue;
      recordCandidate(name, 'document', mH.index);
    }
  }

  // ------------------------------------------------------------------
  // Phase 5: Anonymous source warnings (sentence-level scan)
  // ------------------------------------------------------------------
  const sentences = splitSentences(cleaned);
  for (const sentence of sentences) {
    for (const anonPattern of ANONYMOUS_PATTERNS) {
      if (anonPattern.test(sentence)) {
        const snippet =
          sentence.length > 100 ? sentence.substring(0, 100) + '...' : sentence;
        warnings.push(
          `Anonymous or unattributed source referenced: "${snippet}"`
        );
        break;
      }
    }
  }

  // ------------------------------------------------------------------
  // Phase 6: Cap at 5, fallback warnings
  // ------------------------------------------------------------------
  const items = found.slice(0, 5);

  if (items.length === 0) {
    const hasQuotes = /[""\u201C\u201D]/.test(cleaned);
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
