import OpenAI from 'openai';
import { SimilarCoverageItem, SourceItem } from '../types/models';

const BLOCKED_DOMAINS = [
  'reddit.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'yahoo.com',
  'news.yahoo.com',
  'msn.com',
  'apple.news',
];

function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return BLOCKED_DOMAINS.some((blocked) => hostname.includes(blocked));
  } catch {
    return true; // reject invalid URLs
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const similarCoverageSchema = {
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

  const seen = new Set<string>();
  return [...matches, ...sourceNames]
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, 8);
}

function buildEventSummary(context: SimilarCoverageContext): string {
  if (context.reported_points.length >= 2) {
    return context.reported_points.slice(0, 2).join(' ');
  }
  return context.reported_points[0] || context.headline;
}

export async function fetchSimilarCoverage(
  context: SimilarCoverageContext
): Promise<SimilarCoverageItem[]> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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

GOAL:
Find up to 3 articles from different publishers covering the same event.

STRICT TOOL REQUIREMENT:
- You MUST only return URLs that appear in the web_search tool results.
- Each result MUST correspond to a cited search result.
- NEVER include a URL that was not returned by the tool.

URL RULES:
- URLs must load successfully and link directly to the article.
- No homepages, category pages, or redirects.

SOURCE RULES:
- Only established news publishers
- NO aggregators, social platforms, blogs

PUBLISHER RULES:
- All publishers must be unique
- Must differ from the input article's publisher

FAILURE RULE:
- It is expected you may return fewer than 3 results.
- Return an empty list if nothing valid is found.

SELF CHECK:
If a result is not directly supported by a tool citation → discard it.
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
- Entities: ${entities.join(', ')}
- Summary: ${eventSummary}

Task:
Find matching coverage from other publishers using web search.
Return ONLY verified results.
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

  // 🔍 Extract tool-verified URLs
  const annotationUrls = new Set<string>();

  for (const item of response.output) {
    if (item.type === 'message' && 'content' in item) {
      for (const block of item.content) {
        if ('annotations' in block) {
          for (const ann of (block as any).annotations || []) {
            if (ann.type === 'url_citation' && ann.url) {
              annotationUrls.add(ann.url);
            }
          }
        }
      }
    }
  }

  const parsed = JSON.parse(response.output_text);
  const articles = parsed.articles as SimilarCoverageItem[];

  const seenPublishers = new Set<string>();

  const verified = articles.filter((article) => {
    // Must exist in tool results
    if (!annotationUrls.has(article.url)) return false;

    // Block bad domains
    if (isBlockedDomain(article.url)) return false;

    // Unique publishers
    const publisherKey = normalize(article.publisher);
    if (seenPublishers.has(publisherKey)) return false;
    seenPublishers.add(publisherKey);

    // Must not match input publisher
    if (normalize(article.publisher) === normalize(context.publication)) {
      return false;
    }

    return true;
  });

  return verified.slice(0, 3);
}
