import requests
import json


class Transcription():
    def __init__(self):
        pass


class ClaimExtraction():
    def __init__(self):
        pass


class GoogleFactCheck():
    def __init__(self):
        self.request_url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        self.request_params = {
            'key': "AIzaSyBK3by6GlJkmNMv9WIVdauhXjwyi9qyGKk",
            'languageCode': "en",
            'query': ""
        }

    def run(self):
        claim = input("Enter your claim to be fact-checked: ")
        self.request_params['query'] = claim

        response = requests.get(self.request_url, params=self.request_params)
        response_code = response.status_code

        if response_code == 200:
            response_json = response.json()

            if response_json == {}:
                print("No response from Google Fact Check")
                exit(0)

            for claim in response_json["claims"]:
                print(json.dumps(claim, indent=4), end='\n\n')


class CheckMate():
    def __init__(self):
        pass


if __name__ == '__main__':
    check_mate = GoogleFactCheck()
    check_mate.run()
