import re
import json
import requests
from newspaper import Article


def gatherContextFromGoogle(claim):
    num_search_results = 5
    google_search_url = "https://www.googleapis.com/customsearch/v1"

    with open('credentials.json', 'r') as f:
        credentials = json.load(f)
        GOOGLE_SEARCH_API_KEY = credentials['google_search_api_key']
        SEARCH_ENGINE_ID = credentials['google_search_cx_id']

    params = {
        "num": num_search_results,
        "key": GOOGLE_SEARCH_API_KEY,
        "cx": SEARCH_ENGINE_ID,
        "q": claim
    }

    response = requests.get(google_search_url, params=params)
    response.raise_for_status()
    search_results_raw = response.json()

    fact_check_articles = []

    for search_result in search_results_raw["items"]:
        if search_result.get("fileFormat") is not None:
            continue

        article = Article(search_result["link"])
        article.download()
        article.parse()

        if article.publish_date is not None:
            article.publish_date = str(article.publish_date)

        article_text = re.sub(r'[^\x00-\x7F]+', '', article.text)
        article_text = article_text.replace('\n\n', '\n')

        article_data = {
            'url': search_result["link"],
            'title': article.title,
            'publish_date': article.publish_date,
            'text': article_text
        }
        fact_check_articles.append(article_data)

        print(json.dumps(fact_check_articles, indent=4))
        result = {
            'claim': claim,
            'context': fact_check_articles
        }

        return result

def factCheckFromContext():
    with open('credentials.json', 'r') as f:
        credentials = json.load(f)
        OPENAI_API_KEY = credentials['openai_api_key']

    return


if __name__ == '__main__':
    detected_claims = [
        "Every week, 300 of our citizens are killed by heroin alone, 90% of which floods across from our southern border.",
        "More Americans will die from drugs this year than were killed in the entire Vietnam war.",
        "Over the years, thousands of Americans have been brutally killed by those who illegally entered our country.",
        "In the last two years, ICE officers made 266,000 arrests of aliens with criminal records, including those charged or convicted of 100,000 assaults, 30,000 sex crimes, and 4,000 violent killings.",
        "The NHS went through the best part of two years where the NHS couldn't conduct all the treatments it normally would.",
        "The NHS was impacted by industrial action and if it wasn't for that, half a million appointments would have been set.",
        "We have now settled pay rises with everyone in the NHS except for the junior doctors.",
        "This year alone, 10,000 people have crossed on boats. That's a record number."
    ]

    claim = detected_claims[6]
    context_results = gatherContextFromGoogle(claim)

    # Could send these articles to OpenAI GPT to cross reference with the claim and fact-check
    # Prompt: "Extract the relevant subsection of text from the article written below that relates to the statement 'claim'. The statement may not be referenced within the text, or the text may not be relevant, in which case return 'inconclusive'."
