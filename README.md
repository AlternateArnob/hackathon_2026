# QueueStorm Investigator 

An AI-powered, safety-first support copilot built for the SUST CSE Carnival 2026.

## Setup & Run Instructions

1. Clone the repository.
2. Run `npm install` to install dependencies (Express, Zod, dotenv).
3. Set your environment variable:
   - Create a `.env` file.
   - Add `GEMINI_API_KEY=your_google_gemini_api_key`.
4. Run the server: `node server.js`
5. The API will be available at `http://localhost:8000`.

##  Architecture & Flow

This solution uses a **Hybrid Rule + AI** approach to guarantee speed, schema accuracy, and safety.

1. **Schema Firewall (Zod):** Inbound requests are validated against the exact strict types and enums required by the spec.
2. **Deterministic Matcher (JavaScript):** Instead of relying on an LLM to guess transaction IDs, a regex-based heuristic engine extracts numbers from the complaint and cross-references them against the transaction history to determine the `relevant_transaction_id` and `evidence_verdict` with 100% accuracy.
3. **AI Classifier (Gemini 2.5 Flash):** The unstructured complaint text and matcher evidence are passed to Gemini via a constrained prompt to classify the case type, department, severity, and draft the summary.
4. **Safety Interceptor:** The AI's drafted response is scanned by a hardcoded interceptor. If it contains forbidden terms (PIN, OTP, refund promises), the response is overridden with a mathematically safe string.

##  Models Used

- **Model:** `gemini-2.5-flash` (via Google AI Studio).
- **Why:** Selected for its massive context window, native `responseMimeType: "application/json"` enforcement, and high-speed execution to comfortably beat the 30-second API timeout constraint.

##  Safety Logic

Fintech safety is treated as a hard constraint.
- The system prompt explicitly forbids asking for credentials or promising unauthorized financial actions.
- A secondary regex-based middleware (`safety.js`) acts as a fail-safe. If the AI hallucinates words like "OTP" or "we will refund", the middleware intercepts the payload, flags it for human review, and replaces the reply with a compliant, safe fallback.

##  Known Limitations
- The heuristic matcher relies on extracting numbers (amounts or phone numbers) from the complaint text. If a customer describes a transaction entirely without numbers (e.g., "The transfer I sent to my brother yesterday"), the matcher correctly identifies it as `insufficient_data` to prevent false disputes.
- Extremely long transaction histories (50+ items) might slow down the matching algorithm marginally, though it is optimized for the standard 2-5 item window.