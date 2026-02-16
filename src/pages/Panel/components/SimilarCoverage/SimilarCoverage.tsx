import React, { useState } from 'react';
import {
  AnalysisResult,
  SimilarCoverageItem,
} from '../../../../types/models';
import { fetchSimilarCoverage } from '../../../../utils/similarCoverage';
import './SimilarCoverage.css';

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
    <div className="card">
      <h3 className="section-title">Find Similar Coverage</h3>

      {!searched && !loading && (
        <div className="similar-search-prompt">
          <p className="similar-search-text">
            Search for other publishers reporting on this same story.
          </p>
          <button onClick={handleSearch} className="search-button">
            Search for Similar Articles
          </button>
        </div>
      )}

      {loading && (
        <div className="similar-loading">
          <div className="spinner" />
          Searching the web for similar coverage...
        </div>
      )}

      {error && (
        <div className="similar-error">
          <p className="similar-error-text">{error}</p>
          <button onClick={handleSearch} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {searched && !loading && !error && articles.length === 0 && (
        <p className="similar-none">No similar coverage found.</p>
      )}

      {articles.length > 0 && (
        <div>
          {articles.map((article, i) => (
            <div key={i} className="similar-article">
              <a
                href={article.url}
                className="similar-article-link"
                onClick={(e) => {
                  e.preventDefault();
                  chrome.tabs.create({ url: article.url });
                }}
              >
                {article.headline}
              </a>
              <span className="similar-article-publisher">
                {article.publisher}
              </span>
            </div>
          ))}
          <button
            onClick={handleSearch}
            className="search-again-button"
          >
            Search Again
          </button>
        </div>
      )}
    </div>
  );
};

export default SimilarCoverage;
