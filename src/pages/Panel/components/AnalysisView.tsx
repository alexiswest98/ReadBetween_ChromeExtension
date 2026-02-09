import React from 'react';
import { AnalysisResult, AccessStateResult } from '../../../types/models';
import SystemStatus from './SystemStatus';
import ArticleContext from './ArticleContext';
import ArticleBreakdown from './ArticleBreakdown';
import FramingSignals from './FramingSignals';
import SourcesSection from './SourcesSection';
import AuthorTransparency from './AuthorTransparency';
import ActionsBar from './ActionsBar';
import Footer from './Footer';

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
    <div style={{ padding: '12px 16px' }}>
      <SystemStatus
        articleDetected={articleDetected}
        accessState={accessState}
        loading={loading}
        error={error}
      />

      {!analysisResult && !loading && (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p style={{ color: '#666', marginBottom: '16px' }}>
            Navigate to a news article and click &ldquo;Analyze&rdquo; to
            extract and analyze its content.
          </p>
          <button onClick={onAnalyze} style={primaryButtonStyle}>
            Analyze Article
          </button>
        </div>
      )}

      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '32px 16px',
            color: '#666',
          }}
        >
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

          {/* Notices / Warnings */}
          {analysisResult.meta.warnings.length > 0 && (
            <div style={cardStyle}>
              <h3 style={sectionTitleStyle}>Notices</h3>
              {analysisResult.meta.warnings.map((w, i) => (
                <p
                  key={i}
                  style={{
                    color: '#888',
                    fontSize: '12px',
                    margin: '4px 0',
                  }}
                >
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

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: '#1a1a1a',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
};

const cardStyle: React.CSSProperties = {
  marginBottom: '12px',
  padding: '12px',
  background: '#fff',
  borderRadius: '6px',
  border: '1px solid #e8e8e8',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#999',
};

export default AnalysisView;
