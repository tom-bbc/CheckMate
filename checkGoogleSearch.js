const axios = require('axios');
const extractor = require('unfluff');
const { OpenAI } = require("openai");
const { formatJSONfromOpenAI } = require('./utils');
const credentials = require('./credentials.json');


const getGoogleSearchContext = async (claim) => {
    const GOOGLE_SEARCH_API_KEY = credentials.google_search_api_key;
    const SEARCH_ENGINE_ID = credentials.google_search_cx_id;
    const num_search_results = 5;
    const google_search_url = "https://www.googleapis.com/customsearch/v1";

    const params = {
        num: num_search_results,
        key: GOOGLE_SEARCH_API_KEY,
        cx: SEARCH_ENGINE_ID,
        q: claim
    };

    const response = await axios.get(google_search_url, {params});
    const search_results_raw = response.data.items;

    const fact_check_articles = [];

    for (const search_result of search_results_raw) {
        if (search_result.fileFormat) {
            continue;
        }

        const article = await axios.get(search_result.link);
        let article_contents = extractor(article.data);

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

    return fact_check_articles;
}


module.exports.factCheckGoogleSearch = async (claim, openai_api_key) => {
    // Send Google search query to find relevant articles on the web
    const contextual_articles = await getGoogleSearchContext(claim);

    // Setup OpenAI model connection
    const openai = new OpenAI({ apiKey: openai_api_key });

    // Send claim & each article to OpenAI to fact-check the claim
    let fact_checked_claim = {
        claim: claim,
        fact_checks: []
    }

    let fact_check_article_response = {
        conclusion: 'None',
        article_subsection: 'None'
    }

    for (const article of contextual_articles) {
        // Define prompt to send fact check articles to GPT to cross reference with the claim and fact-check
        const prompt = `
            I will provide you with a news article and a statement. The statement may or may not be discussed in the article. Your task is to use the news article to fact-check the statement with reference to the content of the article.

            Firstly, identify and extract the relevant article_subsection of text from the article that relates to the statement. Note that the statement may not be included in the article, and the article may be irrelecant to the statement. If a relevant article_subsection is found, this should be output as an exact quote within the JSON format specified below, filling the field 'article_subsection'. If no relevant article_subsection is found, 'article_subsection' should be output with the value 'None'.

            Second, if a relevant article_subsection is found, this should be used to fact-check the input statement by cross-referencing whether the article supports or disproves the statament. If the article supports the statement, the field 'conclusion' in the output JSON object should be given the value 'true'. If the article disproves the statement, the 'conclusion' field should take the value 'false'. If it is not entirely certain whether the article supports or disproves the statement, or more information is needed to produce such a conclusion, the 'conclusion' field should take the value 'Uncertain'. If no relevant article_subsection of text from the article was found in the first task, output 'None' within the 'conclusion' field.

            The output should appear in JSON format as follows:

            "
                {
                    "conclusion": 'True' or 'False' or 'Uncertain' or 'None'.
                    "article_subsection": The relevant article_subsection of the article text to the statement, or 'None' if no relevant article_subsection of text is found.
                }
            "

            Here is the input statement: "${claim}"

            Here is the input article:
            ${article.text}
        `;

        // Query OpenAI to cross-reference claim and news article to generate fact-check
        try {
            const response = await openai.chat.completions.create({
                messages: [
                    {
                        "role": "system",
                        "content": "You are a helpful assistant focussed fact-checking statements based on news article extracts."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    },
                ],
                model: "gpt-4o",
            });

            fact_check_article_response = formatJSONfromOpenAI(response);

        } catch (error) {
            console.error(error);
            console.log("ERROR: OpenAI call failed.");
        }

        // If fact-check generated, add to collection
        if (fact_check_article_response.conclusion != 'None' && fact_check_article_response.article_subsection != 'None') {
            const fact_check_info = {
                article_url: article.url,
                conclusion: fact_check_article_response.conclusion,
                article_title: article.title,
                article_publisher: article.publisher,
                article_date: article.date,
                article_lang: article.lang,
                article_subsection: fact_check_article_response.article_subsection
            }

            fact_checked_claim.fact_checks.push(fact_check_info);
        }
    }

    return fact_checked_claim;
}
