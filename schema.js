const { z } = require('zod');

// --- ENUMS (Hardcoded from the Problem Statement to prevent typos) ---
const LanguageEnum = z.enum(["en", "bn", "mixed"]);
const ChannelEnum = z.enum(["in_app_chat", "call_center", "email", "merchant_portal", "field_agent"]);
const UserTypeEnum = z.enum(["customer", "merchant", "agent", "unknown"]);
const TransactionTypeEnum = z.enum(["transfer", "payment", "cash_in", "cash_out", "settlement", "refund"]);
const TransactionStatusEnum = z.enum(["completed", "failed", "pending", "reversed"]);

const EvidenceVerdictEnum = z.enum(["consistent", "inconsistent", "insufficient_data"]);
const CaseTypeEnum = z.enum([
    "wrong_transfer", "payment_failed", "refund_request", "duplicate_payment", 
    "merchant_settlement_delay", "agent_cash_in_issue", "phishing_or_social_engineering", "other"
]);
const SeverityEnum = z.enum(["low", "medium", "high", "critical"]);
const DepartmentEnum = z.enum([
    "customer_support", "dispute_resolution", "payments_ops", 
    "merchant_operations", "agent_operations", "fraud_risk"
]);

// --- INPUT SCHEMA ---
const TransactionHistorySchema = z.object({
    transaction_id: z.string(),
    timestamp: z.string().datetime(), // Validates ISO 8601
    type: TransactionTypeEnum,
    amount: z.number(),
    counterparty: z.string(),
    status: TransactionStatusEnum
});

const TicketRequestSchema = z.object({
    ticket_id: z.string(),
    complaint: z.string().min(1, "Complaint cannot be empty"),
    language: LanguageEnum.optional(),
    channel: ChannelEnum.optional(),
    user_type: UserTypeEnum.optional(),
    campaign_context: z.string().optional(),
    transaction_history: z.array(TransactionHistorySchema).optional().default([]),
    metadata: z.record(z.any()).optional()
});

// --- OUTPUT SCHEMA (Use this later to validate before sending) ---
const TicketResponseSchema = z.object({
    ticket_id: z.string(),
    relevant_transaction_id: z.string().nullable(),
    evidence_verdict: EvidenceVerdictEnum,
    case_type: CaseTypeEnum,
    severity: SeverityEnum,
    department: DepartmentEnum,
    agent_summary: z.string(),
    recommended_next_action: z.string(),
    customer_reply: z.string(),
    human_review_required: z.boolean(),
    confidence: z.number().min(0).max(1).optional(),
    reason_codes: z.array(z.string()).optional()
});

module.exports = {
    TicketRequestSchema,
    TicketResponseSchema
};