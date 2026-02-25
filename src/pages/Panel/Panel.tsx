import React, { useState, useEffect, useCallback } from 'react';
import {
  AnalysisResult,
  ExtractionResult,
  AccessStateResult,
  SavedArticle,
  StageStatus,
  Stage1Response,
} from '../../types/models';
import { streamStage1, fetchStage2, analyzeArticleFallback, formatDate } from '../../utils/analyzer';
import { fetchSimilarCoverage } from '../../utils/similarCoverage';
import { preprocessArticle } from '../../utils/preprocessArticle';
import { findSources } from '../../utils/sourceFinder';
import { analyzeLanguage } from '../../utils/framingSignals';
import { calculateReadingTime } from '../../utils/textUtils';
import { determineAccessState } from '../../utils/accessState';
import {
  saveLastAnalysis,
  loadLastAnalysis,
  loadSavedArticles,
  saveArticle,
  removeArticle,
  generateId,
} from '../../utils/storage';
import AnalysisView from './components/AnalysisView/AnalysisView';
import SavedArticlesView from './components/SavedArticlesView/SavedArticlesView';
import './Panel.css';

type View = 'analysis' | 'saved';

const Panel: React.FC = () => {
  const [view, setView] = useState<View>('analysis');
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResult | null>(null);
  const [accessState, setAccessState] =
    useState<AccessStateResult | null>(null);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [stage2Status, setStage2Status] = useState<StageStatus>('idle');
  const [stage3Status, setStage3Status] = useState<StageStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [articleDetected, setArticleDetected] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { result, url } = await loadLastAnalysis();
        if (result) {
          setAnalysisResult(result);
          setCurrentUrl(url);
          setArticleDetected(true);
        }
        const saved = await loadSavedArticles();
        setSavedArticles(saved);
      } catch (err) {
        console.error('[Read Between] Failed to load saved data:', err);
      }
    };
    init();
  }, []);

  const extractFromTab =
    useCallback(async (): Promise<ExtractionResult | null> => {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];
      if (!tab?.id) {
        setError('No active tab found.');
        return null;
      }

      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'EXTRACT_ARTICLE',
        });
        if (response?.data) return response.data as ExtractionResult;
        setError(
          'No response from content script. Try refreshing the page.'
        );
        return null;
      } catch {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['contentScript.bundle.js'],
          });
          await new Promise((r) => setTimeout(r, 100));
          const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'EXTRACT_ARTICLE',
          });
          if (response?.data) return response.data as ExtractionResult;
          setError('Extraction failed after injection. Refresh the page.');
          return null;
        } catch {
          setError(
            'Could not connect to page. Make sure you are on a web page and try refreshing.'
          );
          return null;
        }
      }
    }, []);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setArticleDetected(false);
    setAnalysisResult(null);
    setExtractionResult(null);
    setStage2Status('idle');
    setStage3Status('idle');

    try {
      // — Extract article from page —
      const extraction = await extractFromTab();
      if (!extraction) {
        setLoading(false);
        return;
      }
      if (!extraction.success) {
        setError(extraction.error || 'Failed to extract article content.');
        setLoading(false);
        return;
      }
      if (extraction.wordCount < 50) {
        setError('No article content detected on this page.');
        setLoading(false);
        return;
      }

      // Show ArticleContext immediately
      setExtractionResult(extraction);
      setArticleDetected(true);
      setCurrentUrl(extraction.url);

      const access = determineAccessState(extraction);
      setAccessState(access);

      // Preprocess article text
      const cleanedText = preprocessArticle(extraction.mainText);

      // Regex-based sources (synchronous, no API cost)
      const sourceResult = findSources(extraction.mainText);
      const warnings: string[] = [...sourceResult.warnings];
      const sources = { items: sourceResult.items };

      const article_structure = {
        headline: extraction.headline || 'No headline detected',
        publication: extraction.publication,
        published_date: formatDate(extraction.published_date),
        reading_time: calculateReadingTime(extraction.wordCount),
      };

      // — Stage 1: Critical analysis —
      let stage1Result: Stage1Response;
      try {
        stage1Result = await streamStage1(
          cleanedText,
          extraction.headline,
          (_points) => {
            // Points stream in — cards are hidden during Stage 1 per UX choice
          }
        );
      } catch (streamErr) {
        console.warn('[Read Between] Stage 1 stream failed, using fallback:', streamErr);
        const fallback = await analyzeArticleFallback(extraction);
        setAnalysisResult(fallback);
        await saveLastAnalysis(fallback, extraction.url);
        setLoading(false);
        return;
      }

      // Compute lexical analysis locally (no API tokens)
      const language_analysis = analyzeLanguage(cleanedText);

      // Build initial AnalysisResult from Stage 1 data
      const initialResult: AnalysisResult = {
        article_structure,
        structured_breakdown: { reported_points: stage1Result.reported_points },
        sources,
        structural_patterns: {
          missing_context: {
            summary: stage1Result.missing_context_summary,
            evidence_quotes: [],
          },
          narrative_structure: {
            summary: '',
            evidence_quotes: [],
          },
        },
        language_analysis,
        author_transparency: {
          author_name: extraction.author_name || 'Not identified',
          publisher: extraction.publication,
          author_page_url: extraction.author_page_url || '',
          previous_articles: [],
          previous_articles_state: 'not_available_from_publisher_page',
        },
        similar_coverage: { items: [] },
        meta: {
          schema_version: 'mvp-2.0',
          generated_at: new Date().toISOString(),
          warnings,
        },
      };

      setAnalysisResult(initialResult);
      setLoading(false); // UI is now interactive

      // Storage write is non-blocking — don't await so setLoading(false) flushes immediately
      saveLastAnalysis(initialResult, extraction.url).catch(console.error);

      // — Stage 2 and Stage 3: run concurrently in background —
      const cleanedTextSlice = cleanedText.substring(0, 5000);

      const runStage2 = async () => {
        setStage2Status('loading');
        try {
          const stage2 = await fetchStage2({
            cleanedTextSlice,
            reported_points: stage1Result.reported_points,
            missing_context_summary: stage1Result.missing_context_summary,
          });
          setAnalysisResult((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              structural_patterns: {
                ...prev.structural_patterns,
                narrative_structure: {
                  summary: stage2.narrative_structure_summary,
                  evidence_quotes: [],
                },
              },
              language_analysis: {
                ...prev.language_analysis,
                notable_choices: stage2.tone_notable_choices,
              },
            };
          });
          setStage2Status('done');
        } catch (err) {
          console.warn('[Read Between] Stage 2 failed:', err);
          setStage2Status('error');
        }
      };

      const runStage3 = async () => {
        setStage3Status('loading');
        try {
          const items = await fetchSimilarCoverage({
            headline: article_structure.headline,
            publication: article_structure.publication,
            published_date: article_structure.published_date,
            reported_points: stage1Result.reported_points,
            sources: sources.items,
          });
          setAnalysisResult((prev) => {
            if (!prev) return prev;
            return { ...prev, similar_coverage: { items } };
          });
          setStage3Status('done');
        } catch (err) {
          console.warn('[Read Between] Stage 3 failed:', err);
          setStage3Status('error');
        }
      };

      // Fire both background stages simultaneously, don't await them
      Promise.allSettled([runStage2(), runStage3()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
      setLoading(false);
    }
  }, [extractFromTab]);

  const handleSave = useCallback(async () => {
    if (!analysisResult || !currentUrl) return;

    const saved: SavedArticle = {
      id: generateId(),
      url: currentUrl,
      headline: analysisResult.article_structure.headline,
      publisher: analysisResult.article_structure.publication,
      savedAt: new Date().toISOString(),
      accessState: accessState?.state || 'full_access',
      analysisResult,
    };

    const updated = await saveArticle(saved);
    setSavedArticles(updated);
  }, [analysisResult, currentUrl, accessState]);

  const handleLoadSaved = useCallback((article: SavedArticle) => {
    setAnalysisResult(article.analysisResult);
    setExtractionResult(null);
    setCurrentUrl(article.url);
    setAccessState({ state: article.accessState, reasons: [] });
    setArticleDetected(true);
    setError(null);
    setStage2Status('idle');
    setStage3Status('idle');
    setView('analysis');
  }, []);

  const handleRemoveSaved = useCallback(async (id: string) => {
    const updated = await removeArticle(id);
    setSavedArticles(updated);
  }, []);

  const handleCopyJson = useCallback(() => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(JSON.stringify(analysisResult, null, 2));
  }, [analysisResult]);

  const handleOpenArticle = useCallback(() => {
    if (currentUrl) {
      chrome.tabs.create({ url: currentUrl });
    }
  }, [currentUrl]);

  const isCurrentSaved = savedArticles.some((a) => a.url === currentUrl);

  return (
    <div className="panel-root">
      {/* Tab bar */}
      <div className="tab-bar">
        <button
          onClick={() => setView('saved')}
          className={`tab-button${view === 'saved' ? ' active' : ''}`}
        >
          Saved
        </button>
        <button
          onClick={() => setView('analysis')}
          className={`tab-button${view === 'analysis' ? ' active' : ''}`}
        >
          Primary
        </button>
      </div>

      {/* Content */}
      {view === 'analysis' ? (
        <AnalysisView
          analysisResult={analysisResult}
          extractionResult={extractionResult}
          accessState={accessState}
          articleDetected={articleDetected}
          loading={loading}
          stage2Status={stage2Status}
          stage3Status={stage3Status}
          error={error}
          isCurrentSaved={isCurrentSaved}
          onAnalyze={handleAnalyze}
          onRefresh={handleAnalyze}
          onSave={handleSave}
          onCopyJson={handleCopyJson}
          onOpenArticle={handleOpenArticle}
        />
      ) : (
        <SavedArticlesView
          articles={savedArticles}
          onLoadArticle={handleLoadSaved}
          onRemoveArticle={handleRemoveSaved}
        />
      )}
    </div>
  );
};

export default Panel;
