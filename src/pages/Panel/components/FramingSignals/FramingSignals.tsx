import React from 'react';
import {
  StructuralPatterns,
  LanguageAnalysis,
} from '../../../../types/models';
import './FramingSignals.css';

interface Props {
  structuralPatterns: StructuralPatterns;
  languageAnalysis: LanguageAnalysis;
}

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

const FramingSignals: React.FC<Props> = ({ structuralPatterns, languageAnalysis }) => {
  return (
    <div className="card">
      <h3 className="section-title">Structural Patterns</h3>

      {/* Narrative Structure */}
      <div className="pattern-section">
        <h4 className="subtitle">Narrative Structure</h4>
        <p className="pattern-summary">{structuralPatterns.narrative_structure.summary}</p>
        {structuralPatterns.narrative_structure.evidence_quotes.length > 0 && (
          <div className="pattern-quotes">
            {structuralPatterns.narrative_structure.evidence_quotes.map((quote, i) => (
              <p key={i} className="signal-quote">
                &ldquo;{quote}&rdquo;
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Missing Context */}
      <div className="pattern-section">
        <h4 className="subtitle">Missing Context</h4>
        <p className="pattern-summary">{structuralPatterns.missing_context.summary}</p>
        {structuralPatterns.missing_context.evidence_quotes.length > 0 && (
          <div className="pattern-quotes">
            {structuralPatterns.missing_context.evidence_quotes.map((quote, i) => (
              <p key={i} className="signal-quote">
                &ldquo;{quote}&rdquo;
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Language Analysis */}
      <div className="language-section">
        <h3 className="section-title">Language Analysis</h3>

        {/* Notable language choices */}
        {languageAnalysis.notable_choices.length > 0 && (
          <div className="framing-notable">
            {languageAnalysis.notable_choices.map((choice, i) => (
              <p key={i} className="framing-notable-choice">
                {choice}
              </p>
            ))}
          </div>
        )}

        {/* Language category counts + words */}
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
    </div>
  );
};

export default FramingSignals;
