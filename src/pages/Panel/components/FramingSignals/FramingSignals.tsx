import React from 'react';
import {
  FramingSignals as FramingSignalsType,
  LanguageAnalysis,
} from '../../../../types/models';
import './FramingSignals.css';

interface Props {
  signals: FramingSignalsType;
  languageAnalysis: LanguageAnalysis;
}

const confidenceColors: Record<string, string> = {
  low: '#999',
  medium: '#b8860b',
  high: '#c0392b',
};

const categoryLabels: Record<string, string> = {
  agency_responsibility: 'Agency & Responsibility',
  explanation_balance: 'Explanation Balance',
  event_framing: 'Event Framing',
  language_signals: 'Language Signals',
  missing_context: 'Missing Context',
};

const LanguageStat: React.FC<{ label: string; count: number }> = ({
  label,
  count,
}) => (
  <div className="language-stat">
    <div className={`language-stat-value${count === 0 ? ' zero' : ''}`}>
      {count}
    </div>
    <div className="language-stat-label">{label}</div>
  </div>
);

const FramingSignals: React.FC<Props> = ({ signals, languageAnalysis }) => {
  const languageCategories = [
    {
      label: 'Emotional Emphasis',
      data: languageAnalysis.emotional_emphasis,
    },
    { label: 'Moral Framing', data: languageAnalysis.moral_framing },
    {
      label: 'Certainty Language',
      data: languageAnalysis.certainty_language,
    },
  ];

  return (
    <div className="card">
      <h3 className="section-title">Language & Framing Signals</h3>

      {/* Notable language choices */}
      {languageAnalysis.notable_choices.length > 0 && (
        <div className="framing-notable">
          <h4 className="subtitle">Notable Language Choices</h4>
          {languageAnalysis.notable_choices.map((choice, i) => (
            <p key={i} className="framing-notable-choice">
              {choice}
            </p>
          ))}
        </div>
      )}

      {/* Language category counts */}
      <div className="language-stats-grid">
        <LanguageStat
          label="Emotional"
          count={languageAnalysis.emotional_emphasis.count}
        />
        <LanguageStat
          label="Moral"
          count={languageAnalysis.moral_framing.count}
        />
        <LanguageStat
          label="Certainty"
          count={languageAnalysis.certainty_language.count}
        />
      </div>

      {/* Language category examples */}
      {languageCategories.map(
        ({ label, data }) =>
          data.examples.length > 0 && (
            <div key={label} className="language-category">
              <h4 className="subtitle">{label}</h4>
              {data.examples.map((ex, i) => (
                <div key={i} className="language-example">
                  <strong>{ex.word}</strong>
                  : &ldquo;{ex.sentence}&rdquo;
                </div>
              ))}
            </div>
          )
      )}

      {/* Structural framing signals */}
      {signals.state === 'signals_detected' &&
        signals.signals.length > 0 && (
          <div className="structural-patterns">
            <h4 className="subtitle">Structural Patterns</h4>
            {signals.signals.map((signal, i) => (
              <div key={i} className="signal-item">
                <div className="signal-header">
                  <span className="signal-category">
                    {categoryLabels[signal.category] || signal.category}
                  </span>
                  <span
                    className="signal-confidence"
                    style={{
                      background:
                        confidenceColors[signal.confidence] + '20',
                      color: confidenceColors[signal.confidence],
                    }}
                  >
                    {signal.confidence}
                  </span>
                </div>
                <p className="signal-text">{signal.signal}</p>
                <p className="signal-quote">
                  &ldquo;{signal.evidence_quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}

      {signals.state === 'no_significant_signal_detected' && (
        <p className="no-signals">
          No significant framing signals detected. Language is procedural;
          claims are attributed; limited loaded wording.
        </p>
      )}
    </div>
  );
};

export default FramingSignals;
