import React, { useState } from 'react';
import {
  AnalysisResult,
  SimilarCoverageItem,
} from '../../../types/models';
import { fetchSimilarCoverage } from '../../../utils/similarCoverage';

interface Props {
  analysisResult: AnalysisResult;
}

const SimilarCoverage: React.FC<Props> = ({ analysisResult }) => {
  const [articles, setArticles] = useState<SimilarCoverageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchSimilarCoverage(analysisResult);
      setArticles(results);
      setSearched(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch similar coverage.'
      );
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Find Similar Coverage</h3>

      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p
            style={{
              color: '#888',
              fontSize: '12px',
              marginBottom: '10px',
            }}
          >
            Search for other publishers reporting on this same story.
          </p>
          <button onClick={handleSearch} style={searchButtonStyle}>
            Search for Similar Articles
          </button>
        </div>
      )}

      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '16px 0',
            color: '#666',
            fontSize: '12px',
          }}
        >
          <div style={spinnerStyle} />
          Searching the web for similar coverage...
        </div>
      )}

      {error && (
        <div style={{ padding: '8px 0' }}>
          <p style={{ color: '#c0392b', fontSize: '12px', margin: '0 0 8px' }}>
            {error}
          </p>
          <button onClick={handleSearch} style={retryButtonStyle}>
            Retry
          </button>
        </div>
      )}

      {searched && !loading && !error && articles.length === 0 && (
        <p
          style={{
            color: '#888',
            fontSize: '12px',
            fontStyle: 'italic',
          }}
        >
          No similar coverage found.
        </p>
      )}

      {articles.length > 0 && (
        <div>
          {articles.map((article, i) => (
            <div
              key={i}
              style={{
                marginBottom: '10px',
                paddingLeft: '10px',
                borderLeft: '3px solid #e0e0e0',
              }}
            >
              <a
                href={article.url}
                style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  lineHeight: 1.3,
                  display: 'block',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  chrome.tabs.create({ url: article.url });
                }}
              >
                {article.headline}
              </a>
              <span
                style={{
                  fontSize: '11px',
                  color: '#888',
                }}
              >
                {article.publisher}
              </span>
            </div>
          ))}
          <button
            onClick={handleSearch}
            style={{
              ...retryButtonStyle,
              marginTop: '4px',
            }}
          >
            Search Again
          </button>
        </div>
      )}
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

const searchButtonStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: '#1a1a1a',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 500,
};

const retryButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '11px',
  color: '#333',
};

const spinnerStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  border: '2px solid #e0e0e0',
  borderTopColor: '#333',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto 8px',
};

export default SimilarCoverage;
