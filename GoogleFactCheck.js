const fetch = require('node-fetch');


module.exports.googleFactCheck = async (claim_text, google_fc_api_key) => {
    const url = "https://factchecktools.googleapis.com/v1alpha1/claims:search";
    const request = `${url}?key=${google_fc_api_key}&query=${claim_text}`;

    let response = await fetch(request);
    response = await response.json();

    let fact_check_results = [];

    if (Object.keys(response).length > 0) {
        for (const result of response['claims']) {
            let claim_reviews = result.claimReview;
            claim_reviews = claim_reviews.map(review => {
                review.reviewArticleExtract = '';
                return review;
            });

            const factCheckResult = {
                factCheckMethod: "Google Fact Check",
                matchedClaimTitle: result.text,
                matchedClaimSpeaker: result.claimant,
                reviewArticleExtract: '',
                claimReview: claim_reviews
            }

            fact_check_results.push(factCheckResult);
        }
    }

    return fact_check_results;
};
