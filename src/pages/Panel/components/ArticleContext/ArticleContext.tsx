import React from 'react';
import { ArticleStructure } from '../../../../types/models';
import './ArticleContext.css';

interface Props {
  structure: ArticleStructure;
}

const ArticleContext: React.FC<Props> = ({ structure }) => {
  return (
    <div id="context-card" className="card">
      {/* <h2 id="context-title" className="section-title">Article Context</h2> */}
      <div className="context-meta">
        <span>{structure.publication}</span>
        <h1 className="context-headline">{structure.headline}</h1>
        <span>{structure.published_date}</span>
      </div>
      <div className='reading-meta'> 
        <span className='reading-time-txt'>{structure.reading_time}</span>
      </div>
    </div>
  );
};

export default ArticleContext;
