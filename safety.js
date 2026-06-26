// safety.js
function sanitizeReply(draftReply, nextAction) {
    // Regex looking for dangerous words. 
    // We check for PIN, OTP, password, and variations of "we will refund/reverse"
    const dangerousKeywords = /\b(pin|otp|password|full card)\b|we will (refund|reverse)|account unblock/i;
    
    let safeReply = draftReply;
    let safeAction = nextAction;

    // If Gemini accidentally drafts a dangerous reply, we intercept and override it completely.
    if (dangerousKeywords.test(draftReply) || dangerousKeywords.test(nextAction)) {
        console.warn("⚠️ Safety trigger activated! Overriding AI response to prevent penalty.");
        
        safeReply = "We have received your request and our team will review the details. If applicable, any eligible amount will be returned through official channels. Please do not share your PIN or OTP with anyone.";
        
        safeAction = "Escalate for human review. (AI response intercepted due to safety rule violation).";
    }

    return { safeReply, safeAction };
}

module.exports = { sanitizeReply };