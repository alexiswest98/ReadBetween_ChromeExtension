// ========== Core Value Types ==========

export type SourceType = 'person' | 'agency' | 'document' | 'dataset' | 'other';

export type SignalCategory =
  | 'agency_responsibility'
  | 'explanation_balance'
  | 'event_framing'
  | 'language_signals'
  | 'missing_context';

export type Confidence = 'low' | 'medium' | 'high';

export type AccessState = 'full_access' | 'partial_preview' | 'paywalled';

export type FramingSignalState =
  | 'signals_detected'
  | 'no_significant_signal_detected';

export type PreviousArticlesState =
  | 'available'
  | 'not_available_from_publisher_page';

export type ExtractionMethod =
  | 'article_element'
  | 'largest_container'
  | 'body_fallback';

// ========== AnalysisResult Schema ==========

export interface ArticleStructure {
  headline: string;
  publication: string;
  published_date: string;
  reading_time: string;
}

export interface StructuredBreakdown {
  reported_points: string[];
}

export interface SourceItem {
  source_name: string;
  source_type: SourceType;
  evidence_quote: string;
}

export interface Sources {
  items: SourceItem[];
}

export interface FramingSignal {
  category: SignalCategory;
  signal: string;
  evidence_quote: string;
  confidence: Confidence;
}

export interface FramingSignals {
  state: FramingSignalState;
  signals: FramingSignal[];
}

export interface PreviousArticle {
  title: string;
  url: string;
}

export interface AuthorTransparency {
  author_name: string;
  publisher: string;
  author_page_url: string;
  previous_articles: PreviousArticle[];
  previous_articles_state: PreviousArticlesState;
}

export interface SimilarCoverageItem {
  publisher: string;
  headline: string;
  url: string;
}

export interface SimilarCoverage {
  items: SimilarCoverageItem[];
}

export interface LanguageCategoryResult {
  count: number;
  examples: Array<{ word: string; sentence: string }>;
}

export interface LanguageAnalysis {
  emotional_emphasis: LanguageCategoryResult;
  moral_framing: LanguageCategoryResult;
  certainty_language: LanguageCategoryResult;
  notable_choices: string[];
}

export interface Meta {
  schema_version: string;
  generated_at: string;
  warnings: string[];
}

export interface AnalysisResult {
  article_structure: ArticleStructure;
  structured_breakdown: StructuredBreakdown;
  sources: Sources;
  framing_signals: FramingSignals;
  language_analysis: LanguageAnalysis;
  author_transparency: AuthorTransparency;
  similar_coverage: SimilarCoverage;
  meta: Meta;
}

// ========== Internal Types ==========

export interface ExtractionResult {
  success: boolean;
  headline: string;
  publication: string;
  published_date: string;
  author_name: string;
  author_page_url: string;
  mainText: string;
  wordCount: number;
  charCount: number;
  extractionMethodUsed: ExtractionMethod;
  url: string;
  paywallSignals: string[];
  error?: string;
}

export interface AccessStateResult {
  state: AccessState;
  reasons: string[];
}

export interface SavedArticle {
  id: string;
  url: string;
  headline: string;
  publisher: string;
  savedAt: string;
  accessState: AccessState;
  analysisResult: AnalysisResult;
}

// ========== Message Types ==========

export interface ExtractMessage {
  type: 'EXTRACT_ARTICLE';
}

export interface ExtractResponse {
  type: 'EXTRACTION_RESULT';
  data: ExtractionResult;
}
