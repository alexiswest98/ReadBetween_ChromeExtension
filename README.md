# Media Framing & Coverage Analyzer
A UX-driven Chrome extension that analyzes online news articles to surface framing patterns, language signals, and alternative coverage perspectives.

Built as a product-focused case study demonstrating UX strategy, information architecture, API integration, and decision-making under technical constraints.

---

## Product Overview

The Media Framing & Coverage Analyzer is a Chrome extension that activates on news article pages and provides structured analysis across key narrative dimensions:

- Framing & tone indicators
- Agency and responsibility attribution
- Explanation balance
- Language intensity signals
- Missing contextual elements
- Similar coverage from different publishers
- Save-for-later functionality

Rather than labeling content as “biased,” the tool presents analytical signals in a neutral, structured format that supports informed interpretation.

---

## Problem

Modern news consumption is fast, reactive, and fragmented.

Readers often:
- Lack visibility into framing language
- Struggle to compare coverage angles
- Cannot easily detect narrative emphasis
- Have limited tools for structured critical analysis

Most bias tools oversimplify journalism into political binaries. There is an opportunity to create a calmer, more analytical reading aid.

---

## Solution

Design a lightweight Chrome extension that:

1. Detects article pages automatically
2. Extracts readable article text
3. Sends content to an analysis API
4. Organizes results into structured UX modules
5. Surfaces three similar articles from different publishers
6. Allows users to save articles for future comparison

The experience prioritizes:
- Scannability
- Neutral tone
- Structured insights
- Transparent system feedback
- Clear loading and error states

---

## UX Strategy

### 1. Information Architecture
[ Chrome Extension Entry ]

├── Primary View: Article Analysis
│ ├── System Status
│ ├── Framing Indicators
│ ├── Agency & Responsibility
│ ├── Explanation Balance
│ ├── Language Signals
│ └── Missing Context
│
└── Secondary View: Saved Articles
├── Saved List
└── Reanalyze / Remove


**Design Rationale:**
- Modular categories improve cognitive processing
- Collapsible sections reduce overwhelm
- Clear hierarchy supports quick scanning
- Consistent structure creates product trust

---

### 2. Interaction Design Principles

- Calm, neutral visual palette (avoids political color bias)
- Status transparency (loading, analyzing, errors)
- Structured analytical modules
- No gamification or score-based shaming
- Designed for credibility over virality

---

### 3. Tradeoffs & Product Decisions

As a portfolio SaaS case study, I intentionally balanced:

- Data precision vs. product clarity
- API cost vs. depth of analysis
- Performance vs. comprehensiveness
- Technical feasibility vs. UX integrity

For this iteration, UX structure and product clarity were prioritized over perfect data accuracy, reflecting real-world MVP constraints.

---

## Technical Implementation

**Stack**
- React
- JavaScript (ES6+)
- Chrome Extension Manifest V3
- Webpack
- External NLP / analysis API
- Article similarity API

**Key Engineering Considerations**
- Content script isolation
- Asynchronous API calls
- Error handling for paywalled content
- Article extraction inconsistencies
- Performance constraints within extension environment
- Build alignment between root and output folders

---

## System States

The extension accounts for multiple states:

- Article detected
- Analyzing content
- Full analysis available
- Partial data returned
- API error
- No article detected
- Saved article view

Designing robust system states was critical for product trust and usability.

---

## Design & Product Insights

- UX-first product thinking
- Information architecture design
- Complex data simplification
- API-driven interface design
- Edge case handling
- Constraint-based decision making
- Clear modular UI systems
- MVP prioritization strategy
- Chrome extension architecture

---

## Installation

1. Clone the repository  
2. Install dependencies:

   npm install

3. Build the extension:

   npm run build

4. Open Chrome → Extensions  
5. Enable “Developer Mode”  
6. Click “Load Unpacked”  
7. Select the `/build` directory  

---

## Future Iterations

- Improved NLP classification logic
- Caching layer to reduce API calls
- Side-by-side publisher comparison view
- Visualized framing differences
- Adjustable analysis depth
- User testing validation
- Analytics instrumentation
