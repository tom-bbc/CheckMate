const { z } = require("zod");
const axios = require("axios");
const extractor = require("unfluff");
const { OpenAI } = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const { getClaimSimilarities } = require("../claims/FactCheckDatabase");


// Response object from OpenAI API call containing a claim review
const claimReviewObject = z.object({
    conclusion: z.string(),
    article_subsection: z.string(),
});


// Gather relevant articles using Google Search API
const searchForRelevantArticles = async (search_query, google_api_key, google_search_id) => {
    // Input parameters
    const black_listed_sources = [
        "https://trumpwhitehouse.archives.gov",
    ];

    // Call Google Search API to find relevant article URLs to input claim
    const num_search_results = 3;
    const google_search_api = "https://www.googleapis.com/customsearch/v1";

    const params = {
        num: num_search_results,
        key: google_api_key,
        cx: google_search_id,
        q: search_query
    };

    let response = await axios.get(google_search_api, {params});
    response = response.data;

    if (Object.keys(response).length === 0) {
        return [];
    }

    // Extract article body text from found URLs
    let fact_check_articles = [];
    for (const search_result of response.items) {
        // Skip article if not correct format
        if (search_result.fileFormat) {
            continue;
        }

        // Skip article if from a blacklisted website
        const article_url = search_result.link;
        const is_blacklisted = black_listed_sources.map(source => article_url.includes(source));
        if (is_blacklisted.includes(true)) {
            continue;
        }

        // Extract content from webpage
        let article;
        try {
            article = await axios.get(article_url);
        } catch (error) {
            console.log(`<!> ERROR: "${error.message}". Cannot retrieve article at URL "${article_url}". <!>`);
            continue;
        }

        const article_contents = extractor(article.data);

        // Format article content into output data structure
        const article_info = {
            url: article_url,
            title: article_contents.title,
            date: article_contents.date,
            publisher: article_contents.publisher,
            lang: article_contents.lang,
            text: article_contents.text
        };

        fact_check_articles.push(article_info);
    }

    return fact_check_articles;
}


// Review article for presence of claim and use to fact-check the claim (using OpenAI)
const reviewClaimAgainstArticle = async (claim_text, article_text, openai_connection) => {
    // Define prompt to cross-reference article contents with the claim to fact-check it
    const system_prompt = `
        I will provide you with a news article and a statement. The statement may or may not be discussed in the article. Your task is to use the news article to fact-check the statement with reference to the content of the article and return an output.

        Firstly, identify and extract the relevant article_subsection of text from the article that relates to the statement. Note that the statement may not be included in the article, and the article may be irrelecant to the statement. If a relevant article_subsection is found, this should be output as an exact quote within the JSON format specified below, filling the field 'article_subsection'. If no relevant article_subsection is found, 'article_subsection' should be output with the value 'None'.

        Second, if a relevant article_subsection is found, this should be used to fact-check the input statement by cross-referencing whether the article supports or disproves the statament. If the article supports the statement, the field 'conclusion' in the output JSON object should be given the value 'true'. If the article disproves the statement, the 'conclusion' field should take the value 'false'. If it is not entirely certain whether the article supports or disproves the statement, or more information is needed to produce such a conclusion, the 'conclusion' field should take the value 'Uncertain'. If no relevant article_subsection of text from the article was found in the first task, output 'None' within the 'conclusion' field.

        The output should contain:
            - "conclusion": 'True' or 'False' or 'Uncertain' or 'None'.
            - "article_subsection": The relevant article_subsection of the article text to the statement, or 'None' if no relevant article_subsection of text is found.

    `;

    const user_prompt = `
        Here is the input statement: "${claim_text}"

        Here is the input article:
        ${article_text}
    `;

    // Query OpenAI to cross-reference claim and news article to fact-check the claim
    let response;
    let claim_review = {
        conclusion: 'None',
        article_subsection: 'None'
    }

    if (article_text.length > 0) {
        try {
            response = await openai_connection.chat.completions.create({
                messages: [
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": user_prompt },
                ],
                model: "gpt-4o-2024-08-06",
                response_format: zodResponseFormat(claimReviewObject, "output"),
            });
        } catch (error) {
            console.log(`<!> ERROR: "${error.message}". Cannot get response from OpenAI. <!>`);
            return claim_review;
        }

        // Extract array of claim review result from OpenAI response and format for output
        response = response.choices[0].message;

        if (response.refusal) {
            return claim_review;
        } else {
            claim_review = JSON.parse(response.content);
            return claim_review;
        }
    } else {
        return claim_review;
    }
}


// Search for relevant articles and use to fact-check claim, using Google Search and an OpenAI model
module.exports.searchAndReview = async (claim_text, google_api_key, google_search_id, openai_api_key) => {
    // Parameters and variables
    let generate_similarity_scores = true;

    // Send Google search query to find relevant articles on the web
    const contextual_articles = await searchForRelevantArticles(claim_text, google_api_key, google_search_id);

    // Setup OpenAI model connection
    const openai = new OpenAI({ apiKey: openai_api_key });

    // Send claim & each article to OpenAI to fact-check the claim
    let fact_checked_claims = [];

    for (const article of contextual_articles) {
        const article_text = article.text;
        const article_url = new URL(article.url);
        const publisher_url_href = article_url.origin;
        const publisher_name = article.publisher ?? "None";

        const fact_check = await reviewClaimAgainstArticle(claim_text, article_text, openai);

        // If fact-check generated, add to collection
        if (fact_check.conclusion !== 'None' && fact_check.article_subsection !== 'None') {
            const fact_check_result = {
                factCheckMethod: "Search and review (Google & OpenAI)",
                matchedClaim: article.title,
                claimSimilarity: "None",
                matchedClaimSpeaker: "None",
                claimReview: [{
					publisher: {
						name: publisher_name,
						url: publisher_url_href
                    },
                    url: article_url.href,
                    title: article.title,
                    textualRating: fact_check.conclusion,
                    languageCode: article.lang,
                    reviewArticleExtract: fact_check.article_subsection,
                }]
            }

            fact_checked_claims.push(fact_check_result);
        }
    }

    // Generate 'similarity score' between input claim and matched claims
    if (generate_similarity_scores) {
        // Get score
        const matched_claims = fact_checked_claims.map(result => result.matchedClaim);
        const claim_similarities = await getClaimSimilarities(claim_text, matched_claims, openai_api_key);

        // Add score to claim object
        if (claim_similarities.length === fact_checked_claims.length) {
            fact_checked_claims = fact_checked_claims.map((result, index) => {
                result.claimSimilarity = claim_similarities[index];
                return result;
            });
        }

        // Sort claims by score
        fact_checked_claims.sort((result_1, result_2) => result_2.claimSimilarity - result_1.claimSimilarity);
    }

    return fact_checked_claims;
}
