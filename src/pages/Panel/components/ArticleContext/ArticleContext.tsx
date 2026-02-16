import React from 'react';
import { ArticleStructure } from '../../../../types/models';
import './ArticleContext.css';

interface Props {
  structure: ArticleStructure;
}

const ArticleContext: React.FC<Props> = ({ structure }) => {
  return (
    <div className="card">
      <h3 className="section-title">Article Context</h3>
      <h2 className="context-headline">{structure.headline}</h2>
      <div className="context-meta">
        <span>{structure.publication}</span>
        <span>{structure.published_date}</span>
        <span>{structure.reading_time}</span>
      </div>
    </div>
  );
};

export default ArticleContext;
