const { z } = require("zod");
const axios = require("axios");
const extractor = require("unfluff");
const { OpenAI } = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");


const claimReviewObject = z.object({
    conclusion: z.string(),
    article_subsection: z.string(),
});


const getGoogleSearchContext = async (search_query, api_keys) => {
    const num_search_results = 3;
    const google_search_api = "https://www.googleapis.com/customsearch/v1";

    const params = {
        num: num_search_results,
        key: api_keys.google,
        cx: api_keys.search_engine_id,
        q: search_query
    };

    let response = await axios.get(google_search_api, {params});
    response = response.data;

    const fact_check_articles = [];

    if (Object.keys(response).length > 0) {
        for (const search_result of response.items) {
            if (search_result.fileFormat) {
                continue;
            }

            let article;
            try {
                article = await axios.get(search_result.link);
            } catch (error) {
                console.log(`<!> ERROR: "${error.message}". Cannot retrieve article at URL "${search_result.link}". <!>`);
                continue;
            }

            const article_contents = extractor(article.data);
            const article_info = {
                url: search_result.link,
                title: article_contents.title,
                date: article_contents.date,
                publisher: article_contents.publisher,
                lang: article_contents.lang,
                text: article_contents.text
            };

            fact_check_articles.push(article_info);
        }
    }

    return fact_check_articles;
}


const reviewClaimAgainstArticle = async (claim_text, article_text, openai_connection) => {
    // Define prompt to send fact check articles to GPT to cross reference with the claim and fact-check
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


    // Query OpenAI to cross-reference claim and news article to generate fact-check
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

        // Extract array of claim review result from OpenAI response
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


module.exports.searchAndReview = async (claim_text, api_keys) => {
    // Send Google search query to find relevant articles on the web
    const contextual_articles = await getGoogleSearchContext(claim_text, api_keys);

    // Setup OpenAI model connection
    const openai = new OpenAI({ apiKey: api_keys.openai });

    // Send claim & each article to OpenAI to fact-check the claim
    let fact_check_results = [];

    for (const article of contextual_articles) {
        const article_text = article.text;
        const article_url = new URL(article.url);
        const publisher_url_href = article_url.origin;

        const fact_check = await reviewClaimAgainstArticle(claim_text, article_text, openai);

        // If fact-check generated, add to collection
        if (fact_check.conclusion != 'None' && fact_check.article_subsection != 'None') {
            const factCheckResult = {
                factCheckMethod: "Search and review (Google & OpenAI)",
                matchedClaimTitle: article.title,
                matchedClaimSpeaker: 'None',
                claimReview: [{
					publisher: {
						name: article.publisher,
						url: publisher_url_href
                    },
                    url: article_url.href,
                    title: article.title,
                    textualRating: fact_check.conclusion,
                    languageCode: article.lang,
                    reviewArticleExtract: fact_check.article_subsection,
                }]
            }

            fact_check_results.push(factCheckResult);
        }
    }

    return fact_check_results;
}
