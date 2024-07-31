const { claimDetection } = require('./ClaimDetection');
const { factCheck, logFactChecks } = require('./GoogleFactCheck');

module.exports.getAndCheckClaims = async (transcript, log_output) => {
    // Data structures & variables
    log_output = log_output ?? false;
    let fact_check_database = [];

    // Use OpenAI GPT model to detect & extract claims in the transcript
    const detected_claims = await claimDetection(transcript);

    // Use Google Fact Check to verify each claim in the transcript
    for (let claim_index = 0; claim_index < detected_claims.length; claim_index++) {
        const claim = detected_claims[claim_index]['Claim'];
        const fact_check = await factCheck(claim);

        // Store result of each fact check in global database
        const database_entry = {
            "claim_from_transcript": claim,
            "google_fact_check": fact_check,
            "transcript_extract": transcript
        };
        fact_check_database.push(database_entry);

        if (log_output) {
            console.log("\n * Transcript claim  :", claim);
            logFactChecks(fact_check);
            console.log("\n------------------------------------------------------------------------------------------------------------------------");
        }
    }
}
