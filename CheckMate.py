import requests


class ClaimExtraction():
    def __init__(self):
        pass

    def run(self):
        claim = input("Enter your claim to be fact-checked: ")
        return claim


class GoogleFactCheck():
    def __init__(self):
        self.request_url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        self.request_params = {
            'key': "AIzaSyBK3by6GlJkmNMv9WIVdauhXjwyi9qyGKk",
            'languageCode': "en",
            'query': ""
        }

    def run(self, claim):
        self.request_params['query'] = claim

        response = requests.get(self.request_url, params=self.request_params)
        response_code = response.status_code

        if response_code == 200:
            response_json = response.json()

            if response_json == {}:
                print("No response from Google Fact Check")
                exit(0)

            print("\nGoogle Fact Check results:", end='\n\n')
            for idx, result in enumerate(response_json["claims"]):
                print(f" * Result #{idx + 1}:")
                print(f"     * Claim:")
                if 'text' in result.keys(): print(f"         * Title: {result['text']}")
                if 'claimDate' in result.keys(): print(f"         * Date: {result['claimDate']}")
                if 'claimant' in result.keys(): print(f"         * Source: {result['claimant']}")

                for review in result['claimReview']:
                    print(f"     * Review info:")
                    if 'title' in review.keys(): print(f"         * Title: {review['title']}")
                    if 'reviewDate' in review.keys(): print(f"         * Date: {review['reviewDate']}")
                    if 'publisher' in review.keys(): print(f"         * Source: {review['publisher']['name']} ({review['publisher']['site']})")
                    if 'textualRating' in review.keys(): print(f"         * Conclusion: {review['textualRating']}")
                    if 'url' in review.keys(): print(f"         * Full review: {review['url']}")
                    print()


if __name__ == '__main__':
    claim_extraction = ClaimExtraction()
    fact_checking = GoogleFactCheck()

    claim = claim_extraction.run()
    fact_checking.run(claim)
