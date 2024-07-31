const axios = require('axios');
const extractor = require('unfluff');

const credentials = require('./credentials.json');

async function gatherContextFromGoogle(claim) {
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

        const article_data = {
            url: search_result.link,
            title: article_contents.title,
            date: article_contents.date,
            publisher: article_contents.publisher,
            author: article_contents.author,
            lang: article_contents.lang,
            text: article_contents.text
        };

        fact_check_articles.push(article_data);
    }

    console.log(fact_check_articles);
    const result = {
        claim: claim,
        context: fact_check_articles
    };

    return result;
}


const detected_claims = [
    "Every week, 300 of our citizens are killed by heroin alone, 90% of which floods across from our southern border.",
    "More Americans will die from drugs this year than were killed in the entire Vietnam war.",
    "Over the years, thousands of Americans have been brutally killed by those who illegally entered our country.",
    "In the last two years, ICE officers made 266,000 arrests of aliens with criminal records, including those charged or convicted of 100,000 assaults, 30,000 sex crimes, and 4,000 violent killings.",
    "The NHS went through the best part of two years where the NHS couldn't conduct all the treatments it normally would.",
    "The NHS was impacted by industrial action and if it wasn't for that, half a million appointments would have been set.",
    "We have now settled pay rises with everyone in the NHS except for the junior doctors.",
    "This year alone, 10,000 people have crossed on boats. That's a record number."
];

let claim = detected_claims[6];
gatherContextFromGoogle(claim);
