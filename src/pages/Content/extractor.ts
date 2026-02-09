import { ExtractionResult, ExtractionMethod } from '../../types/models';

function getMetaContent(names: string[]): string {
  for (const name of names) {
    const metaName = document.querySelector(`meta[name="${name}"]`);
    if (metaName) {
      const content = metaName.getAttribute('content');
      if (content) return content.trim();
    }
    const metaProp = document.querySelector(`meta[property="${name}"]`);
    if (metaProp) {
      const content = metaProp.getAttribute('content');
      if (content) return content.trim();
    }
  }
  return '';
}

function extractHeadline(): string {
  const ogTitle = getMetaContent(['og:title']);
  if (ogTitle) return ogTitle;

  const h1 =
    document.querySelector('article h1') || document.querySelector('h1');
  if (h1 && h1.textContent) return h1.textContent.trim();

  return document.title || '';
}

function extractPublishedDate(): string {
  const dateMeta = getMetaContent([
    'article:published_time',
    'datePublished',
    'date',
    'DC.date.issued',
    'sailthru.date',
    'publishdate',
    'publish-date',
  ]);
  if (dateMeta) return dateMeta;

  const timeEl =
    document.querySelector('article time[datetime]') ||
    document.querySelector('time[datetime]');
  if (timeEl) {
    const dt = timeEl.getAttribute('datetime');
    if (dt) return dt;
  }

  const timeText =
    document.querySelector('article time') ||
    document.querySelector('time');
  if (timeText && timeText.textContent) return timeText.textContent.trim();

  return '';
}

function extractAuthor(): { name: string; url: string } {
  const authorMeta = getMetaContent([
    'author',
    'article:author',
    'DC.creator',
    'byl',
  ]);

  const authorSelectors = [
    '[rel="author"]',
    '.author',
    '.byline',
    '.article-author',
    '[class*="author"]',
    '[class*="byline"]',
    '[data-testid="authorName"]',
  ];

  let authorName = authorMeta;
  let authorUrl = '';

  for (const selector of authorSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      if (!authorName && el.textContent) {
        authorName = el.textContent.replace(/^by\s+/i, '').trim();
      }
      if (el.tagName === 'A') {
        authorUrl = (el as HTMLAnchorElement).href || '';
      } else {
        const link = el.querySelector('a');
        if (link) {
          authorUrl = link.href || '';
          if (!authorName && link.textContent) {
            authorName = link.textContent.replace(/^by\s+/i, '').trim();
          }
        }
      }
      if (authorName) break;
    }
  }

  return { name: authorName, url: authorUrl };
}

function getPublication(): string {
  const siteName = getMetaContent(['og:site_name', 'application-name']);
  if (siteName) return siteName;

  return window.location.hostname.replace(/^www\./, '');
}

function cleanElement(el: Element): string {
  const clone = el.cloneNode(true) as Element;

  const removeSelectors = [
    'script',
    'style',
    'nav',
    'footer',
    'header',
    'aside',
    'iframe',
    'form',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="complementary"]',
    '[role="contentinfo"]',
    '.ad',
    '.ads',
    '.advertisement',
    '.social-share',
    '.related-articles',
    '.newsletter-signup',
    '.comments',
    '[class*="sidebar"]',
    '[class*="nav-"]',
    '[class*="footer"]',
    '[class*="header-"]',
    '[class*="menu"]',
    '[class*="ad-"]',
    '[class*="social"]',
    '[class*="share"]',
    '[class*="related"]',
    '[class*="newsletter"]',
    '[class*="comment"]',
    '[class*="promo"]',
  ];

  for (const selector of removeSelectors) {
    clone.querySelectorAll(selector).forEach((child) => child.remove());
  }

  return (clone.textContent || '').replace(/\s+/g, ' ').trim();
}

function findArticleContent(): { text: string; method: ExtractionMethod } {
  const article = document.querySelector('article');
  if (article) {
    const text = cleanElement(article);
    if (text.length > 100) {
      return { text, method: 'article_element' };
    }
  }

  const candidates = document.querySelectorAll(
    'main, [role="main"], .article-body, .article-content, .post-content, ' +
      '.entry-content, .story-body, [class*="article-body"], [class*="story-content"], ' +
      '[class*="post-body"], [itemprop="articleBody"]'
  );

  let bestText = '';
  for (const candidate of Array.from(candidates)) {
    const text = cleanElement(candidate);
    if (text.length > bestText.length) {
      bestText = text;
    }
  }

  if (bestText.length > 100) {
    return { text: bestText, method: 'largest_container' };
  }

  const bodyText = cleanElement(document.body);
  return { text: bodyText, method: 'body_fallback' };
}

function detectPaywallSignals(): string[] {
  const signals: string[] = [];

  const paywallSelectors = [
    '[class*="paywall"]',
    '[class*="Paywall"]',
    '[id*="paywall"]',
    '[id*="Paywall"]',
    '[class*="subscribe-wall"]',
    '[class*="gate"]',
    '[class*="regwall"]',
    '[class*="meter-"]',
    '[data-testid*="paywall"]',
  ];

  for (const selector of paywallSelectors) {
    if (document.querySelector(selector)) {
      signals.push('paywall-overlay-detected');
      break;
    }
  }

  const bodyText = document.body.textContent || '';
  const subscribePatterns = [
    /subscribe to (?:continue|read|access)/i,
    /sign (?:in|up) to (?:continue|read|access)/i,
    /(?:become a|create an?) (?:member|subscriber|account)/i,
    /this (?:article|content|story) is (?:for|available to) (?:subscribers|members|premium)/i,
    /you(?:'ve| have) reached your (?:free|monthly) (?:article|story) limit/i,
  ];

  for (const pattern of subscribePatterns) {
    if (pattern.test(bodyText)) {
      signals.push('subscribe-prompt-found');
      break;
    }
  }

  const truncationSelectors = [
    '[class*="truncat"]',
    '[class*="fade-out"]',
    '[class*="content-mask"]',
    '[class*="read-more-overlay"]',
  ];

  for (const selector of truncationSelectors) {
    if (document.querySelector(selector)) {
      signals.push('content-truncated-marker');
      break;
    }
  }

  return signals;
}

export function extractArticle(): ExtractionResult {
  try {
    const headline = extractHeadline();
    const publication = getPublication();
    const published_date = extractPublishedDate();
    const author = extractAuthor();
    const { text: mainText, method } = findArticleContent();
    const paywallSignals = detectPaywallSignals();

    const wordCount = mainText
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const charCount = mainText.length;

    return {
      success: true,
      headline,
      publication,
      published_date,
      author_name: author.name,
      author_page_url: author.url,
      mainText,
      wordCount,
      charCount,
      extractionMethodUsed: method,
      url: window.location.href,
      paywallSignals,
    };
  } catch (err) {
    return {
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
        err instanceof Error ? err.message : 'Unknown extraction error',
    };
  }
}
