const { sentenceClaimDetection, transcriptClaimDetection } = require('./ClaimDetection');
const { googleFactCheck } = require('./GoogleFactCheck');
const { searchAndReview } = require('./SearchAndReview');
const { splitTranscriptBySentence, countWordsInSentence } = require('./utils');


module.exports.CheckMate = async (input_transcript, input_type, service, api_keys) => {
    // Data structures & variables
    service = service ?? "Google Fact Check";
    let fact_checked_claims = [];

    if (input_type.toLowerCase() === "sentences") {
        // Split transcript into composite sentences
        const sentences = splitTranscriptBySentence(input_transcript);

        // Extract claims & fact check each sentence
        fact_checked_claims = sentencesCheckMate(sentences, service, api_keys);
    } else if (input_type.toLowerCase() === "transcript") {
        fact_checked_claims = transcriptCheckMate(input_transcript, service, api_keys);
    }

    return fact_checked_claims;
}


const sentencesCheckMate = async (transcript_sentences, service, api_keys) => {
    // Populate sentence-claim-factcheck database
    let database = [];

    // Check each sentence for claim
    for (const sentence of transcript_sentences) {
        // Default element for sentences with no claim
        const claimless_sentence = {
            transcriptSentence: sentence,
            transcriptClaim: '',
            factCheckResults: []
        }

        // Only check for claims in long sentences
        const sentence_length = countWordsInSentence(sentence);
        if (sentence_length <= 3) {
            database.push(claimless_sentence);
            continue;
        }

        // Use OpenAI GPT model to detect & extract claims in the transcript
        const detected_claims = await sentenceClaimDetection(sentence, api_keys.openai);

        if (detected_claims.length === 0) {
            database.push(claimless_sentence);
            continue;
        }

        // Claim verification using Google Fact Check or Google search & OpenAI summary
        let fact_checked_claims = await checkClaimArray(detected_claims, service, sentence, api_keys);

        fact_checked_claims = fact_checked_claims.map(checked_claim => {
            checked_claim.transcriptSentence = sentence;
            return checked_claim;
        });

        database.push(...fact_checked_claims);
    }

    return database;
}


const transcriptCheckMate = async (transcript, service, api_keys) => {
    // Use OpenAI GPT model to detect & extract claims in the transcript
    const detected_claims = await transcriptClaimDetection(transcript, api_keys.openai);

    // Claim verification using Google Fact Check or Google search & OpenAI summary
    let fact_checked_claims = await checkClaimArray(detected_claims, service, '', api_keys);

    return fact_checked_claims;
}


const checkSingleClaim = async (claim_text, fact_check_method, api_keys) => {
    // Data structures & variables
    let fact_check_result = [];

    // Send claim to either Google Fact Check API or use the Google search & OpenAI summary method
    if (fact_check_method.toLowerCase() === "any") {
        fact_check_result = await googleFactCheck(claim_text, api_keys.google_fact_check);

        if (fact_check_result.length === 0) {
            fact_check_result = await searchAndReview(claim_text, api_keys);
        }

    } else if (fact_check_method.toLowerCase() === "google fact check") {
        fact_check_result = await googleFactCheck(claim_text, api_keys.google_fact_check);

    } else if (fact_check_method.toLowerCase() === "search and review") {
        fact_check_result = await searchAndReview(claim_text, api_keys);
    }

    return fact_check_result;
}


const checkClaimArray = async (detected_claims, fact_check_method, origin_sentence, api_keys) => {
    // Data structures & variables
    let fact_checked_claims = [];

    // Use fact-check methods to verify each claim in an array of claim objects
    for (let claim_index = 0; claim_index < detected_claims.length; claim_index++) {
        const claim = detected_claims[claim_index];
        const fact_check = await checkSingleClaim(claim, fact_check_method, api_keys);

        // Format claim & fact-check together for database storage
        const checked_claim = {
            transcriptSentence: origin_sentence,
            transcriptClaim: claim,
            factCheckResults: fact_check
        }

        // Store result of each fact check in global database with its associated claim
        fact_checked_claims.push(checked_claim);
    }

    return fact_checked_claims;
}
