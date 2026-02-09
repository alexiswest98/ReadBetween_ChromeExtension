import React from 'react';

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
    <div style={cardStyle}>
      <h3 style={titleStyle}>Actions</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button onClick={onOpenArticle} style={buttonStyle}>
          Read Full Article
        </button>
        <button onClick={onRefresh} style={buttonStyle}>
          Refresh Analysis
        </button>
        <button
          onClick={onSave}
          style={{
            ...buttonStyle,
            ...(isCurrentSaved ? { opacity: 0.6, cursor: 'default' } : {}),
          }}
          disabled={isCurrentSaved}
        >
          {isCurrentSaved ? 'Saved' : 'Save for Later'}
        </button>
        <button onClick={onCopyJson} style={buttonStyle}>
          Copy JSON
        </button>
      </div>
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

const buttonStyle: React.CSSProperties = {
  padding: '8px 14px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '12px',
  color: '#333',
};

export default ActionsBar;
