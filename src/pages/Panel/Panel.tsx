import React, { useState, useEffect, useCallback } from 'react';
import {
  AnalysisResult,
  ExtractionResult,
  AccessStateResult,
  SavedArticle,
} from '../../types/models';
import { analyzeArticle } from '../../utils/analyzer';
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
import logo from '../../assets/img/ReadBetweenLogo_White.png';

type View = 'analysis' | 'saved';

const Panel: React.FC = () => {
  const [view, setView] = useState<View>('analysis');
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);
  const [accessState, setAccessState] =
    useState<AccessStateResult | null>(null);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(false);
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
        // Content script not injected — try programmatic injection
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['contentScript.bundle.js'],
          });
          // Brief delay for script initialization
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

    try {
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

      setArticleDetected(true);
      setCurrentUrl(extraction.url);

      const access = determineAccessState(extraction);
      setAccessState(access);

      const result = analyzeArticle(extraction);
      setAnalysisResult(result);

      await saveLastAnalysis(result, extraction.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Analysis failed.'
      );
    } finally {
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
    setCurrentUrl(article.url);
    setAccessState({ state: article.accessState, reasons: [] });
    setArticleDetected(true);
    setError(null);
    setView('analysis');
  }, []);

  const handleRemoveSaved = useCallback(async (id: string) => {
    const updated = await removeArticle(id);
    setSavedArticles(updated);
  }, []);

  const handleCopyJson = useCallback(() => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(
      JSON.stringify(analysisResult, null, 2)
    );
  }, [analysisResult]);

  const handleOpenArticle = useCallback(() => {
    if (currentUrl) {
      chrome.tabs.create({ url: currentUrl });
    }
  }, [currentUrl]);

  const isCurrentSaved = savedArticles.some((a) => a.url === currentUrl);

  return (
    <div className="panel-root">
      {/* Header - commented out for now
      <div className="panel-header">
        <img src={logo} alt="Read Between" />
      </div>
      */}

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
          accessState={accessState}
          articleDetected={articleDetected}
          loading={loading}
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
