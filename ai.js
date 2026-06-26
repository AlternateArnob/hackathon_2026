// ai.js
async function classifyTicket(complaint, userType, evidenceVerdict, matchedTxnId, languageContext = "en") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing from environment variables");

    const systemInstruction = `
    You are an elite digital finance support investigator for QueueStorm. 
    Read the customer complaint, evidence verdict, and matched transaction ID, then output strict JSON.

    STRICT ENUMS:
    - case_type: wrong_transfer, payment_failed, refund_request, duplicate_payment, merchant_settlement_delay, agent_cash_in_issue, phishing_or_social_engineering, other
    - severity: low, medium, high, critical
    - department: customer_support, dispute_resolution, payments_ops, merchant_operations, agent_operations, fraud_risk
    
    SAFETY, TRANSACTION ID & LANGUAGE RULES:
    1. NEVER ask for PIN, OTP, password. NEVER confirm a refund without authority.
    2. If a Matched Transaction ID is provided, include it in the customer_reply (e.g., "We have noted your concern about transaction TXN-9101").
    3. If Matched Transaction ID is "None", do NOT make one up. State that you need more information to identify the correct transaction.
    4. Always end the customer_reply with: "Please do not share your PIN or OTP with anyone." (Or the Bangla equivalent).
    5. LANGUAGE: If the complaint is in Bangla, the customer_reply MUST be in Bangla. If it is mixed, reply in mixed language.

    EXAMPLES TO MIMIC EXACTLY:

    Example 1 (Clear Match):
    Complaint: "I sent 5000 taka to a wrong number..." | Verdict: "consistent" | Matched ID: "TXN-9101"
    Output: {
      "case_type": "wrong_transfer", "severity": "high", "department": "dispute_resolution", "human_review_required": true,
      "agent_summary": "Customer reports sending 5000 BDT via TXN-9101 to +8801719876543, which they now believe was the wrong recipient. Recipient is unresponsive.",
      "recommended_next_action": "Verify TXN-9101 details with the customer and initiate the wrong-transfer dispute workflow per policy.",
      "customer_reply": "We have noted your concern about transaction TXN-9101. Please do not share your PIN or OTP with anyone. Our dispute team will review the case and contact you through official support channels."
    }

    Example 2 (Ambiguous - Multiple Transactions):
    Complaint: "I sent 1000 to my brother yesterday but he didn't get it." | Verdict: "insufficient_data" | Matched ID: "None"
    Output: {
      "case_type": "wrong_transfer", "severity": "medium", "department": "dispute_resolution", "human_review_required": false,
      "agent_summary": "Customer reports a 1000 BDT transfer to their brother was not received. Cannot determine which transaction is the brother's without further input.",
      "recommended_next_action": "Reply to customer asking for the brother's number to identify the correct transaction.",
      "customer_reply": "Thank you for reaching out. We see multiple transactions. Could you share your brother's number so we can identify the right transaction? Please do not share your PIN or OTP with anyone."
    }
    `;

    const userPrompt = `
    Complaint: "${complaint}"
    User Type: ${userType || "customer"}
    Matcher Verdict: ${evidenceVerdict}
    Matched Transaction ID: ${matchedTxnId || "None"}
    Language Hint: ${languageContext}
    
    Output the exact JSON now.
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents: [{ parts: [{ text: userPrompt }] }],
                generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Gemini API Error: ${data.error?.message || response.statusText}`);
        }

        // Catch Google Native Safety Blocks to prevent 500 crashes
        if (!data.candidates || !data.candidates[0].content) {
            console.warn("⚠️ Gemini natively blocked the prompt! Defaulting to fraud_risk.");
            return {
                case_type: "phishing_or_social_engineering",
                severity: "critical",
                department: "fraud_risk",
                agent_summary: "Potential social engineering. Prompt flagged by upstream AI safety filters.",
                recommended_next_action: "Escalate to fraud risk immediately.",
                customer_reply: "We have received your request. Please do not share your PIN, OTP, or password with anyone.",
                human_review_required: true
            };
        }

        return JSON.parse(data.candidates[0].content.parts[0].text);

    } catch (error) {
        console.error("AI Error:", error);
        throw error;
    }
}

module.exports = { classifyTicket };