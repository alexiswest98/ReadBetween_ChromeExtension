# Read Between

A Chrome extension that analyzes online news articles to surface framing patterns, source attribution, language signals, and alternative coverage perspectives.

Built as a product-focused case study demonstrating UX strategy, information architecture, multi-stage AI pipeline design, and decision-making under technical constraints.

<video src="src/assets/img/todayDEMO_rb.mp4" controls width="100%"></video>


## Product Overview

Read Between activates on any news article page and provides structured analysis across seven key dimensions:

- **What's Being Reported** — neutral bullet-point summary of the article's core claims
- **Sources & Attribution** — named speakers extracted and matched to their quotes
- **What's Not Included** — contextual gaps and missing counterpoints
- **How the Story Is Structured** — narrative framing, source balance, headline vs. body emphasis
- **Tone Indicators** — emotional, moral, and certainty language detected word-by-word
- **Author Transparency** — author identity, publication, and byline link
- **Find Similar Coverage** — up to 3 related articles from different publishers via live web search

Rather than labeling content as "biased," the tool presents analytical signals in a neutral, structured format that supports informed interpretation.


## Analysis Pipeline

The extension runs analysis in sequential stages, with local processing running in parallel where it doesn't depend on AI output:

| Stage | Trigger | Output |
|---|---|---|
| DOM Parse | On page load (instant) | Headline, publication, date, author, article text |
| Preprocessing | Before any AI call | Boilerplate removal, deduplication, whitespace normalisation |
| Stage 1 — AI | Blocks UI until complete | Reported points, missing context summary |
| Local Regex | Parallel with Stage 1 | Sources & attribution, tone language signals |
| Stage 2 — AI | Background after Stage 1 | Narrative structure summary, notable rhetorical choices |
| Stage 3 — AI + Web | Background after Stage 1 | Similar coverage from other publishers |

Stage 1 uses structured JSON output with a strict schema enforced at the API level. Stages 2 and 3 run asynchronously and populate their cards once resolved without requiring user interaction.


## Analysis Cards

### What's Being Reported
Up to 4 neutral, fact-focused bullet points summarising what the article actually claims. Produced by Stage 1 (GPT-4.1). Falls back to regex sentence scoring on API failure.

### Sources & Attribution
Up to 5 named speakers matched to direct quotes using a paragraph-anchored regex algorithm. No AI call — entirely local processing via `sourceFinder.ts`. Handles direct attribution (`Name said`), intro attribution (`Name, description, said`), post-quote attribution (`"..." Name said`), and pronoun resolution (`she said` → look-back to previous paragraph's named speaker). Days of the week, months, countries, and generic nouns are blocked from matching as names.

### What's Not Included
Contextual gaps the article does not address — identified by Stage 1. The model is constrained to surface only what is absent from within the text, with no outside facts introduced.

### How the Story Is Structured
Narrative framing analysis produced by Stage 2 in the background. Evaluates source balance, headline vs. body emphasis, and structural framing choices.

### Tone Indicators
Three word-level regex scans against curated dictionaries (30+ emotional words, 26+ moral framing words, 24+ certainty words). Notable rhetorical observations are added by Stage 2.

### Author Transparency
Author name, publisher, and author page URL extracted entirely from DOM meta tags and element selectors. No AI call.

### Find Similar Coverage
Up to 3 articles on the same story from different publishers, found via live web search in Stage 3. One result per publisher, with URL integrity enforced against web search annotations.



## Access States

The extension detects the accessibility level of the article content before analysis:

| State | Condition | UI Behaviour |
|---|---|---|
| `full_access` | Full article text available | All 7 cards rendered |
| `partial_preview` | Truncated content, soft paywall | All cards rendered with content warnings where applicable |
| `paywalled` | Hard paywall detected, < 200 words available | Up to 3 summary points + Find Similar Coverage + paywall notice |

Paywall detection uses a combination of word count thresholds and DOM signal scanning (overlay elements, subscribe-prompt text patterns).


## Technical Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 |
| Language | TypeScript |
| Build System | Webpack 5 |
| Extension Platform | Chrome Manifest V3 (Side Panel) |
| AI Provider | OpenAI GPT-4.1 |
| AI Features Used | Structured output, `web_search` tool (Stage 3) |
| Storage | Chrome Extension Storage API (local) |
| Styling | CSS Modules |

**Key implementation details:**
- Content script injects into all HTTP/HTTPS pages and extracts article DOM on load
- Background service worker coordinates analysis stages and persists results per tab
- All AI calls are made from the extension panel context with the OpenAI key stored in `.env`
- TypeScript target is ES5 for maximum extension compatibility
- No backend or server component — the extension talks directly to the OpenAI API



## System States

The extension accounts for and communicates the following states:

- Article detected
- Analyzing content (Stage 1 in progress)
- Full analysis available
- Stage 2 / Stage 3 still loading (cards show pending state)
- Paywalled article detected (limited view)
- API error
- No article content detected on this page
- Saved articles view

Designing for these states was prioritized to maintain product trust across the full range of real-world browsing scenarios.



## Installation

1. Clone the repository

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the project root and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_key_here
   ```

4. Build the extension:
   ```
   npm run build
   ```

5. Open Chrome and go to `chrome://extensions`

6. Enable **Developer Mode** (toggle in the top-right corner)

7. Click **Load Unpacked** and select the `/build` directory

8. Open any news article and click the Read Between icon in the Chrome toolbar to open the side panel



## Future Iterations

- Semantic non-article detection (URL patterns, structured data, `og:type` validation)
- Caching layer to avoid re-analyzing the same article
- Side-by-side publisher comparison view
- Visualized framing differences across publishers
- Author history integration (previous articles from the same byline)
- Adjustable analysis depth
- User testing validation
- Analytics instrumentation
