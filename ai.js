// ai.js
async function classifyTicket(complaint, userType, evidenceVerdict) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing from environment variables");

    const systemInstruction = `
    You are an expert digital finance support copilot. Your job is to read a customer complaint and the evidence verdict, then output strict JSON.
    
    RULES:
    1. case_type MUST be one of: wrong_transfer, payment_failed, refund_request, duplicate_payment, merchant_settlement_delay, agent_cash_in_issue, phishing_or_social_engineering, other.
    2. department MUST be one of: customer_support, dispute_resolution, payments_ops, merchant_operations, agent_operations, fraud_risk.
    3. severity MUST be one of: low, medium, high, critical. (Phishing is always critical).
    4. human_review_required MUST be a boolean. (True for disputes/ambiguity, False for basic queries).
    5. agent_summary: A crisp 1-2 sentence summary.
    6. recommended_next_action: A strict operational next step.
    7. customer_reply: A professional reply. NEVER ask for a PIN, OTP, password, or full card number. NEVER promise a refund or reversal. Use language like "any eligible amount will be returned through official channels."
    `;

    const userPrompt = `
    Complaint: "${complaint}"
    User Type: ${userType || "customer"}
    Matcher Verdict: ${evidenceVerdict}
    
    Output the exact JSON now.
    `;

    // We use gemini-2.5-flash because it is the fastest and most cost-effective for hackathons
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: [{
                    parts: [{ text: userPrompt }]
                }],
                generationConfig: {
                    temperature: 0.1, // Keep it highly deterministic
                    responseMimeType: "application/json" // Forces Gemini to output pure JSON
                }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("Gemini API Error details:", data);
            throw new Error(`Gemini API Error: ${data.error?.message || response.statusText}`);
        }

        const jsonString = data.candidates[0].content.parts[0].text;
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("AI Error:", error);
        throw error;
    }
}

module.exports = { classifyTicket };