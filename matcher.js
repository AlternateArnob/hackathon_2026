// matcher.js

/**
 * Extracts potential amounts from a text string.
 * Looks for digits, ignoring commas (e.g., "5000", "5,000").
 */
function extractNumbers(text) {
    const regex = /\b\d+(?:,\d+)*\b/g;
    const matches = text.match(regex);
    return matches ? matches.map(num => parseFloat(num.replace(/,/g, ''))) : [];
}

/**
 * Analyzes the ticket and transaction history to determine the evidence verdict.
 */
function analyzeEvidence(complaint, transactionHistory) {
    // If there's no history, we instantly have insufficient data (common for phishing reports)
    if (!transactionHistory || transactionHistory.length === 0) {
        return {
            relevant_transaction_id: null,
            evidence_verdict: "insufficient_data"
        };
    }

    const mentionedNumbers = extractNumbers(complaint);
    
    // Filter history to find transactions that match ANY number mentioned in the complaint
    // We check both the transaction amount and the counterparty (like a phone number)
    const plausibleMatches = transactionHistory.filter(txn => {
        const hasAmountMatch = mentionedNumbers.includes(txn.amount);
        const hasCounterpartyMatch = complaint.includes(txn.counterparty.replace('+88', '')); // Strip country code for matching
        
        return hasAmountMatch || hasCounterpartyMatch;
    });

    // Case 1: No matches found
    if (plausibleMatches.length === 0) {
        return {
            relevant_transaction_id: null,
            evidence_verdict: "insufficient_data"
        };
    }

    // Case 2: Exactly one match (The ideal scenario)
    if (plausibleMatches.length === 1) {
        const matchedTxn = plausibleMatches[0];
        
        // Let's do a basic consistency check. 
        // If they complain about a "failed" transaction, but the system says "completed", it's inconsistent.
        const complaintImpliesFailure = /fail|didn't get|not received|error/i.test(complaint);
        
        let verdict = "consistent";
        if (complaintImpliesFailure && matchedTxn.status === "completed") {
            // Wait, if it's a wrong transfer, it SHOULD be completed.
            const isWrongTransfer = /wrong|mistake/i.test(complaint);
            if (!isWrongTransfer) {
                verdict = "inconsistent";
            }
        }

        return {
            relevant_transaction_id: matchedTxn.transaction_id,
            evidence_verdict: verdict
        };
    }

    // Case 3: Multiple matches (Ambiguity)
    // E.g., The customer says "my 1000 taka transfer failed" but they made three 1000 taka transfers today.
    // The manual explicitly states to return insufficient_data here instead of guessing.
    return {
        relevant_transaction_id: null,
        evidence_verdict: "insufficient_data"
    };
}

module.exports = { analyzeEvidence };