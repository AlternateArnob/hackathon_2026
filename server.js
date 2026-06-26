// server.js
require('dotenv').config();
const express = require('express');
const { analyzeEvidence } = require('./matcher');
const { classifyTicket } = require('./ai');
const { sanitizeReply } = require('./safety');

const app = express();
const port = process.env.PORT || 8000;

// Middleware to parse incoming JSON bodies safely
app.use(express.json());

// ==========================================
// 1. HEALTH CHECK (Rubric Requirement)
// ==========================================
app.get('/health', (req, res) => {
    res.status(200).json({ status: "ok" });
});

// ==========================================
// 2. MAIN ANALYSIS ENDPOINT
// ==========================================
app.post('/analyze-ticket', async (req, res) => {
    try {
        const { ticket_id, complaint, transaction_history, user_type, language } = req.body;

        // ---------------------------------------------------------
        // A. THE SCHEMA FIREWALL
        // Reject malformed inputs instantly before hitting logic/AI
        // ---------------------------------------------------------
        if (!ticket_id || !complaint) {
            return res.status(400).json({
                error: "Bad Request",
                message: "Missing required fields. 'ticket_id' and 'complaint' are mandatory."
            });
        }

        // ---------------------------------------------------------
        // B. RULE-BASED MATCHING (Evidence Reasoning)
        // ---------------------------------------------------------
        const evidenceData = analyzeEvidence(complaint, transaction_history);

        // ---------------------------------------------------------
        // C. GENERATIVE AI DRAFTING
        // ---------------------------------------------------------
        const aiDraft = await classifyTicket(
            complaint, 
            user_type, 
            evidenceData.evidence_verdict,
            evidenceData.relevant_transaction_id,
            language
        );

        // ---------------------------------------------------------
        // D. SAFETY INTERCEPTOR & ESCALATION
        // ---------------------------------------------------------
        const finalOutput = sanitizeReply(aiDraft.customer_reply, aiDraft.recommended_next_action);

        // If the interceptor caught any violations, force human review to true
        const wasIntercepted = finalOutput.violations && finalOutput.violations.length > 0;
        const finalHumanReview = wasIntercepted ? true : aiDraft.human_review_required;

        // ---------------------------------------------------------
        // E. STRICT SCHEMA OUTPUT
        // ---------------------------------------------------------
        res.json({
            ticket_id: ticket_id,
            relevant_transaction_id: evidenceData.relevant_transaction_id,
            evidence_verdict: evidenceData.evidence_verdict,
            case_type: aiDraft.case_type,
            severity: aiDraft.severity,
            department: aiDraft.department,
            agent_summary: aiDraft.agent_summary,
            recommended_next_action: finalOutput.safeAction,
            customer_reply: finalOutput.safeReply,
            human_review_required: finalHumanReview,
            confidence: aiDraft.confidence || 0.90,
            reason_codes: aiDraft.reason_codes || ["hybrid_analysis_complete"]
        });

    } catch (error) {
        console.error("Fatal Server Error:", error);
        // Fail safely with a 500 error instead of crashing the process
        res.status(500).json({ 
            error: "Internal Server Error",
            message: "An unexpected error occurred while processing the ticket."
        });
    }
});

// ==========================================
// 3. SERVER INITIALIZATION
// ==========================================
app.listen(port, '0.0.0.0', () => {
    console.log(`QueueStorm Investigator API is running on port ${port}`);
});