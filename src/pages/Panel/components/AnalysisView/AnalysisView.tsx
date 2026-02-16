import React from 'react';
import { AnalysisResult, AccessStateResult } from '../../../../types/models';
import SystemStatus from '../SystemStatus/SystemStatus';
import ArticleContext from '../ArticleContext/ArticleContext';
import ArticleBreakdown from '../ArticleBreakdown/ArticleBreakdown';
import FramingSignals from '../FramingSignals/FramingSignals';
import SourcesSection from '../SourcesSection/SourcesSection';
import AuthorTransparency from '../AuthorTransparency/AuthorTransparency';
import SimilarCoverage from '../SimilarCoverage/SimilarCoverage';
import ActionsBar from '../ActionsBar/ActionsBar';
import Footer from '../Footer/Footer';
import './AnalysisView.css';

interface Props {
  analysisResult: AnalysisResult | null;
  accessState: AccessStateResult | null;
  articleDetected: boolean;
  loading: boolean;
  error: string | null;
  isCurrentSaved: boolean;
  onAnalyze: () => void;
  onRefresh: () => void;
  onSave: () => void;
  onCopyJson: () => void;
  onOpenArticle: () => void;
}

const AnalysisView: React.FC<Props> = ({
  analysisResult,
  accessState,
  articleDetected,
  loading,
  error,
  isCurrentSaved,
  onAnalyze,
  onRefresh,
  onSave,
  onCopyJson,
  onOpenArticle,
}) => {
  return (
    <div className="analysis-view">
      <SystemStatus
        articleDetected={articleDetected}
        accessState={accessState}
        loading={loading}
        error={error}
      />

      {!analysisResult && !loading && (
        <div className="analysis-empty">
          <p>
            Navigate to a news article and click &ldquo;Analyze&rdquo; to
            extract and analyze its content.
          </p>
          <button onClick={onAnalyze} className="primary-button">
            Analyze Article
          </button>
        </div>
      )}

      {loading && (
        <div className="analysis-loading">
          Analyzing article...
        </div>
      )}

      {analysisResult && !loading && (
        <>
          <ArticleContext
            structure={analysisResult.article_structure}
          />
          <ArticleBreakdown
            breakdown={analysisResult.structured_breakdown}
          />
          <FramingSignals
            signals={analysisResult.framing_signals}
            languageAnalysis={analysisResult.language_analysis}
          />
          <SourcesSection sources={analysisResult.sources} />
          <AuthorTransparency
            author={analysisResult.author_transparency}
          />
          <SimilarCoverage analysisResult={analysisResult} />

          {/* Notices / Warnings */}
          {analysisResult.meta.warnings.length > 0 && (
            <div className="card">
              <h3 className="section-title">Notices</h3>
              {analysisResult.meta.warnings.map((w, i) => (
                <p key={i} className="notice-text">
                  {w}
                </p>
              ))}
            </div>
          )}

          <ActionsBar
            onRefresh={onRefresh}
            onSave={onSave}
            onCopyJson={onCopyJson}
            onOpenArticle={onOpenArticle}
            isCurrentSaved={isCurrentSaved}
          />
          <Footer />
        </>
      )}
    </div>
  );
};

export default AnalysisView;
