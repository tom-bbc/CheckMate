const { sentenceClaimDetection, transcriptClaimDetection } = require('./ClaimDetection');
const { googleFactCheck } = require('./GoogleFactCheck');
const { searchAndReview } = require('./SearchAndReview');
const { splitTranscriptBySentence, countWordsInSentence } = require('./utils');


module.exports.CheckMate = async (input_transcript, openai_api_key, service, input_type) => {
    // Data structures & variables
    service = service ?? "Google Fact Check";
    openai_api_key = openai_api_key ?? '';
    let fact_checked_claims = [];

    if (input_type === "sentences") {
        // Split transcript into composite sentences
        const sentences = splitTranscriptBySentence(transcript);

        // Extract claims & fact check each sentence
        fact_checked_claims = sentencesCheckMate(sentences, openai_api_key, service);
    } else if (input_type === "transcript") {
        fact_checked_claims = transcriptCheckMate(input_transcript, openai_api_key, service);
    }

    return fact_checked_claims;
}


const sentencesCheckMate = async (transcript_sentences, openai_api_key, service) => {
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
        const detected_claims = await sentenceClaimDetection(sentence, openai_api_key);

        if (detected_claims.length === 0) {
            database.push(claimless_sentence);
            continue;
        }

        // Claim verification using Google Fact Check or Google search & OpenAI summary
        let fact_checked_claims = await checkClaimArray(detected_claims, service, openai_api_key);

        fact_checked_claims = fact_checked_claims.map(checked_claim => {
            checked_claim.transcriptSentence = sentence;
            return checked_claim;
        });

        database.push(...fact_checked_claims);
    }

    return database;
}


const transcriptCheckMate = async (transcript, openai_api_key, service) => {
    // Use OpenAI GPT model to detect & extract claims in the transcript
    const detected_claims = await transcriptClaimDetection(transcript, openai_api_key);

    // Claim verification using Google Fact Check or Google search & OpenAI summary
    let fact_checked_claims = await checkClaimArray(detected_claims, service, openai_api_key);

    return fact_checked_claims;
}


const checkSingleClaim = async (claim_text, fact_check_method, openai_api_key) => {
    // Data structures & variables
    let fact_check_result = [];

    // Send claim to either Google Fact Check API or use the Google search & OpenAI summary method
    if (fact_check_method.toLowerCase() === "any") {
        fact_check_result = await googleFactCheck(claim_text);

        if (fact_check_result.length === 0) {
            fact_check_result = await searchAndReview(claim_text, openai_api_key);
        }

    } else if (fact_check_method.toLowerCase() === "google fact check") {
        fact_check_result = await googleFactCheck(claim_text);

    } else if (fact_check_method.toLowerCase() === "search and review" && openai_api_key != '') {
        fact_check_result = await searchAndReview(claim_text, openai_api_key);
    }

    return fact_check_result;
}


const checkClaimArray = async (detected_claims, fact_check_method, openai_api_key, origin_sentence) => {
    // Data structures & variables
    origin_sentence = origin_sentence ?? '';
    let fact_checked_claims = [];

    // Use fact-check methods to verify each claim in an array of claim objects
    for (let claim_index = 0; claim_index < detected_claims.length; claim_index++) {
        const claim = detected_claims[claim_index];
        const fact_check = await checkSingleClaim(claim, fact_check_method, openai_api_key);

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
