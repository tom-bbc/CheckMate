import requests
from datetime import datetime


class ClaimExtraction():
    def __init__(self):
        """
        ClaimBuster:
            * https://idir.uta.edu/claimbuster/
            * https://idir.uta.edu/claimbuster/api/
            * https://github.com/utaresearch/claimbuster-spotter.git
        """
        self.claimbuster_api = "https://idir.uta.edu/claimbuster/api/v2/score/text/sentences/"
        self.claimbuster_headers = {"x-api-key": "5b53715de78a4f0f9cce290a4144d444"}

    def user_input(self):
        claim = input("Enter your claim to be fact-checked: ")
        return claim

    def extract_claims(self, text: str):
        api_endpoint = self.claimbuster_api + text
        api_response = requests.get(url=api_endpoint, headers=self.claimbuster_headers)

        results = api_response.json()["results"]
        results = filter(lambda r: r['score'] > 0.5, results)
        results = sorted(results, key=lambda r: r['score'], reverse=True)
        claims = map(lambda r: r['text'], results)

        return claims


class GoogleFactCheck():
    def __init__(self):
        self.request_url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        self.request_params = {
            'key': "AIzaSyBK3by6GlJkmNMv9WIVdauhXjwyi9qyGKk",
            'languageCode': "en",
            'query': ""
        }

    def run(self, claims: list[str]):
        for claim in claims:
            print("\n--------------------------------------------------------------------------------\n")
            print(f"Input claim: {claim}", end='\n\n')
            self.request_params['query'] = claim

            response = requests.get(self.request_url, params=self.request_params)
            response_code = response.status_code

            if response_code == 200:
                response_json = response.json()

                if response_json == {}:
                    print("Error: empty response from Google Fact Check")
                    continue

                print("\nGoogle Fact Check results:", end='\n\n')
                for idx, result in enumerate(response_json["claims"]):
                    print(f" * Result #{idx + 1}:")
                    print(f"     * Claim:")
                    if 'text' in result.keys(): print(f"         * Title: {result['text']}")
                    if 'claimDate' in result.keys(): print(f"         * Date: {datetime.strptime(result['claimDate'], '%Y-%m-%dT%H:%M:%SZ').strftime('%d/%m/%Y')}")
                    if 'claimant' in result.keys(): print(f"         * Source: {result['claimant']}")

                    for review in result['claimReview']:
                        print(f"     * Review info:")
                        if 'title' in review.keys(): print(f"         * Title: {review['title']}")
                        if 'reviewDate' in review.keys(): print(f"         * Date: {datetime.strptime(review['reviewDate'], '%Y-%m-%dT%H:%M:%SZ').strftime('%d/%m/%Y')}")
                        if 'publisher' in review.keys(): print(f"         * Source: {review['publisher']['name']} ({review['publisher']['site']})")
                        if 'textualRating' in review.keys(): print(f"         * Conclusion: {review['textualRating']}")
                        if 'url' in review.keys(): print(f"         * Full review: {review['url']}")
            else:
                print(f"Error: {response_code} response from Google Fact Check")

            print("\n--------------------------------------------------------------------------------\n")

        print("\n--------------------------------------------------------------------------------\n")


if __name__ == '__main__':
    claim_extraction = ClaimExtraction()
    fact_checking = GoogleFactCheck()

    transcript = "What Gordon Brown isn't telling you is that he's putting up National Insurance contributions on every single job in 2011. The biggest cost schools have is teachers. So he's going to be taking money out of every single school in the country, primary school, secondary school, FE college. We say stop the waste in government now so we can stop the lion's share of that National Insurance increase and jobs tax next year. That's the best way to make sure we keep the money going into the school."
    claims = claim_extraction.extract_claims(transcript)

    # claims = [claim_extraction.user_input()]
    fact_checking.run(claims)
