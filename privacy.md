# Privacy Policy for Read Between

*Last updated: April 26, 2026*

**Read Between** ("the Extension") is a browser extension that helps users read news articles more critically. This policy explains what data the Extension accesses, how it is used, and your rights.

---

## 1. What Data We Access

When you use the Extension, it accesses the following information from the web page you are currently viewing:

- **Article content**: The headline, body text, author name, publication name, and publication date of the news article on the active tab.
- **Page URL**: The URL of the article being analyzed.

The Extension does **not** collect:
- Your name, email address, or any account information
- Your general browsing history or activity on pages you do not actively analyze
- Any financial, health, or authentication information

---

## 2. How We Use This Data

Article content is used **only** to generate a media literacy analysis. Specifically:

- When you click **Analyze**, the article's headline and text (up to approximately 15,000 characters) are sent to **OpenAI's API** to produce a structured breakdown of reported facts, missing context, narrative structure, and tone.
- The article headline, publication name, and key named entities may also be sent to OpenAI's web search tool to find similar coverage from other outlets.

Analysis results are stored **locally** in your browser using `chrome.storage.local`. This data never leaves your device except for the OpenAI API calls described above.

---

## 3. Data Sharing

We share data with **one** third party:

| Third Party | Purpose | Data Shared | Their Policy |
|---|---|---|---|
| OpenAI | Article analysis | Article text, headline, author, publication | [openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy) |

We do **not** sell, rent, or share your data with advertisers, analytics providers, or any other third party.

---

## 4. Data Retention

- **Locally stored data**: Analysis results are saved in your browser's local storage so you can revisit them. You can clear this data at any time by removing the Extension or clearing your browser's extension storage.
- **OpenAI**: Data sent to OpenAI is subject to their data retention policies. OpenAI does not use API data to train its models by default.

---

## 5. Permissions Explained

| Permission | Why It's Needed |
|---|---|
| `activeTab` | To read the article content from your current tab when you click Analyze |
| `scripting` | To inject a content script that extracts the article text from the page |
| `sidePanel` | To display the analysis results in the Chrome side panel |
| `storage` | To save analysis results locally in your browser |

The content script runs on all `http://` and `https://` pages so it is ready when you open the side panel on any news article. It does **not** transmit any data automatically — data is only sent to OpenAI when you explicitly click Analyze.

---

## 6. Children's Privacy

The Extension is not directed at children under the age of 13 and does not knowingly collect data from children.

---

## 7. Changes to This Policy

We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page will reflect any changes. Continued use of the Extension after changes constitutes acceptance of the updated policy.

---

## 8. Contact

If you have questions about this Privacy Policy, please contact: **alexishwest98@gmail.com**
