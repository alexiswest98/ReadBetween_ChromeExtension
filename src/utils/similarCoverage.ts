import OpenAI from 'openai';
import { SimilarCoverageItem, SourceItem } from '../types/models';

const similarCoverageSchema = {
  type: 'object' as const,
  properties: {
    articles: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          publisher: {
            type: 'string' as const,
            description: 'The name of the news publisher',
          },
          headline: {
            type: 'string' as const,
            description: 'The exact headline as it appears on the page',
          },
          url: {
            type: 'string' as const,
            description:
              'The exact URL copied from the web search result. Must be a real, working link.',
          },
        },
        required: ['publisher', 'headline', 'url'] as const,
        additionalProperties: false,
      },
    },
  },
  required: ['articles'] as const,
  additionalProperties: false,
};

interface SimilarCoverageContext {
  headline: string;
  publication: string;
  published_date: string;
  reported_points: string[];
  sources: SourceItem[];
}

function extractEntities(context: SimilarCoverageContext): string[] {
  const fullText = [context.headline, ...context.reported_points].join(' ');
  const entityPattern = /(?:[A-Z][a-z]+ ){1,3}[A-Z][a-z]+/g;
  const matches: string[] = fullText.match(entityPattern) || [];
  const sourceNames = context.sources.map((s) => s.source_name);
  const all = [...matches, ...sourceNames];
  const seen: Record<string, boolean> = {};
  return all
    .filter((item) => {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    })
    .slice(0, 8);
}

function buildEventSummary(context: SimilarCoverageContext): string {
  const points = context.reported_points;
  if (points.length >= 2) return points.slice(0, 2).join(' ');
  return points[0] || context.headline;
}

export async function fetchSimilarCoverage(
  context: SimilarCoverageContext
): Promise<SimilarCoverageItem[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured.');
  }

  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const entities = extractEntities(context);
  const eventSummary = buildEventSummary(context);

  const response = await client.responses.create({
    model: 'gpt-4.1',
    tools: [{ type: 'web_search' }],
    tool_choice: { type: 'web_search' } as any,
    instructions: `
You are helping populate "Find Similar Coverage" for a news-analysis product.

Goal:
Find 3 news articles from 3 different publishers that report on the same underlying event/topic as the input article.

CRITICAL RULES FOR URLs:
- Every URL you return MUST be copied exactly from your web search results.
- DO NOT fabricate, guess, or reconstruct URLs. Only use URLs you actually found via search.
- If you cannot find 3 real articles with real URLs, return fewer rather than inventing URLs.

Other rules:
- Publishers must be different from each other and from the input publisher.
- No syndication reposts (same article on different domains).
- Prefer straight news reporting over opinion pieces or aggregators.
- Each result must cover the same event/topic as the input article.
- Use the exact headline as it appears on the publisher's page.
`.trim(),
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `
Input article:
- Headline: ${context.headline}
- Publisher: ${context.publication}
- Date: ${context.published_date}
- Key entities: ${entities.join(', ')}
- Event summary (1-2 sentences): ${eventSummary}

Task:
Search the web for 3 other publishers reporting on this same event/topic.
Return only articles you found via search with their exact URLs.
            `.trim(),
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'similar_coverage',
        strict: true,
        schema: similarCoverageSchema,
      } as any,
    },
  });

  // Cross-reference annotation URLs as verification
  const annotationUrls: Record<string, string> = {};
  for (const item of response.output) {
    if (item.type === 'message' && 'content' in item) {
      for (const block of item.content) {
        if ('annotations' in block) {
          for (const ann of (block as any).annotations || []) {
            if (ann.type === 'url_citation' && ann.url && ann.title) {
              annotationUrls[ann.title.toLowerCase()] = ann.url;
            }
          }
        }
      }
    }
  }

  const parsed = JSON.parse(response.output_text);
  const articles = parsed.articles as SimilarCoverageItem[];

  return articles.map((article) => {
    const headlineLower = article.headline.toLowerCase();
    for (const key in annotationUrls) {
      if (
        headlineLower.indexOf(key) !== -1 ||
        key.indexOf(headlineLower) !== -1
      ) {
        return { publisher: article.publisher, headline: article.headline, url: annotationUrls[key] };
      }
    }
    return article;
  });
}
