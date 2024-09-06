const axios = require("axios");


module.exports.googleFactCheck = async (claim_text, google_fact_check_api_key) => {
    const fact_check_api = "https://factchecktools.googleapis.com/v1alpha1/claims:search";

    const params = {
        key: google_fact_check_api_key,
        query: claim_text
    };
    let response;

    try {
        response = await axios.get(fact_check_api, {params});
    } catch (error) {
        console.error(
            `<!> ERROR: "${error.message}". Google Fact Check API call failed. <!>`
          );
          return [];
    }
    response = response.data;
    let fact_check_results = [];

    if (Object.keys(response).length > 0) {
        for (const result of response.claims) {
            let claim_reviews = result.claimReview;
            claim_reviews = claim_reviews.map(review => {
                review.reviewArticleExtract = 'None';
                return review;
            });

            const factCheckResult = {
                factCheckMethod: "Google Fact Check",
                matchedClaimTitle: result.text,
                matchedClaimSpeaker: result.claimant,
                claimReview: claim_reviews
            }

            fact_check_results.push(factCheckResult);
        }
    }

    return fact_check_results;
};
