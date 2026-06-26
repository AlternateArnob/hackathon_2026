// server.js
require('dotenv').config();
const express = require('express');
const { analyzeEvidence } = require('./matcher');
const { classifyTicket } = require('./ai');
const { sanitizeReply } = require('./safety');

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

// 1. HEALTH CHECK
app.get('/health', (req, res) => {
    res.status(200).json({ status: "ok" });
});

// 2. MAIN ANALYSIS ENDPOINT
app.post('/analyze-ticket', async (req, res) => {
    try {
        const { ticket_id, complaint, transaction_history, user_type, language } = req.body;

        // A. SCHEMA FIREWALL
        if (!ticket_id || !complaint) {
            return res.status(400).json({
                error: "Bad Request",
                message: "Missing required fields. 'ticket_id' and 'complaint' are mandatory."
            });
        }

        // B. RULE-BASED MATCHING
        const evidenceData = analyzeEvidence(complaint, transaction_history);

        // C. GENERATIVE AI DRAFTING
        const aiDraft = await classifyTicket(
            complaint, 
            user_type, 
            evidenceData.evidence_verdict,
            evidenceData.relevant_transaction_id,
            language
        );

        // D. SAFETY INTERCEPTOR
        const finalOutput = sanitizeReply(aiDraft.customer_reply, aiDraft.recommended_next_action);

        const wasIntercepted = finalOutput.violations && finalOutput.violations.length > 0;
        const finalHumanReview = wasIntercepted ? true : aiDraft.human_review_required;

        // E. STRICT SCHEMA OUTPUT (Anti-Hallucination Fallback)
        const validCaseTypes = ["wrong_transfer", "payment_failed", "refund_request", "duplicate_payment", "merchant_settlement_delay", "agent_cash_in_issue", "phishing_or_social_engineering", "other"];
        const validDepartments = ["customer_support", "dispute_resolution", "payments_ops", "merchant_operations", "agent_operations", "fraud_risk"];
        const validSeverities = ["low", "medium", "high", "critical"];

        res.json({
            ticket_id: ticket_id,
            relevant_transaction_id: evidenceData.relevant_transaction_id,
            evidence_verdict: evidenceData.evidence_verdict,
            case_type: validCaseTypes.includes(aiDraft.case_type) ? aiDraft.case_type : "other",
            severity: validSeverities.includes(aiDraft.severity) ? aiDraft.severity : "medium",
            department: validDepartments.includes(aiDraft.department) ? aiDraft.department : "customer_support",
            agent_summary: aiDraft.agent_summary || "Issue requires review.",
            recommended_next_action: finalOutput.safeAction,
            customer_reply: finalOutput.safeReply,
            human_review_required: finalHumanReview,
            confidence: typeof aiDraft.confidence === 'number' ? aiDraft.confidence : 0.90,
            reason_codes: Array.isArray(aiDraft.reason_codes) ? aiDraft.reason_codes : ["hybrid_analysis_complete"]
        });

    } catch (error) {
        console.error("Fatal Server Error:", error);
        res.status(500).json({ 
            error: "Internal Server Error",
            message: "An unexpected error occurred while processing the ticket."
        });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`QueueStorm Investigator API is running on port ${port}`);
});