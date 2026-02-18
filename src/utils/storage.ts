import { AnalysisResult, SavedArticle, StructuralPatterns } from '../types/models';

// Migrate old analysis results that used framing_signals to the new structural_patterns format
function migrateAnalysisResult(result: any): AnalysisResult {
  if (!result) return result;

  // Migrate framing_signals → structural_patterns
  if (!result.structural_patterns && result.framing_signals) {
    result.structural_patterns = {
      narrative_structure: { summary: '', evidence_quotes: [] },
      missing_context: { summary: '', evidence_quotes: [] },
    } as StructuralPatterns;
    delete result.framing_signals;
  } else if (!result.structural_patterns) {
    result.structural_patterns = {
      narrative_structure: { summary: '', evidence_quotes: [] },
      missing_context: { summary: '', evidence_quotes: [] },
    } as StructuralPatterns;
  }

  // Migrate language_analysis examples → words
  if (result.language_analysis) {
    const la = result.language_analysis;
    for (const key of ['emotional_emphasis', 'moral_framing', 'certainty_language'] as const) {
      if (la[key] && !la[key].words && la[key].examples) {
        la[key].words = la[key].examples.map((e: any) => e.word);
        delete la[key].examples;
      } else if (la[key] && !la[key].words) {
        la[key].words = [];
      }
    }
  }

  return result as AnalysisResult;
}

const KEYS = {
  LAST_ANALYSIS: 'lastAnalysisResult',
  LAST_URL: 'lastAnalysisUrl',
  SAVED_ARTICLES: 'savedArticles',
};

export async function saveLastAnalysis(
  result: AnalysisResult,
  url: string
): Promise<void> {
  await chrome.storage.local.set({
    [KEYS.LAST_ANALYSIS]: result,
    [KEYS.LAST_URL]: url,
  });
}

export async function loadLastAnalysis(): Promise<{
  result: AnalysisResult | null;
  url: string | null;
}> {
  const data = await chrome.storage.local.get([
    KEYS.LAST_ANALYSIS,
    KEYS.LAST_URL,
  ]);
  const raw = data[KEYS.LAST_ANALYSIS] || null;
  return {
    result: raw ? migrateAnalysisResult(raw) : null,
    url: data[KEYS.LAST_URL] || null,
  };
}

export async function loadSavedArticles(): Promise<SavedArticle[]> {
  const data = await chrome.storage.local.get(KEYS.SAVED_ARTICLES);
  const articles: SavedArticle[] = data[KEYS.SAVED_ARTICLES] || [];
  return articles.map((a) => ({
    ...a,
    analysisResult: migrateAnalysisResult(a.analysisResult),
  }));
}

export async function saveArticle(
  article: SavedArticle
): Promise<SavedArticle[]> {
  const existing = await loadSavedArticles();
  const filtered = existing.filter((a) => a.url !== article.url);
  const updated = [article, ...filtered];
  await chrome.storage.local.set({ [KEYS.SAVED_ARTICLES]: updated });
  return updated;
}

export async function removeArticle(id: string): Promise<SavedArticle[]> {
  const existing = await loadSavedArticles();
  const updated = existing.filter((a) => a.id !== id);
  await chrome.storage.local.set({ [KEYS.SAVED_ARTICLES]: updated });
  return updated;
}

export function generateId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2)
  );
}
