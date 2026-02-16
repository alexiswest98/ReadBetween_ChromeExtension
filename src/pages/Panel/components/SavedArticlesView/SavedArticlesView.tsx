import React from 'react';
import { SavedArticle } from '../../../../types/models';
import './SavedArticlesView.css';

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
      <div className="saved-empty">
        <p className="saved-empty-title">No saved articles yet</p>
        <p className="saved-empty-subtitle">
          Articles you save will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="saved-list">
      {articles.map((article) => (
        <div key={article.id} className="card">
          <h4 className="saved-card-title">{article.headline}</h4>
          <div className="saved-card-meta">
            <span>{article.publisher}</span>
            <span>
              {new Date(article.savedAt).toLocaleDateString()}
            </span>
            <span>{accessLabels[article.accessState]}</span>
          </div>
          <div className="saved-card-actions">
            <button
              onClick={() => onLoadArticle(article)}
              className="small-button"
            >
              View Breakdown
            </button>
            <button
              onClick={() => onRemoveArticle(article.id)}
              className="small-button remove"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SavedArticlesView;
