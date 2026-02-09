import { AnalysisResult, SavedArticle } from '../types/models';

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
  return {
    result: data[KEYS.LAST_ANALYSIS] || null,
    url: data[KEYS.LAST_URL] || null,
  };
}

export async function loadSavedArticles(): Promise<SavedArticle[]> {
  const data = await chrome.storage.local.get(KEYS.SAVED_ARTICLES);
  return data[KEYS.SAVED_ARTICLES] || [];
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
