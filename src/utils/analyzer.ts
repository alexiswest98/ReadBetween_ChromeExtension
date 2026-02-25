import OpenAI from 'openai';
import {
  ExtractionResult,
  AnalysisResult,
  StructuredBreakdown,
  StructuralPatterns,
  LanguageAnalysis,
  Stage1Response,
  Stage2Response,
} from '../types/models';
import { calculateReadingTime, splitSentences, cleanText } from './textUtils';
import { findSources } from './sourceFinder';
import { detectStructuralPatterns, analyzeLanguage } from './framingSignals';

// ========== OpenAI client factory ==========

function createClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured.');
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
}

// ========== Stage 1 Schema (flat, minimal) ==========

const stage1Schema = {
  type: 'object' as const,
  properties: {
    reported_points: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Exactly 4 fact-focused bullet points summarizing what is being reported.',
    },
    missing_context_summary: {
      type: 'string' as const,
      description: '1-3 concise sentences identifying contextual dimensions not addressed in the article.',
    },
  },
  required: ['reported_points', 'missing_context_summary'] as const,
  additionalProperties: false,
};

// ========== Stage 2 Schema (flat, minimal) ==========

const stage2Schema = {
  type: 'object' as const,
  properties: {
    narrative_structure_summary: {
      type: 'string' as const,
      description: '2-4 sentences describing how the article organizes attention and sourcing.',
    },
    tone_notable_choices: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: '1-3 short observations about overall tone or rhetorical patterns.',
    },
  },
  required: ['narrative_structure_summary', 'tone_notable_choices'] as const,
  additionalProperties: false,
};

// ========== Stage 1: Critical analysis (non-streaming) ==========

export async function streamStage1(
  cleanedText: string,
  headline: string,
  _onPointsUpdate: (points: string[]) => void
): Promise<Stage1Response> {
  const client = createClient();

  const response = await client.responses.create({
    model: 'gpt-4.1',
    instructions: `
You are an impartial news-analysis assistant for a media literacy tool called **Read Between**.

You will receive an article headline and article text.
Analyze ONLY the provided article — no outside knowledge, no fact-checking.

Return output as valid JSON only.

# Section 1 — Reported Points (reported_points)

Summarize what the article reports in EXACTLY 4 bullet points.

Rules:
- Only summarize what appears in the article.
- No added context, interpretation, or speculation.
- Each bullet must be one concise sentence.
- Focus on events, claims, and key actors.

# Section 2 — Missing Context (missing_context_summary)

Identify contextual dimensions not addressed in the article in 1-3 concise sentences.

Rules:
- Do NOT introduce outside facts.
- Frame only as absence: "The article does not include…", "No historical background is provided…"
- If no gaps are identifiable, return: "No significant contextual gaps detected based on the article's scope."
`.trim(),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Headline: ${headline}\n\nArticle text:\n${cleanedText}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'stage1_analysis',
        strict: true,
        schema: stage1Schema,
      } as any,
    },
  });

  return JSON.parse(response.output_text) as Stage1Response;
}

// ========== Stage 2: Background enrichment ==========

export async function fetchStage2(context: {
  cleanedTextSlice: string;
  reported_points: string[];
  missing_context_summary: string;
}): Promise<Stage2Response> {
  const client = createClient();

  const response = await client.responses.create({
    model: 'gpt-4.1',
    instructions: `
You are an impartial news-analysis assistant for a media literacy tool called **Read Between**.

You are receiving a SHORT EXCERPT (not the full article) plus a pre-generated summary of what the article reports.
Use both to answer the following sections. Do not speculate beyond what the summary and excerpt reveal.

Return output as valid JSON only.

# Narrative Structure (narrative_structure_summary)

Describe how the article organizes attention and sourcing in 2-4 concise sentences.
Consider: who is emphasized, sourcing balance, headline vs. body emphasis.
Neutral, observational tone only. Do not use words like bias, misleading, or spin.

# Tone Indicators (tone_notable_choices)

Provide 1-3 short observations about overall tone or rhetorical patterns.
Keep observations descriptive, not evaluative.
`.trim(),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Article excerpt (first ~5000 chars):\n${context.cleanedTextSlice}\n\nWhat the article reports:\n${context.reported_points.join('\n')}\n\nMissing context identified:\n${context.missing_context_summary}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'stage2_enrichment',
        strict: true,
        schema: stage2Schema,
      } as any,
    },
  });

  return JSON.parse(response.output_text) as Stage2Response;
}

// ========== Fallback: regex-based extraction ==========

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
  const top = scored.slice(0, 4);
  top.sort((a, b) => a.index - b.index);
  return top.map((t) => t.sentence);
}

// ========== Helpers ==========

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

// ========== Legacy single-shot wrapper (used as fallback) ==========

export async function analyzeArticleFallback(
  extraction: ExtractionResult
): Promise<AnalysisResult> {
  const warnings: string[] = [];

  const article_structure = {
    headline: extraction.headline || 'No headline detected',
    publication: extraction.publication,
    published_date: formatDate(extraction.published_date),
    reading_time: calculateReadingTime(extraction.wordCount),
  };

  const sourceResult = findSources(extraction.mainText);
  warnings.push(...sourceResult.warnings);
  const sources = { items: sourceResult.items };

  let structured_breakdown: StructuredBreakdown;
  let structural_patterns: StructuralPatterns;
  let language_analysis: LanguageAnalysis;

  const reportedPoints = extractReportedPoints(extraction.mainText);
  if (reportedPoints.length === 0) {
    warnings.push('Unable to extract factual claims from article text.');
  }
  structured_breakdown = {
    reported_points:
      reportedPoints.length > 0
        ? reportedPoints
        : ['Insufficient text to extract reported facts.'],
  };

  const fallback = detectStructuralPatterns(extraction.mainText);
  warnings.push(...fallback.warnings);
  structural_patterns = fallback.patterns;
  language_analysis = analyzeLanguage(extraction.mainText);

  const author_transparency = {
    author_name: extraction.author_name || 'Not identified',
    publisher: extraction.publication,
    author_page_url: extraction.author_page_url || '',
    previous_articles: [],
    previous_articles_state: 'not_available_from_publisher_page' as const,
  };

  const similar_coverage = { items: [] };

  const meta = {
    schema_version: 'mvp-2.0',
    generated_at: new Date().toISOString(),
    warnings,
  };

  return {
    article_structure,
    structured_breakdown,
    sources,
    structural_patterns,
    language_analysis,
    author_transparency,
    similar_coverage,
    meta,
  };
}

// ========== formatDate export for Panel.tsx ==========

export { formatDate };
