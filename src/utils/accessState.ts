import { ExtractionResult, AccessStateResult, AccessState } from '../types/models';

const PARTIAL_PREVIEW_MAX_WORDS = 300;

export function determineAccessState(
  extraction: ExtractionResult
): AccessStateResult {
  const reasons: string[] = [];
  let state: AccessState = 'full_access';

  const hasPaywallSignals = extraction.paywallSignals.length > 0;
  const strongPaywall = extraction.paywallSignals.some(
    (s) => s.includes('paywall-overlay') || s.includes('subscribe-prompt')
  );

  if (strongPaywall && extraction.wordCount < 200) {
    state = 'paywalled';
    reasons.push('Strong paywall indicators detected');
    reasons.push(...extraction.paywallSignals);
  } else if (
    hasPaywallSignals ||
    extraction.wordCount < PARTIAL_PREVIEW_MAX_WORDS
  ) {
    if (hasPaywallSignals) {
      state = 'partial_preview';
      reasons.push('Paywall cues detected but some content available');
      reasons.push(...extraction.paywallSignals);
    } else if (extraction.wordCount < 150) {
      state = 'partial_preview';
      reasons.push(
        `Low word count (${extraction.wordCount} words) suggests partial content`
      );
    } else {
      state = 'full_access';
      reasons.push('Content appears fully accessible');
    }
  } else {
    state = 'full_access';
    reasons.push('Content appears fully accessible');
  }

  return { state, reasons };
}
