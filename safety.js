// safety.js

// Using default empty strings to prevent undefined crashes
function sanitizeReply(draftReply = "", nextAction = "") {
    // 1. First, we temporarily remove the approved safety warning so the regex doesn't falsely flag it.
    const cleanReplyForChecking = draftReply.replace(/Please do not share your PIN or OTP with anyone\.?/i, "");
    
    // 2. Now we scan for actual dangerous phrases (unauthorized promises or asking for credentials)
    const unauthorizedPromises = /we will refund|we will reverse|account unblock|will be refunded/i;
    const askingForCredentials = /(provide|give me|tell me|what is|send)\s+(your\s+)?(pin|otp|password|card number)/i;
    
    let safeReply = draftReply;
    let safeAction = nextAction;

    // 3. Run the check against the cleaned text and the next action
    if (unauthorizedPromises.test(cleanReplyForChecking) || 
        unauthorizedPromises.test(nextAction) || 
        askingForCredentials.test(cleanReplyForChecking) || 
        askingForCredentials.test(nextAction)) {
        
        console.warn("⚠️ Safety trigger activated! Overriding AI response.");
        
        safeReply = "We have received your request and our team will review the details. If applicable, any eligible amount will be returned through official channels. Please do not share your PIN or OTP with anyone.";
        safeAction = "Escalate for human review. (AI response intercepted due to safety rule violation).";
    }

    return { safeReply, safeAction };
}

module.exports = { sanitizeReply };