const { z } = require("zod");
const axios = require("axios");
const extractor = require("unfluff");
const { OpenAI } = require("openai");
const { zodResponseFormat } = require("openai/helpers/zod");
const { getEmbedding, getMultipleEmbeddings, getEmbeddingSimilarity } = require("./FactCheckDatabase");
const { XMLParser } = require('fast-xml-parser');


// List of supported sources to find fact-check articles
const PRIMARY_SOURCES = [
    "bbc.co.uk",
    "bbc.com",
    "reuters.com",
    "news.sky.com",
    "channel4.com",
    "itv.com",
    "theguardian.com",
    "thetimes.com",
    "economist.com",
    "uk.news.yahoo.com",
    "independent.co.uk",
    "ft.com",
    "gov.uk",
    "fullfact.org",
    "factcheck.org",
    "pbs.org",
    "wsj.com",
    "abcnews.go.com",
    "apnews.com",
    "cbsnews.com"
];

// Response object from OpenAI API call containing a claim review
const claimReviewObject = z.object({
    article_section: z.string(),
    summary: z.string(),
    speaker: z.string(),
});


module.exports.searchAndReview = async (claim_text, google_api_key, google_search_id, openai_api_key, newscatcher_api_key) => {
    /**
     * Search for relevant articles and use to fact-check claim, using Google Search and an OpenAI model
     */
    // Parameters and variables
    const generate_similarity_scores = true;
    const article_similarity_threshold = 40;
    console.log(`\nDetected claim: "${claim_text}".`);

    /**
    const response_articles = await searchGoogle(claim_text, google_api_key, google_search_id);
    contextual_articles = await getArticleContents(response_articles);
    */

    // Send search query to find contextual article URLs and their contents using NewsCatcher API
    let contextual_articles = await searchNewsCatcher(claim_text, newscatcher_api_key);
    console.log(`\nNewsCatcher API: found ${contextual_articles.length} articles.`);

    // Generate similarity scores between claim and matched fact-check articles
    let openai;
    let claim_embedding;
    let similarity_scores;
    if (generate_similarity_scores) {
        // Setup OpenAI model connection
        try {
            openai = new OpenAI({ apiKey: openai_api_key });
        } catch (error) {
            console.log(`<!> ERROR: "${error.message}". Cannot set up OpenAI connection. <!>`);
            return [];
        }

        // Get embedding of input claim to facilitate generation of similarity scores
        claim_embedding = await getEmbedding(claim_text, openai);

        // Get embeddings of matched articles
        if (contextual_articles.length > 0) {
            const article_descriptions = contextual_articles.map(article => article.description);
            const article_embeddings = await getMultipleEmbeddings(article_descriptions, openai);

            // Compute similarity score between claim and article
            similarity_scores = article_embeddings.map(embedding => Number((100 * getEmbeddingSimilarity(claim_embedding, embedding)).toFixed(2)));
        }
    }

    // If articles found during search, review their contents using OpenAI model to fact-check the claim
    let fact_checked_claims = [];

    for (let index = 0; index < contextual_articles.length; index++) {
        const article = contextual_articles[index];
        const article_text = article.text;
        const article_url = new URL(article.url);

        const fact_check = await reviewClaimAgainstArticle(claim_text, article_text, openai);

        // If fact-check generated, add to collection
        if (fact_check.summary !== 'None' || fact_check.article_section !== 'None') {
            const publisher_url_href = article_url.origin;
            const publisher_name = article.publisher ?? article_url.hostname.replace('www.', '');
            const relevant_article_section = fact_check.article_section.replace(/<[^>]*>/g, '').replace(/[^\x00-\x7F]/g, '');

            let fact_check_result = {
                factCheckMethod: "Search and review (NewsCatcher & OpenAI)",
                matchedClaim: article.title,
                claimSimilarity: "None",
                matchedClaimSpeaker: fact_check.speaker,
                claimReview: [{
                    publisher: {
                        name: publisher_name,
                        url: publisher_url_href
                    },
                    url: article_url.href,
                    title: article.title,
                    textualRating: fact_check.summary,
                    languageCode: article.lang,
                    reviewArticleExtract: relevant_article_section,
                }]
            }

            // Add similarity score between claim and matched article
            if (generate_similarity_scores) {
                fact_check_result.claimSimilarity = similarity_scores[index];
            }

            // Constrict output to only return relevant articles
            fact_checked_claims.push(fact_check_result);
            console.log(`\n * Fact-check source: '${article.publisher}' - Claim rating: '${fact_check.summary}' - Similarity score: ${fact_check_result.claimSimilarity}`);
        }
    }

    // If no relevant articles found using Google Search / NewsCatcher, also check the Google News RSS feed
    if (fact_checked_claims.length === 0) {
        // Fetch contextual article URLs to input claim using Google News RSS feed
        const response_articles = await searchGoogleNews(claim_text);
        console.log(`\nGoogle News RSS Feed: found ${response_articles.length} articles.`);

        // Generate similarity scores between claim and matched fact-check articles
        if (generate_similarity_scores && response_articles.length > 0) {
            // Get embeddings of matched articles
            const article_descriptions = response_articles.map(article => article.description);
            const article_embeddings = await getMultipleEmbeddings(article_descriptions, openai);

            // Compute similarity score between claim and article
            similarity_scores = article_embeddings.map(embedding => Number((100 * getEmbeddingSimilarity(claim_embedding, embedding)).toFixed(2)));
        }

        // Format claim & article as fact-check object
        for (let index = 0; index < response_articles.length; index++) {
            // Format fact-check object
            const article = response_articles[index];

            let fact_check_result = {
                factCheckMethod: "Search and review (Google News)",
                matchedClaim: article.title,
                claimSimilarity: "None",
                matchedClaimSpeaker: "None",
                claimReview: [{
                    publisher: article.publisher,
                    url: article.url,
                    title: article.title,
                    textualRating: "None",
                    languageCode: "en",
                    reviewArticleExtract: "None",
                }]
            }

            // Add similarity score between claim and matched article
            if (generate_similarity_scores) {
                fact_check_result.claimSimilarity = similarity_scores[index];
            }

            // Constrict output to only return relevant articles
            if (fact_check_result.claimSimilarity === 'None' || fact_check_result.claimSimilarity > article_similarity_threshold) {
                fact_checked_claims.push(fact_check_result);
            }
            console.log(`\n * Fact-check source: '${article.publisher.name}' - Claim rating: '${article.title}' - Similarity score: ${fact_check_result.claimSimilarity}`);
        }
    }

    // Sort fact-check articles by similarity with claim
    if (generate_similarity_scores) {
        fact_checked_claims.sort((result_1, result_2) => result_2.claimSimilarity - result_1.claimSimilarity);
    }

    // Constrict output to only top 3 sources
    if (fact_checked_claims.length > 3) {
        fact_checked_claims = fact_checked_claims.slice(0, 3);
    }

    return fact_checked_claims;
}


const searchNewsCatcher = async (input_claim, newscatcher_api_key) => {
    /**
     * Search NewsCatcher API for article URLs and content relating to a claim
     * https://docs.newscatcherapi.com/api-docs/endpoints-1/search-news
     */
    const news_search_url = "https://v3-api.newscatcherapi.com/api/search";

    const config = {
        headers: {
            'x-api-token': newscatcher_api_key
        },
        params: {
            q: input_claim,
            page_size: 5,
            sources: PRIMARY_SOURCES.join(','),
            search_in: 'title,content',
        },
    }

    // Get response from NewsCatcher
    let response = [];
    try {
        response = await axios.get(news_search_url, config);
    } catch (error) {
        console.error(
            `<!> ERROR: "${error.message}". NewsCatcher API call failed. <!>`
        );
        return [];
    }

    if (response.status !== 200) {
        console.error(
            `<!> ERROR: "${response.status}". NewsCatcher API call failed. <!>`
        );
        return [];
    }

    if (Object.keys(response.data).length === 0) {
        console.error(
            `<!> No articles returned by NewsCatcher. <!>`
        );
        return [];
    }

    // Parse response and extract article contents
    const article_contents_responses = response.data.articles;
    let fact_check_articles = [];

    for (const article of article_contents_responses) {
        const article_info = {
            url: article.link,
            title: article.title,
            date: article.published_date,
            publisher: article.name_source,
            lang: article.language,
            description: article.description,
            text: article.content
        };

        fact_check_articles.push(article_info);
    }

    return fact_check_articles;
}


const searchGoogleNews = async (input_claim) => {
    /**
     * Search Google News RSS feed for article URLs relating to a claim
     * https://www.newscatcherapi.com/blog/google-news-rss-search-parameters-the-missing-documentaiton#toc-8
     */
    // Parameters and variables
    const restrict_sources = true;
    const restrict_date = false;

    const news_search_url = "https://news.google.com/rss/search";
    const hl = 'en-GB';
    const gl = 'GB';
    const ceid = 'GB:en';
    const lang_params = `hl=${hl}&gl=${gl}&ceid=${ceid}`;
    const time_threshold = '1m';

    // Format search request with parameters (query / date / sources)
    const search_query = input_claim.replace(/\.$/, "").replaceAll(' ', '+AND+');
    let query_url = news_search_url + `?${lang_params}&q=${search_query}`

    if (restrict_date) {
        query_url += `+when:${time_threshold}`;
    }

    if (restrict_sources) {
        for (let index = 0; index < PRIMARY_SOURCES.length; index++) {
            let source_name = PRIMARY_SOURCES[index];
            source_name = source_name.toLowerCase();
            source_name = source_name.replaceAll(' ', '');

            let new_source_code = `+inurl:${source_name}`;
            if (index !== 0) {
                new_source_code = '+OR' + new_source_code;
            }

            query_url += new_source_code;
        }
    }

    console.log(`\nGoogle News search query: ${query_url}`);

    // Send request to Google News and get response
    let response = [];
    try {
        response = await axios.get(query_url);
    } catch (error) {
        console.error(
            `<!> ERROR: "${error.message}". Google News call failed. <!>`
        );
        return [];
    }

    if (response.status !== 200) {
        console.error(
            `<!> ERROR: "${response.status}". Google News API call failed. <!>`
        );
        return [];
    }

    if (Object.keys(response.data).length === 0) {
        console.error(
            `<!> No articles returned by Google News. <!>`
        );
        return [];
    }

    // Parse response to get top article links
    const xml_options = {
        ignoreAttributes: false,
        attributeNamePrefix: '@',
    };
    const feed_parser = new XMLParser(xml_options);
    let feed_data = feed_parser.parse(response.data);
    feed_data = feed_data.rss.channel.item;

    if (typeof feed_data === 'undefined') {
        console.error(
            `<!> No articles returned by Google News. <!>`
        );
        return [];
    }

    if (!Array.isArray(feed_data)) {
        feed_data = [feed_data];
    }

    // Format output article object structure
    let output_article_data = feed_data.filter(search_result => PRIMARY_SOURCES.includes(search_result.source['@url'].replace('https://', '').replace('www.', '')));

    if (output_article_data.length > 5) {
        output_article_data = output_article_data.slice(0, 5);
    }

    output_article_data = output_article_data.map(search_result => {
        return {
            title: search_result.title,
            url: search_result.link.split('?')[0],
            date: search_result.pubDate,
            publisher: {
                name: search_result.source['#text'],
                url: search_result.source['@url']
            },
            description: search_result.description.replace(/<[^>]*>/g, '').replace(/[^\x00-\x7F]/g, '').split('&nbsp;')[0]
        }
    });

    return output_article_data;
}


const reviewClaimAgainstArticle = async (claim_text, article_text, openai_connection) => {
    /**
     * Review article for presence of claim and use to fact-check the claim (using OpenAI)
     */
    // Define prompt to cross-reference article contents with the claim to fact-check it
    const system_prompt = `
        I will provide you with a single fact-checkable claim and the contents of a news article.

        Firstly, read the contents of the article. Locate and extract the section of the text that discusses the claim and provides evidence for or against the factuality of the claim. The may not be expicitly discussed within the article, or the article may be irrelevant, in which case no section of the text should be extracted.

        If a relevant section is located that evidences the claim, return the text of the section in the response field 'article_section' as a string. Provide the exact extract text, do not rewrite any part of the section. If no relevant section is found in the article, the 'article_section' field should be output with the value 'None'.

        Secondly, if a relevant section is located, generate a single sentence summary of the section (from output field 'article_section') that contains all the relevant information in that section of text that provides evidence on the factuality of the input claim. This should be returned in the output field 'summary'. If no relevant article section was found in the first step, the 'summary' field should be output with the value 'None'.

        Thirdly, if the article section states who originally said the input claim that is being discussed, output their name in as the 'speaker' field. If the speaker is not definitively given, the 'speaker' field should be output as 'None'.

        The output structure:
            - 'article_section': The relevant section of the article text that evidences the input claim, or 'None' if no relevant section is found.
            - 'summary': A single sentence summary of the evidence provided about the factuality of the input claim in the above article section, or 'None' if no relevant section is found.
            - 'speaker': The person who said the input claim, or 'None' if no speaker can be identified.
    `;

    const user_prompt = `
        Here is the input statement: "${claim_text}"

        Here is the input article:
        ${article_text}
    `;

    // Query OpenAI to cross-reference claim and news article to fact-check the claim
    let response;
    let claim_review = {
        article_section: 'None',
        summary: 'None'
    }

    if (article_text.length > 0) {
        try {
            response = await openai_connection.chat.completions.create({
                messages: [
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": user_prompt },
                ],
                model: "gpt-4o",
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


const searchGoogle = async (input_claim, google_api_key, google_search_id) => {
    /**
     * Search Google for article URLs relating to a claim
     */
    // Parameters & variables
    const ui_language = "en";
    const search_language = `lang_${ui_language}`;
    const num_search_results = 5;
    const google_search_api = "https://www.googleapis.com/customsearch/v1";

    const params = {
        num: num_search_results,
        hl: ui_language,
        lr: search_language,
        key: google_api_key,
        cx: google_search_id,
        q: input_claim
    };

    // Send request to Google Search API and get response
    let response = [];

    try {
        response = await axios.get(google_search_api, {params});
    } catch (error) {
        console.error(
            `<!> ERROR: "${error.message}". Google Search API call failed. <!>`
        );
        return [];
    }

    if (response.status !== 200) {
        console.error(
            `<!> ERROR: "${response.status}". Google Search API call failed. <!>`
        );
        return [];
    }

    if (Object.keys(response.data).length === 0) {
        console.error(
            `<!> No articles returned by Google Search. <!>`
        );
        return [];
    }

    // Parse response to get top article links
    let output_article_links = response.data.items.map(search_result => search_result.link);

    return output_article_links;
}


const getArticleContents = async (article_links) => {
    /**
     * Extract contents of an article given its URL
     */
    // Retrieve article contents from webpage URLs
    const article_contents_responses = await axios.all(
        article_links.map(search_result => axios.get(search_result, { maxRedirects: 10 }).catch(error => console.log(`<!> ERROR: "${error.message}". Cannot get article at URL "${search_result.link}". <!>`)))
    );

    // Extract article contents as plaintext into object
    let fact_check_articles = [];

    for (const article of article_contents_responses) {
        // Skip erroneous article responses
        if (typeof article === 'undefined' || article.status !== 200) {
            continue;
        }

        // Extract content from article
        let article_contents;
        try {
            article_contents = extractor(article.data);
        } catch (error) {
            console.log(`<!> ERROR: "${error.message}". Cannot extract article at URL "${article.config.url}". <!>`);
            continue;
        }

        // Format article content into output data structure
        const article_info = {
            url: article.config.url,
            title: article_contents.title,
            date: article_contents.date,
            publisher: article_contents.publisher,
            lang: article_contents.lang,
            description: article_contents.description,
            text: article_contents.text
        };

        fact_check_articles.push(article_info);
    }

    return fact_check_articles;
}
