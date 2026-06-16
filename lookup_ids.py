"""One-shot: look up OpenAlex IDs for the remaining 'none' schools via anonymous polite pool."""
import json, time
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import HTTPError

BASE = "https://api.openalex.org/institutions"
MAILTO = "lakshmanlak07@gmail.com"

TARGETS = [
    # (scorecard_id, db_name, search_query)
    ("228778", "The University of Texas at Austin",     "University of Texas at Austin"),
    ("228769", "The University of Texas at Arlington",  "University of Texas at Arlington"),
    ("228787", "The University of Texas at Dallas",     "University of Texas at Dallas"),
    ("228796", "The University of Texas at El Paso",    "University of Texas at El Paso"),
    ("229027", "The University of Texas at San Antonio","University of Texas at San Antonio"),
    ("228802", "The University of Texas at Tyler",      "University of Texas at Tyler"),
    ("160658", "University of Louisiana at Lafayette",  "University of Louisiana at Lafayette"),
    ("159993", "University of Louisiana at Monroe",     "University of Louisiana at Monroe"),
    ("186399", "Rutgers University-Newark",             "Rutgers Newark"),
    ("163204", "University of Maryland Global Campus",  "University of Maryland Global Campus"),
    ("140447", "Mercer University",                     "Mercer University"),
    ("186201", "Ramapo College of New Jersey",          "Ramapo College"),
    ("482158", "Middle Georgia State University",       "Middle Georgia State"),
    ("196680", "Excelsior University",                  "Excelsior University"),
    ("243221", "University of Puerto Rico-Rio Piedras", "University of Puerto Rico Rio Piedras"),
]


def search(query):
    params = {
        "search": query,
        "filter": "country_code:US",
        "per_page": 3,
        "select": "id,display_name,geo",
        "mailto": MAILTO,
    }
    url = f"{BASE}?{urlencode(params)}"
    try:
        with urlopen(url, timeout=20) as r:
            data = json.loads(r.read())
        return data.get("results", [])
    except HTTPError as e:
        print(f"  HTTP {e.code}")
        return []
    except Exception as e:
        print(f"  Error: {e}")
        return []


for sc_id, name, query in TARGETS:
    print(f"\n[{sc_id}] {name}")
    results = search(query)
    for h in results:
        geo = h.get("geo") or {}
        print(f"  {h['id']}  |  {h['display_name']}  |  region={geo.get('region')}")
    time.sleep(1.5)
