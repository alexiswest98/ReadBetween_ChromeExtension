import {
  ExtractionResult,
  AnalysisResult,
  SimilarCoverageItem,
} from '../types/models';
import { calculateReadingTime, splitSentences, cleanText } from './textUtils';
import { findSources } from './sourceFinder';
import { detectFramingSignals, analyzeLanguage } from './framingSignals';

function extractReportedPoints(text: string): string[] {
  const sentences = splitSentences(text);
  const scored: Array<{ sentence: string; score: number; index: number }> = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    let score = 0;

    if (/\d+/.test(sentence)) score += 2;

    const namedEntities = sentence.match(/[A-Z][a-z]{2,}/g);
    if (namedEntities && namedEntities.length >= 2) score += 2;

    if (
      /\b(?:said|announced|reported|confirmed|stated|revealed|disclosed)\b/i.test(
        sentence
      )
    )
      score += 3;

    if (
      /\b(?:according|percent|million|billion|increase|decrease|rate|total)\b/i.test(
        sentence
      )
    )
      score += 2;

    if (sentence.length < 40 || sentence.length > 300) score -= 1;

    if (
      /\b(?:I think|I believe|in my opinion|arguably|seems to)\b/i.test(
        sentence
      )
    )
      score -= 3;

    if (i < 3) score += 1;

    if (score > 0) {
      scored.push({ sentence: cleanText(sentence), score, index: i });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);

  top.sort((a, b) => a.index - b.index);
  return top.map((t) => t.sentence);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Not available';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function analyzeArticle(extraction: ExtractionResult): AnalysisResult {
  const warnings: string[] = [];

  const article_structure = {
    headline: extraction.headline || 'No headline detected',
    publication: extraction.publication,
    published_date: formatDate(extraction.published_date),
    reading_time: calculateReadingTime(extraction.wordCount),
  };

  const reportedPoints = extractReportedPoints(extraction.mainText);
  if (reportedPoints.length === 0) {
    warnings.push('Unable to extract factual claims from article text.');
  }
  const structured_breakdown = {
    reported_points:
      reportedPoints.length > 0
        ? reportedPoints
        : ['Insufficient text to extract reported facts.'],
  };

  const sourceResult = findSources(extraction.mainText);
  warnings.push(...sourceResult.warnings);
  const sources = { items: sourceResult.items };

  const framingResult = detectFramingSignals(extraction.mainText);
  warnings.push(...framingResult.warnings);
  const framing_signals = {
    state: framingResult.state,
    signals: framingResult.signals,
  };

  const language_analysis = analyzeLanguage(extraction.mainText);

  const author_transparency = {
    author_name: extraction.author_name || 'Not identified',
    publisher: extraction.publication,
    author_page_url: extraction.author_page_url || '',
    previous_articles: [],
    previous_articles_state: 'not_available_from_publisher_page' as const,
  };

  const similar_coverage = { items: [] };

  const meta = {
    schema_version: 'mvp-1.0',
    generated_at: new Date().toISOString(),
    warnings,
  };

  return {
    article_structure,
    structured_breakdown,
    sources,
    framing_signals,
    language_analysis,
    author_transparency,
    similar_coverage,
    meta,
  };
}

export async function getSimilarCoverage(
  _query: string
): Promise<SimilarCoverageItem[]> {
  // Stub: implement with web search API when available
  return [];
}
