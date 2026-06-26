require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { TicketRequestSchema, TicketResponseSchema } = require('./schema');
const { analyzeEvidence } = require('./matcher');
const { classifyTicket } = require('./ai');
const { sanitizeReply } = require('./safety');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.post('/analyze-ticket', async (req, res) => {
    try {
        const { ticket_id, complaint, transaction_history, user_type, language } = req.body;

        // 1. THE SCHEMA FIREWALL: Reject malformed inputs instantly
        if (!ticket_id || !complaint) {
            return res.status(400).json({
                error: "Bad Request",
                message: "Missing required fields. 'ticket_id' and 'complaint' are mandatory."
            });
        }

        // 2. Run the Rule-Based Matcher
        const evidenceData = analyzeEvidence(complaint, transaction_history);

        // 3. Draft the AI Response
        const aiDraft = await classifyTicket(
            complaint, 
            user_type, 
            evidenceData.evidence_verdict,
            evidenceData.relevant_transaction_id,
            language
        );

        // 4. Run the Safety Interceptor
        const finalOutput = sanitizeReply(aiDraft.customer_reply, aiDraft.recommended_next_action);

        // 5. Send the perfectly formatted, safe response
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
            human_review_required: aiDraft.human_review_required,
            confidence: aiDraft.confidence || 0.90,
            reason_codes: aiDraft.reason_codes || ["hybrid_analysis_complete"]
        });

    } catch (error) {
        console.error("Fatal Server Error:", error);
        // If something completely unexpected breaks, fail safely with a 500
        res.status(500).json({ 
            error: "Internal Server Error",
            message: "An unexpected error occurred while processing the ticket."
        });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`QueueStorm Investigator running on port ${PORT}`);
});