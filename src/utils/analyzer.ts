import OpenAI from 'openai';
import {
  ExtractionResult,
  AnalysisResult,
  StructuredBreakdown,
  StructuralPatterns,
  LanguageAnalysis,
  SimilarCoverageItem,
} from '../types/models';
import { calculateReadingTime, splitSentences, cleanText } from './textUtils';
import { findSources } from './sourceFinder';
import { detectStructuralPatterns, analyzeLanguage } from './framingSignals';

// ========== JSON Schema for the combined API response ==========

const analysisResponseSchema = {
  type: 'object' as const,
  properties: {
    reported_points: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: '3-5 fact-focused bullet points summarizing what is being reported.',
    },
    structural_patterns: {
      type: 'object' as const,
      properties: {
        narrative_structure: {
          type: 'object' as const,
          properties: {
            summary: {
              type: 'string' as const,
              description: '2-4 concise sentences describing how the article organizes attention and sourcing.',
            },
            evidence_quotes: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: '1-3 direct evidence quotes (max 200 chars each).',
            },
          },
          required: ['summary', 'evidence_quotes'] as const,
          additionalProperties: false,
        },
        missing_context: {
          type: 'object' as const,
          properties: {
            summary: {
              type: 'string' as const,
              description: '1-3 concise sentences identifying contextual dimensions not addressed.',
            },
            evidence_quotes: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: '0-2 evidence quotes showing what is covered to justify the gap.',
            },
          },
          required: ['summary', 'evidence_quotes'] as const,
          additionalProperties: false,
        },
      },
      required: ['narrative_structure', 'missing_context'] as const,
      additionalProperties: false,
    },
    language_analysis: {
      type: 'object' as const,
      properties: {
        emotional_emphasis: {
          type: 'object' as const,
          properties: {
            count: { type: 'number' as const },
            words: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Up to 5 emotionally charged words. Words only, no sentences.',
            },
          },
          required: ['count', 'words'] as const,
          additionalProperties: false,
        },
        moral_framing: {
          type: 'object' as const,
          properties: {
            count: { type: 'number' as const },
            words: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Up to 5 moral/duty words. Words only, no sentences.',
            },
          },
          required: ['count', 'words'] as const,
          additionalProperties: false,
        },
        certainty_language: {
          type: 'object' as const,
          properties: {
            count: { type: 'number' as const },
            words: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Up to 5 high-certainty words. Words only, no sentences.',
            },
          },
          required: ['count', 'words'] as const,
          additionalProperties: false,
        },
        notable_choices: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: '1-3 short observations about overall tone or rhetorical patterns.',
        },
      },
      required: ['emotional_emphasis', 'moral_framing', 'certainty_language', 'notable_choices'] as const,
      additionalProperties: false,
    },
  },
  required: ['reported_points', 'structural_patterns', 'language_analysis'] as const,
  additionalProperties: false,
};

// ========== API Call ==========

interface AnalysisAPIResponse {
  reported_points: string[];
  structural_patterns: StructuralPatterns;
  language_analysis: LanguageAnalysis;
}

async function fetchAnalysisFromAPI(
  articleText: string,
  headline: string
): Promise<AnalysisAPIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured.');
  }

  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.responses.create({
    model: 'gpt-4.1',
    instructions: `
You are an impartial news-analysis assistant for a media literacy tool called **Read Between**.

You will receive:
- article headline
- full article text

You must analyze **only the provided article**.

Do NOT:
- Use outside knowledge
- Fact-check
- Evaluate truthfulness
- Infer author intent

Your goal is to help readers understand:
1. What the article reports
2. How the story is structured
3. What contextual dimensions are not included
4. The tone and language patterns used

Return output as **valid JSON only**.

---

# Section 1 — Reported Points (reported_points)

Summarize what the article reports in 3–5 bullet points.

Rules:
- Only summarize what appears in the article.
- No added context.
- No interpretation or speculation.
- No adjectives describing intent.
- Each bullet must be one concise sentence.
- Focus on events, claims, and key actors.

---

# Section 2 — Structural Patterns (structural_patterns)

Keep explanations concise and skimmable.

## Narrative Structure (narrative_structure)

Describe how the article organizes attention and sourcing.

Consider:
- Who is emphasized or foregrounded
- Who is criticized or praised
- Order and contrast of information
- Balance of sourcing (direct quotes, unnamed sources, commentators)
- Headline vs. body emphasis

Rules:
- 2–4 concise sentences maximum.
- Neutral, observational tone.
- No speculation about intent.
- Do not use words like bias, propaganda, misleading, or spin.
- Include 1–3 direct evidence quotes (max 200 characters each).

## Missing Context (missing_context)

Identify contextual dimensions not addressed in the article.

This may include absence of:
- Historical background
- Opposing viewpoints
- Stakeholder perspectives
- Legal framework
- Comparative data
- International or external perspectives

Strict Rules:
- Do NOT introduce outside facts.
- Do NOT claim knowledge of omitted details.
- Frame only as absence of contextual categories.
- Use neutral phrasing such as:
  - "The article does not include…"
  - "No historical background is provided…"
  - "No opposing viewpoint is presented…"

Provide:
- 1–3 concise sentences.
- 0–2 evidence quotes (max 200 characters each) showing what is covered to justify the potential gap.
- If no meaningful context gaps are identifiable, return:
  summary: "No significant contextual gaps detected based on the article's scope."
  evidence_quotes: []

---

# Section 3 — Language Analysis (language_analysis)

Analyze language patterns only (not factual accuracy).
Keep this section minimal and scannable.

## Emotional Emphasis (emotional_emphasis)
- Count emotionally charged or intensity words.
- Provide up to 5 words.
- List words only. Do NOT include example sentences. Do NOT repeat duplicates.

## Moral Framing (moral_framing)
- Count moral or duty-based words.
- Provide up to 5 words.
- List words only. Do NOT include sentences. Do NOT repeat duplicates.

## Certainty Language (certainty_language)
- Count high-certainty wording used in debatable claims.
- Provide up to 5 words.
- List words only. Do NOT include sentences. Do NOT repeat duplicates.

## Notable Choices (notable_choices)
Provide 1–3 short observations about overall tone or rhetorical patterns.
Keep observations descriptive, not evaluative.
`.trim(),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Headline: ${headline}\n\nArticle text:\n${articleText}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'article_analysis',
        strict: true,
        schema: analysisResponseSchema,
      } as any,
    },
  });

  return JSON.parse(response.output_text) as AnalysisAPIResponse;
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
  const top = scored.slice(0, 5);

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

// ========== Main ==========

export async function analyzeArticle(extraction: ExtractionResult): Promise<AnalysisResult> {
  const warnings: string[] = [];

  const article_structure = {
    headline: extraction.headline || 'No headline detected',
    publication: extraction.publication,
    published_date: formatDate(extraction.published_date),
    reading_time: calculateReadingTime(extraction.wordCount),
  };

  // Sources stay regex-based
  const sourceResult = findSources(extraction.mainText);
  warnings.push(...sourceResult.warnings);
  const sources = { items: sourceResult.items };

  // Try API call for structured breakdown + structural patterns + language analysis
  let structured_breakdown: StructuredBreakdown;
  let structural_patterns: StructuralPatterns;
  let language_analysis: LanguageAnalysis;

  try {
    const apiResult = await fetchAnalysisFromAPI(
      extraction.mainText,
      extraction.headline
    );

    structured_breakdown = { reported_points: apiResult.reported_points };
    structural_patterns = apiResult.structural_patterns;
    language_analysis = apiResult.language_analysis;
  } catch (err) {
    // Fallback to regex-based analysis
    console.warn('[Read Between] API analysis failed, using fallback:', err);

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
  }

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

export async function getSimilarCoverage(
  _query: string
): Promise<SimilarCoverageItem[]> {
  // Stub: implement with web search API when available
  return [];
}
