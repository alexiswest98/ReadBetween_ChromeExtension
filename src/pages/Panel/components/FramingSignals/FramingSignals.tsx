import React from 'react';
import {
  StructuralPatternSection,
  LanguageAnalysis,
} from '../../../../types/models';
import { splitSentences } from '../../../../utils/textUtils';
import './FramingSignals.css';

// ========== What's Not Included (Missing Context) ==========

interface MissingContextProps {
  missingContext: StructuralPatternSection;
}

export const MissingContextCard: React.FC<MissingContextProps> = ({ missingContext }) => {
  const sentences = splitSentences(missingContext.summary);

  return (
    <>
      <ul className="pattern-bullet-list">
        {sentences.map((sentence, i) => (
          <li key={i} className="missing-bullet-item">{sentence}</li>
        ))}
      </ul>
      {missingContext.evidence_quotes.length > 0 && (
        <div className="pattern-quotes">
          {missingContext.evidence_quotes.map((quote, i) => (
            <p key={i} className="missing-quote">
              {quote}
            </p>
          ))}
        </div>
      )}
    </>
  );
};

// ========== How the Story Is Structured (Narrative Structure) ==========

interface NarrativeStructureProps {
  narrativeStructure: StructuralPatternSection;
  isLoading?: boolean;
}

export const NarrativeStructureCard: React.FC<NarrativeStructureProps> = ({ narrativeStructure, isLoading }) => {
  if (isLoading) {
    return <p className="card-loading-hint">Analyzing structure and tone…</p>;
  }

  const sentences = splitSentences(narrativeStructure.summary);

  return (
    <>
      <ul className="pattern-bullet-list">
        {sentences.map((sentence, i) => (
          <li key={i} className="pattern-bullet-item">{sentence}</li>
        ))}
      </ul>
      {narrativeStructure.evidence_quotes.length > 0 && (
        <div className="pattern-quotes">
          {narrativeStructure.evidence_quotes.map((quote, i) => (
            <p key={i} className="signal-quote">
              {quote}
            </p>
          ))}
        </div>
      )}
    </>
  );
};

// ========== Tone Indicators (Language Analysis) ==========

const LanguageStat: React.FC<{ label: string; count: number; words: string[] }> = ({
  label,
  count,
  words,
}) => (
  <div id="tone-card" className="language-stat">
    <div className={`language-stat-value${count === 0 ? ' zero' : ''}`}>
      {count}
    </div>
    <div className="language-stat-label">{label}</div>
    {words.length > 0 && (
      <div className="language-stat-words">
        {words.join(', ')}
      </div>
    )}
  </div>
);

interface ToneIndicatorsProps {
  languageAnalysis: LanguageAnalysis;
  isLoading?: boolean;
}

export const ToneIndicatorsCard: React.FC<ToneIndicatorsProps> = ({ languageAnalysis, isLoading }) => {
  if (isLoading) {
    return <p className="card-loading-hint">Analyzing structure and tone…</p>;
  }

  return (
    <>
      {languageAnalysis.notable_choices.length > 0 && (
        <ul className="pattern-bullet-list">
          {languageAnalysis.notable_choices.map((choice, i) => (
            <li key={i} className="pattern-bullet-item">{choice}</li>
          ))}
        </ul>
      )}

      <div className="language-stats-grid">
        <LanguageStat
          label="Emotional"
          count={languageAnalysis.emotional_emphasis.count}
          words={languageAnalysis.emotional_emphasis.words}
        />
        <LanguageStat
          label="Moral"
          count={languageAnalysis.moral_framing.count}
          words={languageAnalysis.moral_framing.words}
        />
        <LanguageStat
          label="Certainty"
          count={languageAnalysis.certainty_language.count}
          words={languageAnalysis.certainty_language.words}
        />
      </div>
    </>
  );
};
