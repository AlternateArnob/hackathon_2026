// safety.js
const SAFE_DISCLAIMER_PATTERNS = [
    /please do not share your pin(?:,|\s+or)?\s*otp(?:\s+or\s+password)?\s*with anyone\.?/gi,
    /আপনার (?:পিন|ওটিপি|ও\s*টি\s*পি|পাসওয়ার্ড)[^।]{0,40}কাউকে[^।]{0,20}(?:দিবেন না|শেয়ার করবেন না|বলবেন না)/gi,
];

const NEGATION_WORDS = /\b(do not|don't|never|won't|will not|cannot|can't|please don't|না করবেন|করবেন না|দিবেন না|দেবেন না)\b/i;
const REQUEST_VERBS = /(provide|give|send|share|tell|confirm|enter|input|need|require|what(?:'?s| is)|reply with|let (?:me|us) know|verify your|দিন|দেন|বলুন|পাঠান|জানান|বলে দিন|করুন)/i;
const CREDENTIAL_NOUNS = /(\bpin\b|\botp\b|password|card\s*number|cvv|পিন|ওটিপি|ও\s*টি\s*পি|পাসওয়ার্ড|কার্ড\s*নম্বর)/i;
const UNAUTHORIZED_PROMISES = /(we will refund|we will reverse|account unblock|will be refunded|you will be refunded|refund (?:is|has been) confirmed|আমরা ফেরত দিব|টাকা ফেরত দেওয়া হবে|রিফান্ড (?:দেওয়া হবে|করা হবে)|আনব্লক করে দিব)/i;
const SUSPICIOUS_REDIRECT = /(contact (?:this|that|the following) (?:number|agent|person)|message (?:this|the following) number|call (?:this|the following) number(?! for official support)|হোয়াটসঅ্যাপে যোগাযোগ করুন)/i;

function stripSafeDisclaimers(text) {
    let cleaned = text;
    for (const pattern of SAFE_DISCLAIMER_PATTERNS) {
        cleaned = cleaned.replace(pattern, "");
    }
    return cleaned;
}

function splitSentences(text) {
    return text.split(/(?<=[.!?।])\s+/).filter(Boolean);
}

function hasCredentialRequest(text) {
    const cleaned = stripSafeDisclaimers(text);
    const sentences = splitSentences(cleaned);
    return sentences.some((sentence) => {
        if (NEGATION_WORDS.test(sentence)) return false;
        return CREDENTIAL_NOUNS.test(sentence) && REQUEST_VERBS.test(sentence);
    });
}

function hasUnauthorizedPromise(text) {
    const sentences = splitSentences(text);
    return sentences.some((sentence) => {
        if (NEGATION_WORDS.test(sentence)) return false;
        return UNAUTHORIZED_PROMISES.test(sentence);
    });
}

function hasSuspiciousRedirect(text) {
    return SUSPICIOUS_REDIRECT.test(text);
}

function sanitizeReply(draftReply = "", nextAction = "") {
    const violations = [];

    if (hasCredentialRequest(draftReply) || hasCredentialRequest(nextAction)) violations.push("credential_request");
    if (hasUnauthorizedPromise(draftReply) || hasUnauthorizedPromise(nextAction)) violations.push("unauthorized_promise");
    if (hasSuspiciousRedirect(draftReply) || hasSuspiciousRedirect(nextAction)) violations.push("suspicious_redirect");

    if (violations.length === 0) {
        return { safeReply: draftReply, safeAction: nextAction, violations };
    }

    console.warn(`⚠️ Safety trigger activated! Violations: ${violations.join(", ")}. Overriding AI response.`);

    const safeReply = "We have received your request and our team will review the details. If applicable, any eligible amount will be returned through official channels. Please do not share your PIN or OTP with anyone.";
    const safeAction = `Escalate for human review. (AI response intercepted due to safety rule violation: ${violations.join(", ")}).`;

    return { safeReply, safeAction, violations };
}

module.exports = { sanitizeReply };