const fetch = require('node-fetch');
const credentials = require('./credentials.json');

exports.factCheck = async (claim) => {
    const google_api_key = credentials.google_fact_check_api_key;
    const url = "https://factchecktools.googleapis.com/v1alpha1/claims:search";
    const request = `${url}?key=${google_api_key}&query=${claim}`;

    let response = await fetch(request);
    response = await response.json();

    if (Object.keys(response).length === 0) {
        return [];
    } else {
        return response['claims'];
    }
};

exports.logFactChecks = (fact_checks) => {
    if (fact_checks.length === 0) {
        console.log(" * Fact check result : No information found in Google Fact Check database.");

    } else {
        console.log(" * Fact check result :");

        for (let result_index = 0; result_index < fact_checks.length; result_index++) {
            const result = fact_checks[result_index];

            console.log(`     * Result #${result_index + 1}:`);
            console.log("         * Claim:");
            if (Object.hasOwnProperty.call(result, 'text'))      console.log(`             * Title: ${result['text']}`);
            if (Object.hasOwnProperty.call(result, 'claimDate')) console.log(`             * Date: ${new Date(result['claimDate'])}`);
            if (Object.hasOwnProperty.call(result, 'claimant'))  console.log(`             * Source: ${result['claimant']}`);

            for (let review_idx = 0; review_idx < result['claimReview'].length; review_idx++) {
                const review = result['claimReview'][review_idx];

                console.log("         * Review info:");
                if (Object.hasOwnProperty.call(review, 'title'))         console.log(`             * Title: ${review['title']}`);
                if (Object.hasOwnProperty.call(review, 'reviewDate'))    console.log(`             * Date: ${new Date(review['reviewDate'])}`);
                if (Object.hasOwnProperty.call(review, 'publisher'))     console.log(`             * Source: ${review['publisher']['name']} (${review['publisher']['site']})`);
                if (Object.hasOwnProperty.call(review, 'textualRating')) console.log(`             * Conclusion: ${review['textualRating']}`);
                if (Object.hasOwnProperty.call(review, 'url'))           console.log(`             * Full review: ${review['url']}`);
            }
        }
    }
}
