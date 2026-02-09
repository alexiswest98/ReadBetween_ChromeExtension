import React from 'react';
import {
  FramingSignals as FramingSignalsType,
  LanguageAnalysis,
} from '../../../types/models';

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
  <div
    style={{
      textAlign: 'center',
      padding: '8px',
      background: '#f8f8f8',
      borderRadius: '4px',
    }}
  >
    <div
      style={{
        fontSize: '18px',
        fontWeight: 600,
        color: count > 0 ? '#333' : '#ccc',
      }}
    >
      {count}
    </div>
    <div
      style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}
    >
      {label}
    </div>
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
    <div style={cardStyle}>
      <h3 style={titleStyle}>Language & Framing Signals</h3>

      {/* Notable language choices */}
      {languageAnalysis.notable_choices.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h4 style={subtitleStyle}>Notable Language Choices</h4>
          {languageAnalysis.notable_choices.map((choice, i) => (
            <p
              key={i}
              style={{ margin: '2px 0', fontSize: '12px', color: '#555' }}
            >
              {choice}
            </p>
          ))}
        </div>
      )}

      {/* Language category counts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
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
            <div key={label} style={{ marginBottom: '8px' }}>
              <h4 style={subtitleStyle}>{label}</h4>
              {data.examples.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '4px',
                  }}
                >
                  <strong style={{ color: '#333' }}>{ex.word}</strong>
                  : &ldquo;{ex.sentence}&rdquo;
                </div>
              ))}
            </div>
          )
      )}

      {/* Structural framing signals */}
      {signals.state === 'signals_detected' &&
        signals.signals.length > 0 && (
          <div
            style={{
              borderTop: '1px solid #eee',
              paddingTop: '12px',
              marginTop: '8px',
            }}
          >
            <h4 style={subtitleStyle}>Structural Patterns</h4>
            {signals.signals.map((signal, i) => (
              <div
                key={i}
                style={{
                  marginBottom: '10px',
                  paddingLeft: '10px',
                  borderLeft: '3px solid #e0e0e0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#555',
                    }}
                  >
                    {categoryLabels[signal.category] || signal.category}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      background:
                        confidenceColors[signal.confidence] + '20',
                      color: confidenceColors[signal.confidence],
                    }}
                  >
                    {signal.confidence}
                  </span>
                </div>
                <p
                  style={{
                    margin: '2px 0',
                    fontSize: '12px',
                    color: '#333',
                  }}
                >
                  {signal.signal}
                </p>
                <p
                  style={{
                    margin: '2px 0',
                    fontSize: '11px',
                    color: '#888',
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;{signal.evidence_quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}

      {signals.state === 'no_significant_signal_detected' && (
        <p
          style={{
            color: '#888',
            fontSize: '12px',
            fontStyle: 'italic',
            marginTop: '8px',
          }}
        >
          No significant framing signals detected. Language is procedural;
          claims are attributed; limited loaded wording.
        </p>
      )}
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  marginBottom: '12px',
  padding: '12px',
  background: '#fff',
  borderRadius: '6px',
  border: '1px solid #e8e8e8',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#999',
};

const subtitleStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#555',
};

export default FramingSignals;
