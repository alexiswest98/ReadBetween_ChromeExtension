import React from 'react';
import { StructuredBreakdown } from '../../../../types/models';
import './ArticleBreakdown.css';

interface Props {
  breakdown: StructuredBreakdown;
}

const ArticleBreakdown: React.FC<Props> = ({ breakdown }) => {
  return (
    <ul className="breakdown-list">
      {breakdown.reported_points.map((point, i) => (
        <li key={i} className="breakdown-item">
          {point}
        </li>
      ))}
    </ul>
  );
};

export default ArticleBreakdown;
