import React, { useState } from 'react';
import {
  AnalysisResult,
  SimilarCoverageItem,
  StageStatus,
} from '../../../../types/models';
import { fetchSimilarCoverage } from '../../../../utils/similarCoverage';
import './SimilarCoverage.css';

interface Props {
  analysisResult: AnalysisResult;
  stage3Status?: StageStatus;
}

const SimilarCoverage: React.FC<Props> = ({ analysisResult, stage3Status }) => {
  const [manualArticles, setManualArticles] = useState<SimilarCoverageItem[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualSearched, setManualSearched] = useState(false);

  // Results can come from auto Stage 3 (via analysisResult) or manual search
  const autoItems = analysisResult.similar_coverage.items;
  const articles = manualSearched ? manualArticles : autoItems;
  const isLoading = stage3Status === 'loading' || manualLoading;
  const hasResults = articles.length > 0;
  const isDone = stage3Status === 'done' || manualSearched;

  const handleSearch = async () => {
    setManualLoading(true);
    setError(null);
    try {
      const results = await fetchSimilarCoverage({
        headline: analysisResult.article_structure.headline,
        publication: analysisResult.article_structure.publication,
        published_date: analysisResult.article_structure.published_date,
        reported_points: analysisResult.structured_breakdown.reported_points,
        sources: analysisResult.sources.items,
      });
      setManualArticles(results);
      setManualSearched(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch similar coverage.'
      );
      setManualSearched(true);
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <>
      {isLoading && (
        <div className="similar-loading">
          <div className="spinner" />
          Searching the web for similar coverage…
        </div>
      )}

      {!isLoading && error && (
        <div className="similar-error">
          <p className="similar-error-text">{error}</p>
          <button onClick={handleSearch} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && !hasResults && !isDone && (
        <div className="similar-search-prompt">
          <p className="similar-search-text">
            Search for other publishers reporting on this same story.
          </p>
          <button onClick={handleSearch} className="search-button">
            Search for Similar Articles
          </button>
        </div>
      )}

      {!isLoading && !error && !hasResults && isDone && (
        <p className="similar-none">No similar coverage found.</p>
      )}

      {!isLoading && hasResults && (
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
          <button onClick={handleSearch} className="search-again-button">
            Search Again
          </button>
        </div>
      )}
    </>
  );
};

export default SimilarCoverage;
