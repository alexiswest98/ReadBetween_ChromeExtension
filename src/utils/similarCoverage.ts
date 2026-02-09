import OpenAI from 'openai';
import { SimilarCoverageItem, AnalysisResult } from '../types/models';

const similarCoverageSchema = {
  name: 'similar_coverage',
  strict: true,
  schema: {
    type: 'object' as const,
    properties: {
      articles: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            publisher: { type: 'string' as const },
            headline: { type: 'string' as const },
            url: { type: 'string' as const },
          },
          required: ['publisher', 'headline', 'url'] as const,
          additionalProperties: false,
        },
      },
    },
    required: ['articles'] as const,
    additionalProperties: false,
  },
};

function extractEntitiesFromAnalysis(analysis: AnalysisResult): string[] {
  const textParts = [
    analysis.article_structure.headline,
    ...analysis.structured_breakdown.reported_points,
  ];
  const fullText = textParts.join(' ');

  const entityPattern = /(?:[A-Z][a-z]+ ){1,3}[A-Z][a-z]+/g;
  const matches: string[] = fullText.match(entityPattern) || [];

  const sourceNames = analysis.sources.items.map((s) => s.source_name);
  const all: string[] = matches.concat(sourceNames);
  const seen: Record<string, boolean> = {};
  const unique = all.filter(function (item) {
    if (seen[item]) return false;
    seen[item] = true;
    return true;
  });
  return unique.slice(0, 8);
}

function buildEventSummary(analysis: AnalysisResult): string {
  const points = analysis.structured_breakdown.reported_points;
  if (points.length >= 2) {
    return points.slice(0, 2).join(' ');
  }
  return points[0] || analysis.article_structure.headline;
}

export async function fetchSimilarCoverage(
  analysis: AnalysisResult
): Promise<SimilarCoverageItem[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured.');
  }

  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const headline = analysis.article_structure.headline;
  const publisher = analysis.article_structure.publication;
  const date = analysis.article_structure.published_date;
  const entities = extractEntitiesFromAnalysis(analysis);
  const eventSummary = buildEventSummary(analysis);

  const response = await client.responses.create({
    model: 'gpt-4.1',
    tools: [{ type: 'web_search' }],
    reasoning: { effort: 'medium' },
    instructions: `
You are helping populate "Find Similar Coverage" for a news-analysis product.

Goal:
Find 3 news articles from 3 different publishers that report on the same underlying event/topic as the input article.

Rules:
- Publishers must be different (no duplicates, no syndication reposts).
- Prefer straight reporting over opinion/aggregations.
- Each result must clearly match the same event/topic.
- Return only the structured JSON specified by the schema.
`.trim(),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `
Input article:
- Headline: ${headline}
- Publisher: ${publisher}
- Date: ${date}
- Key entities: ${entities.join(', ')}
- Event summary (1-2 sentences): ${eventSummary}

Task:
Use web search to find 3 other publishers reporting on this same event/topic.
Return exactly 3 results.
            `.trim(),
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        json_schema: similarCoverageSchema,
      } as any,
    },
  });

  const parsed = JSON.parse(response.output_text);
  return parsed.articles as SimilarCoverageItem[];
}
