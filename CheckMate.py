import requests
import json
from datetime import datetime


class ClaimExtraction():
    def __init__(self, claimbuster_api_key):
        """
        ClaimBuster:
            * https://idir.uta.edu/claimbuster/
            * https://idir.uta.edu/claimbuster/api/
            * https://github.com/utaresearch/claimbuster-spotter.git
        """
        self.claimbuster_api = "https://idir.uta.edu/claimbuster/api/v2/score/text/sentences/"
        self.claimbuster_headers = {"x-api-key": claimbuster_api_key}

    def user_input(self):
        claim = input("Enter your claim to be fact-checked: ")
        return claim

    def extract_claims(self, text: str):
        api_endpoint = self.claimbuster_api + text
        api_response = requests.get(url=api_endpoint, headers=self.claimbuster_headers)

        results = api_response.json()["results"]
        results = filter(lambda r: r['score'] > 0.5, results)
        # results = sorted(results, key=lambda r: r['score'], reverse=True)
        claims = map(lambda r: r['text'], results)

        return claims


class GoogleFactCheck():
    def __init__(self, google_fact_check_api_key):
        self.request_url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        self.request_params = {
            'key': google_fact_check_api_key,
            'languageCode': "en",
            'query': ""
        }

    def run(self, claims: list[str]):
        with open("fact_checking_output.txt", 'w') as f:
            f.write("")

        for claim in claims:
            with open("fact_checking_output.txt", 'a') as f:
                f.write("\n--------------------------------------------------------------------------------\n\n")
                f.write(f"Input claim: {claim}\n")

            self.request_params['query'] = claim

            response = requests.get(self.request_url, params=self.request_params)
            response_code = response.status_code

            if response_code == 200:
                response_json = response.json()

                if response_json == {}:
                    with open("fact_checking_output.txt", 'a') as f:
                        f.write("Error: no results found by Google Fact Check\n")
                    continue

                with open("fact_checking_output.txt", 'a') as f:
                    f.write("\nGoogle Fact Check results:\n")

                    for idx, result in enumerate(response_json["claims"]):
                        f.write(f"\n * Result #{idx + 1}: \n")
                        f.write(f"     * Claim: \n")
                        if 'text' in result.keys(): f.write(f"         * Title: {result['text']} \n")
                        if 'claimDate' in result.keys(): f.write(f"         * Date: {datetime.strptime(result['claimDate'], '%Y-%m-%dT%H:%M:%SZ').strftime('%d/%m/%Y')} \n")
                        if 'claimant' in result.keys(): f.write(f"         * Source: {result['claimant']} \n")

                        for review in result['claimReview']:
                            f.write(f"     * Review info: \n")
                            if 'title' in review.keys(): f.write(f"         * Title: {review['title']} \n")
                            if 'reviewDate' in review.keys(): f.write(f"         * Date: {datetime.strptime(review['reviewDate'], '%Y-%m-%dT%H:%M:%SZ').strftime('%d/%m/%Y')} \n")
                            if 'publisher' in review.keys(): f.write(f"         * Source: {review['publisher']['name']} ({review['publisher']['site']}) \n")
                            if 'textualRating' in review.keys(): f.write(f"         * Conclusion: {review['textualRating']} \n")
                            if 'url' in review.keys(): f.write(f"         * Full review: {review['url']} \n")
            else:
                print(f"Error: {response_code} response from Google Fact Check \n")

            with open("fact_checking_output.txt", 'a') as f:
                f.write("\n--------------------------------------------------------------------------------\n")

        with open("fact_checking_output.txt", 'a') as f:
            f.write("\n--------------------------------------------------------------------------------\n\n")


if __name__ == '__main__':
    with open('credentials.json', 'r') as f:
        credentials = json.load(f)
        claimbuster_api_key = credentials['claimbuster_api_key']
        google_fact_check_api_key = credentials['google_fact_check_api_key']

    claim_extraction = ClaimExtraction(claimbuster_api_key)
    fact_checking = GoogleFactCheck(google_fact_check_api_key)

    transcript = "Our southern border is a pipeline for vast quantities of illegal drugs, including meth, heroin, cocaine, and fentanyl. Every week, 300 of our citizens are killed by heroin alone, 90% of which floods across from our southern border. More Americans will die from drugs this year than were killed in the entire Vietnam war. In the last two years, ICE officers made 266,000 arrests of aliens with criminal records, including those charged or convicted of 100,000 assaults, 30,000 sex crimes, and 4,000 violent killings. Over the years, thousands of Americans have been brutally killed by those who illegally entered our country, and thousands more lives will be lost if we don't act right now. This is a humanitarian crisis, a crisis of the heart and a crisis of the soul."

    claims = claim_extraction.extract_claims(transcript)

    fact_checking.run(claims)
