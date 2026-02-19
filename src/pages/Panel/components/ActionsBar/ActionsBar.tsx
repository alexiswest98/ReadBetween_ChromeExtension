import React from 'react';
import './ActionsBar.css';

interface Props {
  onRefresh: () => void;
  onSave: () => void;
  onCopyJson: () => void;
  onOpenArticle: () => void;
  isCurrentSaved: boolean;
}

const ActionsBar: React.FC<Props> = ({
  onRefresh,
  onSave,
  onCopyJson,
  onOpenArticle,
  isCurrentSaved,
}) => {
  return (
    <div className="card">
      <h3 className="section-title white-title">Actions</h3>
      <div className="actions-buttons">
        {/* <button onClick={onOpenArticle} className="action-button">
          Read Full Article
        </button> */}
        <button onClick={onRefresh} className="action-button">
          Refresh Analysis
        </button>
        <button
          onClick={onSave}
          className="action-button"
          disabled={isCurrentSaved}
        >
          {isCurrentSaved ? 'Saved' : 'Save for Later'}
        </button>
        <button onClick={onCopyJson} className="action-button">
          Copy JSON
        </button>
      </div>
    </div>
  );
};

export default ActionsBar;
