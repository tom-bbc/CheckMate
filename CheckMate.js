const { claimDetection } = require('./ClaimDetection');
const { googleFactCheck } = require('./GoogleFactCheck');
const { factCheckGoogleSearch } = require('./checkGoogleSearch');


module.exports.getClaims = async (transcript, openai_api_key) => {
    // Use OpenAI GPT model to detect & extract claims in the transcript
    const detected_claims = await claimDetection(transcript, openai_api_key);
    return detected_claims;
}


const checkSingleClaim = async (claim_text, fact_check_method, openai_api_key) => {
    let fact_check_result = [];

    // Send claim to either Google Fact Check API or use the Google search & OpenAI summary method
    if (fact_check_method.toLowerCase() === "any") {
        fact_check_result = await googleFactCheck(claim_text);

        if (fact_check_result.length === 0) {
            fact_check_result = await factCheckGoogleSearch(claim_text, openai_api_key);
        }

    } else if (fact_check_method === "Google Fact Check") {
        fact_check_result = await googleFactCheck(claim_text);

    } else if (fact_check_method === "Google search & OpenAI summary" && openai_api_key != '') {
        fact_check_result = await factCheckGoogleSearch(claim_text, openai_api_key);
    }

    // Format claim & fact-check together for database storage
    let fact_checked_claim = {
        transcriptClaim: claim_text,
        factCheckResults: fact_check_result
    }

    return fact_checked_claim;
}


module.exports.checkClaimArray = async (detected_claims, fact_check_method, openai_api_key) => {
    // Data structures & variables
    fact_check_method = fact_check_method ?? "Google Fact Check";
    openai_api_key = openai_api_key ?? '';
    let fact_checked_claims = [];

    // Use fact-check methods to verify each claim in an array of claim objects
    for (let claim_index = 0; claim_index < detected_claims.length; claim_index++) {
        const claim = detected_claims[claim_index].Claim;
        const checked_claim = await checkSingleClaim(claim, fact_check_method, openai_api_key);

        // Store result of each fact check in global database with its associated claim
        fact_checked_claims.push(checked_claim);
        console.log(checked_claim);
    }

    return fact_checked_claims;
}
