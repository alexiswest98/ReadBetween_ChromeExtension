import React from 'react';
import {
  AnalysisResult,
  AccessStateResult,
  ExtractionResult,
  StageStatus,
} from '../../../../types/models';
import { calculateReadingTime } from '../../../../utils/textUtils';
import { formatDate } from '../../../../utils/analyzer';
import ArticleContext from '../ArticleContext/ArticleContext';
import ArticleBreakdown from '../ArticleBreakdown/ArticleBreakdown';
import SourcesSection from '../SourcesSection/SourcesSection';
import { MissingContextCard, NarrativeStructureCard, ToneIndicatorsCard } from '../FramingSignals/FramingSignals';
import AuthorTransparency from '../AuthorTransparency/AuthorTransparency';
import SimilarCoverage from '../SimilarCoverage/SimilarCoverage';
import CollapsibleCard from '../CollapsibleCard/CollapsibleCard';
import ActionsBar from '../ActionsBar/ActionsBar';
import Footer from '../Footer/Footer';
import logo from '../../../../assets/img/ReadBetweenLogo_White.png';
import './AnalysisView.css';

interface Props {
  analysisResult: AnalysisResult | null;
  extractionResult: ExtractionResult | null;
  accessState: AccessStateResult | null;
  articleDetected: boolean;
  loading: boolean;
  stage2Status: StageStatus;
  stage3Status: StageStatus;
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
  extractionResult,
  accessState,
  articleDetected,
  loading,
  stage2Status,
  stage3Status,
  error,
  isCurrentSaved,
  onAnalyze,
  onRefresh,
  onSave,
  onCopyJson,
  onOpenArticle,
}) => {
  // Build a preview ArticleStructure from extraction data for early display
  const previewStructure = extractionResult
    ? {
        headline: extractionResult.headline || 'No headline detected',
        publication: extractionResult.publication,
        published_date: formatDate(extractionResult.published_date),
        reading_time: calculateReadingTime(extractionResult.wordCount),
      }
    : null;

  // Use actual result when available; fall back to extraction preview during Stage 1
  const contextStructure = analysisResult?.article_structure ?? previewStructure;

  return (
    <div className="analysis-view">

      {!articleDetected && !loading && (
        <div className="analysis-empty">
          <img src={logo} alt="Read Between" className="analysis-logo" />
          <p className="analysis-tagline">
            Read Between summarizes articles and highlights how news is
            framed, not whether it&rsquo;s true or false.
          </p>
          <p className="analysis-description">
            Analyze an article to see a neutral summary, key quotes,
            framing signals that show how information is emphasized and
            presented, author context, and related coverage from other
            publishers.
          </p>
          <p className="analysis-save-hint">
            Save articles to revisit later.
          </p>
          <button onClick={onAnalyze} className="primary-button">
            Analyze Article
          </button>
        </div>
      )}

      {/* Show ArticleContext as soon as structure data is available */}
      {contextStructure && (articleDetected || loading) && (
        <ArticleContext structure={contextStructure} />
      )}

      {loading && (
        <div className="analysis-loading">
          Analyzing article…
        </div>
      )}

      {analysisResult && !loading && (
        <>
          <CollapsibleCard id="summary-card" title="What's Being Reported" titleClassName="section-title">
            <ArticleBreakdown breakdown={analysisResult.structured_breakdown} />
          </CollapsibleCard>

          <CollapsibleCard id="sources-card" title="Sources & Attribution" titleClassName="section-title">
            <SourcesSection sources={analysisResult.sources} />
          </CollapsibleCard>

          <CollapsibleCard id="missing-card" title="What's Not Included" titleClassName="section-title">
            <MissingContextCard missingContext={analysisResult.structural_patterns.missing_context} />
          </CollapsibleCard>

          <CollapsibleCard id="narrative-card" title="How the Story Is Structured" titleClassName="section-title white-title" defaultOpen={false} variant="dark">
            <NarrativeStructureCard
              narrativeStructure={analysisResult.structural_patterns.narrative_structure}
              isLoading={stage2Status === 'loading'}
            />
          </CollapsibleCard>

          <CollapsibleCard title="Tone Indicators" titleClassName="section-title white-title" defaultOpen={false} variant="dark">
            <ToneIndicatorsCard
              languageAnalysis={analysisResult.language_analysis}
              isLoading={stage2Status === 'loading'}
            />
          </CollapsibleCard>

          <CollapsibleCard id="author-card" title="Author Transparency" titleClassName="section-title white-title" defaultOpen={false} variant="dark">
            <AuthorTransparency author={analysisResult.author_transparency} />
          </CollapsibleCard>

          <CollapsibleCard id="coverage-card" title="Find Similar Coverage" titleClassName="section-title white-title" defaultOpen={false} variant="dark">
            <SimilarCoverage
              analysisResult={analysisResult}
              stage3Status={stage3Status}
            />
          </CollapsibleCard>

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
