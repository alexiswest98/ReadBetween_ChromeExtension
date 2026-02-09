import {
  FramingSignal,
  SignalCategory,
  Confidence,
  FramingSignalState,
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

// ========== Framing Signal Patterns ==========

interface SignalPattern {
  category: SignalCategory;
  description: string;
  test: (
    sentences: string[],
    fullText: string
  ) => { detected: boolean; evidence: string; confidence: Confidence } | null;
}

const SIGNAL_PATTERNS: SignalPattern[] = [
  {
    category: 'agency_responsibility',
    description: 'Passive voice used to obscure who performed the action',
    test: (sentences) => {
      const passivePatterns = [
        /(?:was|were|been|being)\s+(?:\w+ed|given|taken|made|done|found|told|shown)/i,
        /it\s+(?:was|is)\s+(?:decided|determined|announced|reported|confirmed|believed|said|expected|understood)/i,
      ];
      for (const s of sentences) {
        for (const p of passivePatterns) {
          if (p.test(s)) {
            return {
              detected: true,
              evidence: s,
              confidence: 'medium' as Confidence,
            };
          }
        }
      }
      return null;
    },
  },
  {
    category: 'agency_responsibility',
    description: 'Attribution shifted from actor to affected parties',
    test: (sentences) => {
      const patterns = [
        /(?:victims?|affected|impacted)\s+(?:of|by)\s+/i,
        /(?:suffered|endured|faced)\s+(?:the\s+)?(?:consequences|effects|impact)/i,
      ];
      for (const s of sentences) {
        for (const p of patterns) {
          if (p.test(s)) {
            return {
              detected: true,
              evidence: s,
              confidence: 'low' as Confidence,
            };
          }
        }
      }
      return null;
    },
  },
  {
    category: 'explanation_balance',
    description: 'One-sided perspective dominates without counter-viewpoint',
    test: (sentences, fullText) => {
      const hasCounterpoint =
        /(?:however|on the other hand|critics|opponents|alternatively|conversely|in contrast|some argue|others say|dissent)/i.test(
          fullText
        );
      if (!hasCounterpoint && sentences.length > 10) {
        return {
          detected: true,
          evidence:
            'Article presents a single perspective without explicit counter-viewpoints.',
          confidence: 'medium' as Confidence,
        };
      }
      return null;
    },
  },
  {
    category: 'event_framing',
    description: 'Headline or lead uses loaded framing for the event',
    test: (sentences) => {
      if (sentences.length === 0) return null;
      const lead = sentences[0];
      const loadedWords =
        /(?:crisis|scandal|controversy|bombshell|explosive|devastating|shocking|slam|blast|firestorm)/i;
      if (loadedWords.test(lead)) {
        return {
          detected: true,
          evidence: lead,
          confidence: 'high' as Confidence,
        };
      }
      return null;
    },
  },
  {
    category: 'language_signals',
    description: 'Emotionally charged or loaded language detected',
    test: (sentences) => {
      for (const s of sentences) {
        const words = s.toLowerCase().split(/\s+/);
        const emotionalCount = words.filter((w) =>
          EMOTIONAL_WORDS.includes(w)
        ).length;
        if (emotionalCount >= 2) {
          return {
            detected: true,
            evidence: s,
            confidence: 'high' as Confidence,
          };
        }
      }
      return null;
    },
  },
  {
    category: 'language_signals',
    description:
      'High-certainty language used for claims that may be debatable',
    test: (sentences) => {
      for (const s of sentences) {
        const lower = s.toLowerCase();
        const hasCertainty = CERTAINTY_WORDS.some((w) => lower.includes(w));
        if (hasCertainty) {
          return {
            detected: true,
            evidence: s,
            confidence: 'medium' as Confidence,
          };
        }
      }
      return null;
    },
  },
  {
    category: 'missing_context',
    description: 'Key context or comparison data appears absent',
    test: (sentences, fullText) => {
      const hasNumbers = /\d+\s*%|\$\s*\d|billion|million|thousand/i.test(
        fullText
      );
      const hasComparison =
        /(?:compared to|relative to|versus|previously|last year|year-over-year|historically|in context)/i.test(
          fullText
        );
      if (hasNumbers && !hasComparison) {
        return {
          detected: true,
          evidence:
            'Statistical claims present without comparative context or baseline references.',
          confidence: 'low' as Confidence,
        };
      }
      return null;
    },
  },
];

// ========== Main Functions ==========

export function detectFramingSignals(
  text: string
): {
  state: FramingSignalState;
  signals: FramingSignal[];
  warnings: string[];
} {
  const sentences = splitSentences(text);
  const signals: FramingSignal[] = [];
  const warnings: string[] = [];

  for (const pattern of SIGNAL_PATTERNS) {
    const result = pattern.test(sentences, text);
    if (result && result.detected) {
      signals.push({
        category: pattern.category,
        signal: pattern.description,
        evidence_quote:
          result.evidence.length > 200
            ? result.evidence.substring(0, 200) + '...'
            : result.evidence,
        confidence: result.confidence,
      });
    }
  }

  const limitedSignals = signals.slice(0, 4);

  const state: FramingSignalState =
    limitedSignals.length > 0
      ? 'signals_detected'
      : 'no_significant_signal_detected';

  if (state === 'no_significant_signal_detected') {
    warnings.push(
      'No significant framing signals detected. Language is procedural; claims are attributed; limited loaded wording.'
    );
  }

  return { state, signals: limitedSignals, warnings };
}

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
  const examples: Array<{ word: string; sentence: string }> = [];
  let count = 0;
  const seenSentences = new Set<string>();

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const words = lower.split(/\s+/);

    for (const word of words) {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (dictionary.includes(cleaned)) {
        count++;
        if (examples.length < 3 && !seenSentences.has(sentence)) {
          seenSentences.add(sentence);
          examples.push({
            word: cleaned,
            sentence:
              sentence.length > 150
                ? sentence.substring(0, 150) + '...'
                : sentence,
          });
        }
      }
    }

    for (const phrase of dictionary) {
      if (phrase.includes(' ') && lower.includes(phrase)) {
        count++;
        if (examples.length < 3 && !seenSentences.has(sentence)) {
          seenSentences.add(sentence);
          examples.push({
            word: phrase,
            sentence:
              sentence.length > 150
                ? sentence.substring(0, 150) + '...'
                : sentence,
          });
        }
      }
    }
  }

  return { count, examples };
}
