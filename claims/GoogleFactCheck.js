const axios = require("axios");


module.exports.googleFactCheck = async (claim_text, google_fact_check_api_key) => {
    // Call Google Fact Check API to match input claim to known fact-checked claims
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

    if (Object.keys(response).length === 0) {
        return [];
    }

    // Extract relevant fact-check info from response and format into output data structure
    let fact_check_results = response['claims'];
    fact_check_results = fact_check_results.map(result => {
        return {
            factCheckMethod: "Google Fact Check",
            matchedClaimTitle: result.text,
            matchedClaimSpeaker: result.claimant,
            claimReview: result.claimReview
        }
    });

    return fact_check_results;
};
