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
        self.checkworthiness_threshold = 0.5

    def user_input(self):
        claim = input("Enter your claim to be fact-checked: ")
        return claim

    def extract_claims(self, text: str):
        for terminal in ['?', '!', ';', ':']:
            text = text.replace(f'{terminal} ', '. ')

        sentences = text.split('. ')
        sentences = [sentences[idx:idx + 3] for idx in range(0, len(sentences), 3)]
        claims = []

        for sentence_block in sentences:
            sentence = ". ".join([s.strip() for s in sentence_block])
            api_endpoint = self.claimbuster_api + sentence

            api_response = requests.get(url=api_endpoint, headers=self.claimbuster_headers)
            api_response = api_response.json()
            results = api_response["results"]

            for result in results:
                if result["score"] > self.checkworthiness_threshold:
                    claims.append(result["text"])

        return claims

    @staticmethod
    def format_claims(claims, context=''):
        # context = "In the UK, "

        if type(claims[0]) == dict and 'Claim' in claims[0].keys() and 'Speaker' in claims[0].keys():
            claim_formatting = lambda claim: claim['Claim'].replace("I ", f"{claim['Speaker']} ").replace("I'm", f"{claim['Speaker']} is")
            claims = [
                {'claim': claim_formatting(claim), 'tags': [claim['Speaker']]}
                for claim in claims
            ]

        elif type(claims[0]) == str:
            claims = [
                {'claim': claim, 'tags': []}
                for claim in claims
            ]

        return claims


class GoogleFactCheck():
    def __init__(self, google_fact_check_api_key:str):
        self.request_url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        self.request_params = {
            'key': google_fact_check_api_key,
            'languageCode': "en",
            'query': ""
        }

    def fact_check_claim(self, claim:str):
        self.request_params['query'] = claim

        response = requests.get(self.request_url, params=self.request_params)
        response_code = response.status_code

        if response_code == 200:
            response = response.json()

        return response_code, response

    def fact_check_tags(self):
        pass

    def write_out_fact_check(self, claim_request:str, fact_check_response:dict, outfile:str="fact_checking_output.txt"):
        with open(outfile, 'a') as f:
            f.write("\n--------------------------------------------------------------------------------\n\n")
            f.write(f"Input claim: {claim_request}\n")
            f.write("\nGoogle Fact Check results:\n")

            for idx, result in enumerate(fact_check_response['claims']):
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

        return True

    def run(self, claims: list[dict]):
        with open("fact_checking_output.txt", 'w') as f:
            f.write("")

        for claim_data in claims:
            claim = claim_data['claim']

            # Call Google Fact Check API to conduct fact checking
            response_code, response = self.fact_check_claim(claim)

            # Error checking
            if response_code != 200:
                print(f"Error: {response_code} response from Google Fact Check \n")
                continue

            elif response == {}:
                with open("fact_checking_output.txt", 'a') as f:
                    f.write("\n--------------------------------------------------------------------------------\n\n")
                    f.write(f"Input claim: {claim}\n")
                    f.write("Error: No results found by Google Fact Check\n")
                continue

            # Output located fact checks to file
            self.write_out_fact_check(claim, response)

        return True


if __name__ == '__main__':
    with open('credentials.json', 'r') as f:
        credentials = json.load(f)
        claimbuster_api_key = credentials['claimbuster_api_key']
        google_fact_check_api_key = credentials['google_fact_check_api_key']

    claim_extraction = ClaimExtraction(claimbuster_api_key)
    fact_checking = GoogleFactCheck(google_fact_check_api_key)

    transcript_file = 'test-data/trump_transcript.txt'
    with open(transcript_file, 'r') as file:
        transcript = file.read()

    claims = claim_extraction.extract_claims(transcript)

    # claims_file = 'test-data/2010_debate_claims_gpt4.json'
    # with open(claims_file, 'r') as file:
    #     claims = json.load(file)

    claims = claim_extraction.format_claims(claims)

    fact_checking.run(claims)
