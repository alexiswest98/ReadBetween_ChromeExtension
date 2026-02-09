import React from 'react';
import { SavedArticle } from '../../../types/models';

interface Props {
  articles: SavedArticle[];
  onLoadArticle: (article: SavedArticle) => void;
  onRemoveArticle: (id: string) => void;
}

const accessLabels: Record<string, string> = {
  full_access: 'Full Access',
  partial_preview: 'Partial Preview',
  paywalled: 'Paywalled',
};

const SavedArticlesView: React.FC<Props> = ({
  articles,
  onLoadArticle,
  onRemoveArticle,
}) => {
  if (articles.length === 0) {
    return (
      <div
        style={{
          padding: '48px 16px',
          textAlign: 'center',
          color: '#888',
        }}
      >
        <p style={{ fontSize: '14px', marginBottom: '4px' }}>
          No saved articles yet
        </p>
        <p style={{ fontSize: '12px' }}>
          Articles you save will appear here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      {articles.map((article) => (
        <div key={article.id} style={cardStyle}>
          <h4
            style={{
              margin: '0 0 4px',
              fontSize: '13px',
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {article.headline}
          </h4>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              fontSize: '11px',
              color: '#888',
              marginBottom: '8px',
            }}
          >
            <span>{article.publisher}</span>
            <span>
              {new Date(article.savedAt).toLocaleDateString()}
            </span>
            <span>{accessLabels[article.accessState]}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => onLoadArticle(article)}
              style={smallButtonStyle}
            >
              View Breakdown
            </button>
            <button
              onClick={() => onRemoveArticle(article.id)}
              style={{ ...smallButtonStyle, color: '#c0392b' }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  marginBottom: '10px',
  padding: '12px',
  background: '#fff',
  borderRadius: '6px',
  border: '1px solid #e8e8e8',
};

const smallButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '11px',
  color: '#333',
};

export default SavedArticlesView;
