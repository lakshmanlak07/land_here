"""Targeted lookup for UT Austin and UT Arlington."""
import json, time
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import HTTPError

BASE   = "https://api.openalex.org/institutions"
MAILTO = "lakshmanlak07@gmail.com"

TARGETS = [
    ("228778", "The University of Texas at Austin",    "University of Texas at Austin"),
    ("228769", "The University of Texas at Arlington", "University of Texas at Arlington"),
    ("186399", "Rutgers University-Newark",            "Rutgers Newark"),
    ("243221", "University of Puerto Rico-Rio Piedras","Universidad de Puerto Rico Rio Piedras"),
]


def search(query, timeout=60):
    params = {
        "search": query,
        "filter": "country_code:US",
        "per_page": 3,
        "select": "id,display_name,geo",
        "mailto": MAILTO,
    }
    url = f"{BASE}?{urlencode(params)}"
    try:
        with urlopen(url, timeout=timeout) as r:
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
    for attempt in range(3):
        results = search(query, timeout=60)
        if results:
            for h in results:
                geo = h.get("geo") or {}
                print(f"  {h['id']}  |  {h['display_name']}  |  region={geo.get('region')}")
            break
        print(f"  attempt {attempt+1} failed, waiting 5s...")
        time.sleep(5)
    else:
        print("  gave up")
    time.sleep(3)
