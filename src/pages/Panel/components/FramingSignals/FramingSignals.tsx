import React from 'react';
import {
  StructuralPatternSection,
  LanguageAnalysis,
} from '../../../../types/models';
import './FramingSignals.css';

// ========== What's Not Included (Missing Context) ==========

interface MissingContextProps {
  missingContext: StructuralPatternSection;
}

export const MissingContextCard: React.FC<MissingContextProps> = ({ missingContext }) => {
  const sentences = missingContext.summary
    .split(/(?<=\.)\s+/)
    .filter((s) => s.trim().length > 0);

  return (
    <div className="card">
      <h3 className="section-title">What's Not Included</h3>
      <ul className="pattern-bullet-list">
        {sentences.map((sentence, i) => (
          <li key={i} className="pattern-bullet-item">{sentence}</li>
        ))}
      </ul>
      {missingContext.evidence_quotes.length > 0 && (
        <div className="pattern-quotes">
          {missingContext.evidence_quotes.map((quote, i) => (
            <p key={i} className="signal-quote">
              &ldquo;{quote}&rdquo;
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

// ========== How the Story Is Structured (Narrative Structure) ==========

interface NarrativeStructureProps {
  narrativeStructure: StructuralPatternSection;
}

export const NarrativeStructureCard: React.FC<NarrativeStructureProps> = ({ narrativeStructure }) => {
  const sentences = narrativeStructure.summary
    .split(/(?<=\.)\s+/)
    .filter((s) => s.trim().length > 0);

  return (
    <div className="card">
      <h3 className="section-title">How the Story Is Structured</h3>
      <ul className="pattern-bullet-list">
        {sentences.map((sentence, i) => (
          <li key={i} className="pattern-bullet-item">{sentence}</li>
        ))}
      </ul>
      {narrativeStructure.evidence_quotes.length > 0 && (
        <div className="pattern-quotes">
          {narrativeStructure.evidence_quotes.map((quote, i) => (
            <p key={i} className="signal-quote">
              &ldquo;{quote}&rdquo;
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

// ========== Tone Indicators (Language Analysis) ==========

const LanguageStat: React.FC<{ label: string; count: number; words: string[] }> = ({
  label,
  count,
  words,
}) => (
  <div className="language-stat">
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
}

export const ToneIndicatorsCard: React.FC<ToneIndicatorsProps> = ({ languageAnalysis }) => {
  return (
    <div className="card">
      <h3 className="section-title">Tone Indicators</h3>

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
    </div>
  );
};
