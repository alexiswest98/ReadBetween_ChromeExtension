import React from 'react';
import { ArticleStructure } from '../../../types/models';

interface Props {
  structure: ArticleStructure;
}

const ArticleContext: React.FC<Props> = ({ structure }) => {
  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Article Context</h3>
      <h2
        style={{
          margin: '0 0 8px',
          fontSize: '16px',
          fontWeight: 600,
          lineHeight: 1.3,
        }}
      >
        {structure.headline}
      </h2>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '12px',
          color: '#666',
        }}
      >
        <span>{structure.publication}</span>
        <span>{structure.published_date}</span>
        <span>{structure.reading_time}</span>
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

export default ArticleContext;
