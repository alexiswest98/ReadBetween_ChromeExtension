import { extractArticle } from './extractor';

console.log('[Read Between] Content script loaded.');

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_ARTICLE') {
    try {
      const result = extractArticle();
      sendResponse({ type: 'EXTRACTION_RESULT', data: result });
    } catch (err) {
      sendResponse({
        type: 'EXTRACTION_RESULT',
        data: {
          success: false,
          headline: '',
          publication: window.location.hostname,
          published_date: '',
          author_name: '',
          author_page_url: '',
          mainText: '',
          wordCount: 0,
          charCount: 0,
          extractionMethodUsed: 'body_fallback',
          url: window.location.href,
          paywallSignals: [],
          error:
            err instanceof Error ? err.message : 'Content script error',
        },
      });
    }
    return true;
  }
});
