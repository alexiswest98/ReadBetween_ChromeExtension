import React from 'react';
import { StructuredBreakdown } from '../../../../types/models';
import './ArticleBreakdown.css';

interface Props {
  breakdown: StructuredBreakdown;
}

const ArticleBreakdown: React.FC<Props> = ({ breakdown }) => {
  return (
    <div id='summary-card' className="card">
      <h3 className="section-title">What's Being Reported</h3>
      <ul className="breakdown-list">
        {breakdown.reported_points.map((point, i) => (
          <li key={i} className="breakdown-item">
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ArticleBreakdown;
