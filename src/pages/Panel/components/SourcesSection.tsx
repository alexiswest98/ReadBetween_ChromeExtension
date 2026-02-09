import React from 'react';
import { Sources } from '../../../types/models';

interface Props {
  sources: Sources;
}

const typeLabels: Record<string, string> = {
  person: 'Person',
  agency: 'Agency',
  document: 'Document',
  dataset: 'Dataset',
  other: 'Other',
};

const SourcesSection: React.FC<Props> = ({ sources }) => {
  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Sources</h3>
      {sources.items.length === 0 ? (
        <p
          style={{
            color: '#888',
            fontSize: '12px',
            fontStyle: 'italic',
          }}
        >
          No explicitly attributed sources were identified in this article.
        </p>
      ) : (
        sources.items.map((item, i) => (
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
                  fontWeight: 500,
                  fontSize: '13px',
                  color: '#333',
                }}
              >
                {item.source_name}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '8px',
                  background: '#f0f0f0',
                  color: '#666',
                }}
              >
                {typeLabels[item.source_type] || item.source_type}
              </span>
            </div>
            <p
              style={{
                margin: '2px 0',
                fontSize: '12px',
                color: '#888',
                fontStyle: 'italic',
              }}
            >
              &ldquo;{item.evidence_quote}&rdquo;
            </p>
          </div>
        ))
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
  margin: '0 0 8px',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#999',
};

export default SourcesSection;
