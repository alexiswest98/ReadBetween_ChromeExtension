import {
  StructuralPatterns,
  LanguageAnalysis,
  LanguageCategoryResult,
} from '../types/models';
import { splitSentences } from './textUtils';

// ========== Language Dictionaries ==========

const EMOTIONAL_WORDS = [
  'devastating',
  'shocking',
  'horrifying',
  'alarming',
  'outrageous',
  'terrifying',
  'heartbreaking',
  'stunning',
  'explosive',
  'catastrophic',
  'crisis',
  'surge',
  'slam',
  'blast',
  'rip',
  'chaos',
  'fury',
  'rage',
  'panic',
  'nightmare',
  'bombshell',
  'firestorm',
  'backlash',
  'uproar',
  'turmoil',
  'dramatic',
  'dire',
  'grim',
  'tragic',
];

const MORAL_WORDS = [
  'should',
  'ought',
  'must',
  'right',
  'wrong',
  'justice',
  'fair',
  'unfair',
  'moral',
  'immoral',
  'ethical',
  'unethical',
  'duty',
  'obligation',
  'responsible',
  'irresponsible',
  'accountability',
  'negligent',
  'reckless',
  'corrupt',
  'integrity',
  'virtuous',
  'deplorable',
  'shameful',
  'disgraceful',
  'unconscionable',
];

const CERTAINTY_WORDS = [
  'clearly',
  'obviously',
  'undeniably',
  'certainly',
  'absolutely',
  'definitely',
  'undoubtedly',
  'unquestionably',
  'indisputably',
  'without doubt',
  'no question',
  'beyond question',
  'proven',
  'proof',
  'undeniable',
  'indisputable',
  'inevitable',
  'guaranteed',
  'unequivocal',
  'decisive',
  'conclusive',
  'irrefutable',
];

// ========== Structural Patterns (Fallback) ==========

export function detectStructuralPatterns(
  text: string
): {
  patterns: StructuralPatterns;
  warnings: string[];
} {
  const sentences = splitSentences(text);
  const warnings: string[] = [];

  // Narrative structure: basic heuristic fallback
  const narrativeNotes: string[] = [];
  const narrativeQuotes: string[] = [];

  const hasPassive =
    /(?:was|were|been|being)\s+(?:\w+ed|given|taken|made|done|found|told|shown)/i.test(text);
  if (hasPassive) {
    narrativeNotes.push('The article uses passive voice constructions in places.');
  }

  const hasCounterpoint =
    /(?:however|on the other hand|critics|opponents|alternatively|conversely|in contrast|some argue|others say|dissent)/i.test(text);
  if (!hasCounterpoint && sentences.length > 10) {
    narrativeNotes.push('The article presents information without explicit counter-viewpoints.');
  }

  if (sentences.length > 0) {
    const lead = sentences[0];
    const loadedWords =
      /(?:crisis|scandal|controversy|bombshell|explosive|devastating|shocking|slam|blast|firestorm)/i;
    if (loadedWords.test(lead)) {
      narrativeNotes.push('The lead sentence uses high-intensity language.');
      narrativeQuotes.push(
        lead.length > 200 ? lead.substring(0, 200) + '...' : lead
      );
    }
  }

  if (narrativeNotes.length === 0) {
    narrativeNotes.push('The article follows a conventional news structure.');
  }

  // Missing context: basic heuristic
  const missingNotes: string[] = [];
  const missingQuotes: string[] = [];

  const hasNumbers = /\d+\s*%|\$\s*\d|billion|million|thousand/i.test(text);
  const hasComparison =
    /(?:compared to|relative to|versus|previously|last year|year-over-year|historically|in context)/i.test(text);
  if (hasNumbers && !hasComparison) {
    missingNotes.push('Statistical claims are present without comparative context or baseline references.');
  }

  if (missingNotes.length === 0) {
    missingNotes.push("No significant contextual gaps detected based on the article's scope.");
  }

  return {
    patterns: {
      narrative_structure: {
        summary: narrativeNotes.join(' '),
        evidence_quotes: narrativeQuotes,
      },
      missing_context: {
        summary: missingNotes.join(' '),
        evidence_quotes: missingQuotes,
      },
    },
    warnings,
  };
}

// ========== Language Analysis ==========

export function analyzeLanguage(text: string): LanguageAnalysis {
  const sentences = splitSentences(text);

  const emotional = findWordMatches(sentences, EMOTIONAL_WORDS);
  const moral = findWordMatches(sentences, MORAL_WORDS);
  const certainty = findWordMatches(sentences, CERTAINTY_WORDS);

  const notable: string[] = [];
  if (emotional.count > 3) {
    notable.push(
      `High use of emotional language (${emotional.count} instances)`
    );
  }
  if (moral.count > 2) {
    notable.push(
      `Moral framing language present (${moral.count} instances)`
    );
  }
  if (certainty.count > 2) {
    notable.push(
      `Certainty language used frequently (${certainty.count} instances)`
    );
  }
  if (notable.length === 0) {
    notable.push('Language is generally neutral and measured.');
  }

  return {
    emotional_emphasis: emotional,
    moral_framing: moral,
    certainty_language: certainty,
    notable_choices: notable,
  };
}

function findWordMatches(
  sentences: string[],
  dictionary: string[]
): LanguageCategoryResult {
  const foundWords: string[] = [];
  let count = 0;
  const seen = new Set<string>();

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const words = lower.split(/\s+/);

    for (const word of words) {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (dictionary.includes(cleaned)) {
        count++;
        if (foundWords.length < 5 && !seen.has(cleaned)) {
          seen.add(cleaned);
          foundWords.push(cleaned);
        }
      }
    }

    for (const phrase of dictionary) {
      if (phrase.includes(' ') && lower.includes(phrase)) {
        count++;
        if (foundWords.length < 5 && !seen.has(phrase)) {
          seen.add(phrase);
          foundWords.push(phrase);
        }
      }
    }
  }

  return { count, words: foundWords };
}
