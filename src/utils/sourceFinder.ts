import { SourceItem } from '../types/models';

// ── Speech verbs ──────────────────────────────────────────────────────────────
const SPEECH_VERBS =
  'said|told|stated|confirmed|denied|argued|claimed|explained|' +
  'noted|added|warned|suggested|insisted|announced|revealed|' +
  'acknowledged|testified|recalled|wrote|reported';

// ── Name patterns (NO 'i' flag — Title Case enforced) ────────────────────────
// Capitalized name token: allows O'Brien, Jean-Pierre
const NAME_TOK = "[A-Z][a-zA-Z''\\u2019\\-]+";
// Single uppercase initial: "B." in "Linzi B."
const NAME_INIT = '[A-Z]\\.';
// Full name: 1–4 proper tokens
const NAME_PAT =
  `((?:${NAME_TOK}|${NAME_INIT})(?:\\s+(?:${NAME_TOK}|${NAME_INIT})){0,3})`;

// "Rich Thau said" — immediately adjacent, no 'i' flag
const NAME_SAID_RE = new RegExp(`\\b${NAME_PAT}\\s+(?:${SPEECH_VERBS})\\b`);

// "Rich Thau, president of Engagious, said" — name then comma-separated desc then verb
// Dot in .{1,120}? matches everything except newline, handles abbreviations safely
const INTRO_SAID_RE = new RegExp(
  `\\b${NAME_PAT}\\s*,.{1,120}?(?:${SPEECH_VERBS})\\b`
);

// Post-quote: `," Rich Thau said` — text immediately after closing quote
const POST_QUOTE_RE = new RegExp(
  `^["\u201D,\\s]+${NAME_PAT}\\s+(?:${SPEECH_VERBS})\\b`
);

// Intro without speech verb: "Gina S., a 41-year-old Republican"
// Used to track who was introduced in the previous paragraph
const NAME_INTRO_RE = new RegExp(
  `\\b${NAME_PAT}\\s*,\\s*(?:a|an|the|president|director|senator|` +
  `representative|founder|chairman|ceo|professor|dr\\.?|executive)\\b`,
  'i'
);

// Pronoun attribution — case-insensitive, resolved via look-back
const PRONOUN_SAID_RE = new RegExp(
  `\\b(he|she|they)\\s+(?:${SPEECH_VERBS})\\b`,
  'i'
);

// ── Invalid name tokens ───────────────────────────────────────────────────────
const INVALID_TOKENS = new Set([
  'he','she','they','it','we','i','you','who','that','this',
  'those','these','what','which','there','here',
  'several','many','some','most','all','any','both','few','more',
  'other','others',
  'but','and','so','then','while','however','still','also',
  'voters','participants','members','officials','lawmakers',
  'people','adults','children','families','groups','nations',
  'new','old','first','last','next','same',
  'u','s','d','c',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function extractQuotes(
  para: string
): Array<{ text: string; endIndex: number }> {
  const results: Array<{ text: string; endIndex: number }> = [];
  const re = /["\u201C]([\s\S]+?)["\u201D]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(para)) !== null) {
    const q = m[1].trim();
    if (q.length >= 10) {
      results.push({ text: q, endIndex: m.index + m[0].length });
    }
  }
  return results;
}

// Named speaker via direct or intro attribution
function findNamedSpeaker(para: string): string | null {
  const m1 = NAME_SAID_RE.exec(para);
  if (m1 && isValidName(m1[1])) return m1[1].trim();
  const m2 = INTRO_SAID_RE.exec(para);
  if (m2 && isValidName(m2[1])) return m2[1].trim();
  return null;
}

// Named speaker immediately after a closing quote
function findPostQuoteSpeaker(para: string, quoteEnd: number): string | null {
  const after = para.substring(quoteEnd, quoteEnd + 100);
  const m = POST_QUOTE_RE.exec(after);
  if (m && isValidName(m[1])) return m[1].trim();
  return null;
}

// Best name introduced in a paragraph — for pronoun look-back
function findIntroducedName(para: string): string | null {
  const m = NAME_INTRO_RE.exec(para);
  if (m && isValidName(m[1])) return m[1].trim();
  return findNamedSpeaker(para);
}

// ── Main export ───────────────────────────────────────────────────────────────

export function findSources(
  text: string
): { items: SourceItem[]; warnings: string[] } {
  const paragraphs = text
    .trim()
    .split(/\n\s*\n/)
    .filter(p => p.trim().length > 20);

  const found: SourceItem[] = [];
  const seenKeys = new Set<string>();
  const warnings: string[] = [];

  // Persistent pronoun-resolution state
  let lastHeSpeaker: string | null = null;
  let lastSheSpeaker: string | null = null;
  // Best speaker candidate from the previous paragraph
  let prevParaName: string | null = null;

  for (let i = 0; i < paragraphs.length; i++) {
    if (found.length >= 5) break;

    const para = paragraphs[i];
    const quotes = extractQuotes(para);

    // Track who is introduced in this paragraph for the next paragraph's look-back
    const thisParaIntroName = findIntroducedName(para);

    // Update persistent gender tracking even for non-quoted paragraphs
    if (thisParaIntroName && isValidName(thisParaIntroName)) {
      if (/\b(?:he|his|him)\b/.test(para)) lastHeSpeaker = thisParaIntroName;
      if (/\b(?:she|her)\b/.test(para)) lastSheSpeaker = thisParaIntroName;
    }

    if (quotes.length === 0) {
      prevParaName = thisParaIntroName;
      continue;
    }

    // ── Resolve speaker ──────────────────────────────────────────────────────

    let speaker: string | null = null;

    // 1. Named speaker directly in this paragraph: "Name said" / "Name, desc, said"
    speaker = findNamedSpeaker(para);

    // 2. Named speaker immediately after a closing quote: `," Name said`
    if (!speaker) {
      for (const q of quotes) {
        const post = findPostQuoteSpeaker(para, q.endIndex);
        if (post) { speaker = post; break; }
      }
    }

    // 3. Pronoun attribution → look-back to previous paragraph, then gender state
    if (!speaker) {
      const pm = PRONOUN_SAID_RE.exec(para);
      if (pm) {
        const pron = pm[1].toLowerCase();
        if (pron === 'he') {
          speaker = prevParaName || lastHeSpeaker;
        } else if (pron === 'she') {
          speaker = prevParaName || lastSheSpeaker;
        }
        // 'they' is too ambiguous without full coreference resolution — skip
      }
    }

    // Update gender tracking once speaker is resolved
    if (speaker && isValidName(speaker)) {
      if (/\b(?:he|his|him)\b/.test(para)) lastHeSpeaker = speaker;
      if (/\b(?:she|her)\b/.test(para)) lastSheSpeaker = speaker;
    }

    prevParaName = thisParaIntroName;

    // ── Validate & record ────────────────────────────────────────────────────

    if (!speaker || !isValidName(speaker)) continue;

    const normalized = speaker.trim().replace(/\s+/g, ' ');
    const key = normalized.toLowerCase();

    if (seenKeys.has(key)) continue;

    // Skip partial-name duplicates: "Thau" when "Rich Thau" already recorded
    const seenArr = Array.from ? Array.from(seenKeys) : ([] as string[]).concat.apply([], [seenKeys as any]);
    const isDuplicate = seenArr.some(
      (sk: string) => sk.endsWith(' ' + key) || sk.startsWith(key + ' ')
    );
    if (isDuplicate) continue;

    seenKeys.add(key);

    // Evidence: the actual first quote from this paragraph
    const evidence = `\u201C${quotes[0].text}\u201D`;

    found.push({
      source_name: normalized,
      source_type: 'person',
      evidence_quote: evidence,
    });
  }

  if (found.length === 0) {
    warnings.push('Quoted material detected but no clear speakers identified.');
  }

  return { items: found, warnings };
}
