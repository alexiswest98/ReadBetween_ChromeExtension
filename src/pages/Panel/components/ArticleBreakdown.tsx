import React from 'react';
import { StructuredBreakdown } from '../../../types/models';

interface Props {
  breakdown: StructuredBreakdown;
}

const ArticleBreakdown: React.FC<Props> = ({ breakdown }) => {
  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>What's Being Reported</h3>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        {breakdown.reported_points.map((point, i) => (
          <li
            key={i}
            style={{
              marginBottom: '6px',
              lineHeight: 1.5,
              color: '#333',
            }}
          >
            {point}
          </li>
        ))}
      </ul>
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

export default ArticleBreakdown;
