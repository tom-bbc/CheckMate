# CheckMate
JournalismAI 2024 project.

## ClaimsKG Extractor

### Install

* Add following to top of `claim_extractor/extractors/__init__.py`:
  * `import collections`
  * `collections.Callable = collections.abc.Callable`
* Add below imports of `claim_extractor/extractors/fullfact.py`:
  * `nltk.download('stopwords')`
  * `nltk.download('punkt')`
  * `nltk.download('averaged_perceptron_tagger')`
  * `nltk.download('wordnet')`
* Add try-excepts in `claim_extractor/extractors/politifact.py`:
  * `except AttributeError` for both `claim.set_claim` (line 73) and `claim.set_title` (line 77)
* Requirements:
  * `pip install -r requirements.txt`
  * `pip install lxml_html_clean`
  * `pip install nltk`
* Install & build Redis database:
  * `brew install redis`
  * `redis-server`


### Run

* `python Exporter.py --website fullfact,politifact,checkyourfact,eufactcheck --maxclaims 10`
