// matcher.js

/**
 * Converts Bangla digits to English digits so our regex can read them.
 */
function convertBanglaToEnglish(text) {
    const banglaDigits = {'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
    return text.replace(/[০-৯]/g, char => banglaDigits[char]);
}

function extractNumbers(text) {
    const englishText = convertBanglaToEnglish(text);
    // Removed \b boundary to prevent issues with non-latin spaces
    const regex = /\d+(?:,\d+)*/g; 
    const matches = englishText.match(regex);
    return matches ? matches.map(num => parseFloat(num.replace(/,/g, ''))) : [];
}

function analyzeEvidence(complaint, transactionHistory) {
    if (!transactionHistory || transactionHistory.length === 0) {
        return { relevant_transaction_id: null, evidence_verdict: "insufficient_data" };
    }

    const mentionedNumbers = extractNumbers(complaint);
    
    const plausibleMatches = transactionHistory.filter(txn => {
        const hasAmountMatch = mentionedNumbers.includes(txn.amount);
        const hasCounterpartyMatch = complaint.includes(txn.counterparty.replace('+88', ''));
        return hasAmountMatch || hasCounterpartyMatch;
    });

    // Case 1: No matches found
    if (plausibleMatches.length === 0) {
        return { relevant_transaction_id: null, evidence_verdict: "insufficient_data" };
    }

    // Case 2: Exactly one match
    if (plausibleMatches.length === 1) {
        const matchedTxn = plausibleMatches[0];
        
        // Added Bangla keywords (আসেনি, পাইনি, ভুল) to make the rule engine multilingual!
        const complaintImpliesFailure = /fail|didn't get|not received|error|আসেনি|পাইনি|যায়নি/i.test(complaint);
        let verdict = "consistent";
        
        if (complaintImpliesFailure && matchedTxn.status === "completed") {
            const isWrongTransfer = /wrong|mistake|ভুল/i.test(complaint);
            if (!isWrongTransfer) verdict = "inconsistent";
        }
        return { relevant_transaction_id: matchedTxn.transaction_id, evidence_verdict: verdict };
    }

    // Case 3: Multiple matches (Duplicate check)
    if (plausibleMatches.length > 1) {
        const firstMatch = plausibleMatches[0];
        const isDuplicate = plausibleMatches.every(txn => txn.amount === firstMatch.amount && txn.counterparty === firstMatch.counterparty);

        if (isDuplicate) {
            plausibleMatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return {
                relevant_transaction_id: plausibleMatches[0].transaction_id, 
                evidence_verdict: "consistent"
            };
        }

        return { relevant_transaction_id: null, evidence_verdict: "insufficient_data" };
    }
}

module.exports = { analyzeEvidence };