# QueueStorm Investigator API

## Architectural Overview
This service utilizes a **Hybrid (Rule + AI) Architecture** to ensure mathematically accurate reasoning combined with flexible natural language generation. 
1. **Rule-Based Engine (`matcher.js`):** Extracts evidence, handles Bangla numerals natively, cross-references transaction history, and strictly determines the `relevant_transaction_id` and `evidence_verdict`. It is mathematically restricted from hallucinating transaction IDs.
2. **Generative AI (`ai.js`):** Drafts the summary, categorizes the severity/department, and drafts the customer reply.
3. **Safety Interceptor (`safety.js`):** A strict regex-based firewall that parses at the sentence level, ensuring compliance with fintech safety rules.

## Tech Stack
* **Runtime:** Node.js (Express.js)
* **AI Integration:** Google Gemini API (`gemini-2.5-flash`)
* **Deployment:** Railway (Live URL path chosen over Docker for immediate judge reachability)

## AI Model Used & Cost Reasoning
* **Model:** Google `gemini-2.5-flash`
* **Justification:** Chosen for its extremely low p95 latency (scoring full performance points) and its native support for `responseMimeType: "application/json"`. The generous free-tier rate limit keeps operational costs at $0 while easily satisfying the 30-second timeout constraints.

## Assumptions
* Language is primarily English or Bangla; transliterated Banglish relies on regex phonetic matching.
* "Wrong transfer" claims with a history of successful transfers to the same recipient are flagged as `inconsistent` to prevent friendly fraud.

## Safety Logic & Escalation
Financial safety is enforced via a two-layer defense:
1. **Prompt Engineering:** The model is strictly instructed to never request PIN/OTP, and to use authorized language ("any eligible amount will be returned").
2. **Hard Interceptor:** `safety.js` evaluates text contextually. If it detects phrases like "tell me your PIN" or "we will refund you", it overrides the AI's response with safe, hardcoded text and explicitly forces `human_review_required: true`.

## Known Limitations
* **Rate Limiting:** Rapid, concurrent automated testing may trigger a temporary 500 error due to upstream free-tier Google API rate limiting. 
* **Strict Schema Firewall:** The API aggressively rejects malformed inputs (missing `ticket_id` or `complaint`) with a 400 Bad Request to prioritize stability over graceful guessing.

## Setup & Execution
1. Clone the repository.
2. Run `npm install` to install dependencies (`express`, `dotenv`).
3. Create a `.env` file and add `GEMINI_API_KEY=your_key_here` and `PORT=8000`.
4. Run `npm start`.
5. The API will be available at `POST http://localhost:8000/analyze-ticket` and `GET http://localhost:8000/health`.