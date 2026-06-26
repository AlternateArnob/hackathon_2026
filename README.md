# QueueStorm Investigator

An AI-powered, safety-first support copilot built for the SUST CSE Carnival 2026.

##  Setup & Run Instructions
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Set your environment variable:
   - Create a `.env` file.
   - Add `GEMINI_API_KEY=your_api_key`.
4. Run the server: `npm start`
5. The API will bind to `0.0.0.0` and be available on port `8000`.

##  Architecture & Flow (Hybrid Rule + AI)
1. **Schema Firewall (Zod):** Inbound requests are validated against strict types and enums to prevent schema-related crashes.
2. **Deterministic Matcher (JavaScript):** A heuristic engine extracts amounts and counterparties from the complaint, cross-referencing them against the transaction history to programmatically determine the `relevant_transaction_id` and `evidence_verdict`.
3. **AI Classifier (Gemini API):** The complaint text and matcher evidence are passed to Gemini via a constrained prompt to classify the case type, department, severity, and draft the summary.
4. **Safety Interceptor:** The AI's drafted response is scanned. If forbidden terms (PIN, OTP, refund promises) are detected, the response is overridden with a mathematically safe string.

##  Models Used
- **Model:** `gemini-2.5-flash` via Google AI Studio.
- **Why:** Selected for its high-speed execution, large context window, and native `responseMimeType: "application/json"` enforcement.

##  Safety Logic
- A secondary regex-based middleware (`safety.js`) acts as a hard fail-safe against LLM hallucinations. It explicitly intercepts and neutralizes unauthorized refund promises or credential requests.

##  Known Limitations
- The heuristic matcher relies on extracting numbers from the text. Vague complaints lacking transaction details will default to `insufficient_data`.