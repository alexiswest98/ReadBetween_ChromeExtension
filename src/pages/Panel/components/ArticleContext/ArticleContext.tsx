import React from 'react';
import { ArticleStructure } from '../../../../types/models';
import './ArticleContext.css';

interface Props {
  structure: ArticleStructure;
}

const ArticleContext: React.FC<Props> = ({ structure }) => {
  return (
    <div className="card">
      {/* <h2 id="context-title" className="section-title">Article Context</h2> */}
      <h1 className="context-headline">{structure.headline}</h1>
      <div className="context-meta">
        <span>{structure.publication}</span>
        <span>{structure.published_date}</span>
        <span>{structure.reading_time}</span>
      </div>
    </div>
  );
};

export default ArticleContext;
