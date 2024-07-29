const fetch = require('node-fetch');
const credentials = require('./credentials.json');

exports.factCheck = async (claim) => {
    const google_api_key = credentials.google_fact_check_api_key;
    const url = "https://factchecktools.googleapis.com/v1alpha1/claims:search";
    const request = `${url}?key=${google_api_key}&query=${claim}`;

    let response = await fetch(request);
    response = await response.json();
    return response;
};

exports.logFactChecks = (fact_checks) => {
    if (Object.keys(fact_checks).length === 0) {
        console.log("No fact checks found in the Google Fact Check database.");
        return false;
    }

    console.log("\nFact check:\n");
    const claims = fact_checks['claims'];

    for (let result_index = 0; result_index < claims.length; result_index++) {
        const result = claims[result_index];

        console.log(` * Result #${result_index + 1}:`);
        console.log("     * Claim:");
        console.log(`         * Title: ${result['text']}`);
        console.log(`         * Date: ${result['claimDate']}`);
        console.log(`         * Source: ${result['claimant']}`);

        for (let review_idx = 0; review_idx < result['claimReview'].length; review_idx++) {
            const review = result['claimReview'][review_idx];

            console.log("     * Review info:");
            // if (Object.hasOwnProperty.call(review, 'title')) {
            console.log(`         * Title: ${review['title']}`);
            console.log(`         * Date: ${result['claimDate']}`);
            console.log(`         * Source: ${result['claimant']}`);
            console.log(`         * Conclusion: ${review['textualRating']}`);
            console.log(`         * Full review: ${review['url']}`);
        }

        console.log();
    }

    return true;
}
