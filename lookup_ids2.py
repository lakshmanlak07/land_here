"""Retry timed-out lookups with longer timeout and bigger delays."""
import json, time
from urllib.parse import urlencode
from urllib.request import urlopen
from urllib.error import HTTPError

BASE   = "https://api.openalex.org/institutions"
MAILTO = "lakshmanlak07@gmail.com"

TARGETS = [
    ("228778", "The University of Texas at Austin",     "University of Texas at Austin"),
    ("228769", "The University of Texas at Arlington",  "University of Texas at Arlington"),
    ("229027", "The University of Texas at San Antonio","University of Texas at San Antonio"),
    ("228802", "The University of Texas at Tyler",      "University of Texas at Tyler"),
    ("160658", "University of Louisiana at Lafayette",  "University of Louisiana at Lafayette"),
    ("159993", "University of Louisiana at Monroe",     "University of Louisiana at Monroe"),
    ("196680", "Excelsior University",                  "Excelsior University"),
    ("186399", "Rutgers University-Newark",             "Rutgers University Newark"),
    ("243221", "University of Puerto Rico-Rio Piedras", "University of Puerto Rico Rio Piedras"),
    ("445027", "American InterContinental University",  "American InterContinental University"),
    ("483595", "Ana G. Mendez University",              "Ana G Mendez University"),
    ("476975", "Colorado State University Global",      "Colorado State University Global"),
    ("126827", "Colorado Technical University",         "Colorado Technical University"),
    ("177065", "Columbia College Missouri",             "Columbia College Columbia Missouri"),
    ("498562", "Commonwealth University of Pennsylvania","Commonwealth University Pennsylvania"),
    ("436429", "Los Angeles Film School",               "Los Angeles Film School"),
    ("444787", "Nightingale College",                   "Nightingale College"),
    ("498571", "Pennsylvania Western University",       "Pennsylvania Western University"),
    ("458919", "Strayer University",                    "Strayer University"),
    ("161572", "Unity Environmental University",        "Unity Environmental University"),
    ("243346", "Universidad Ana G. Mendez-Carolina",    "Ana G Mendez Carolina"),
    ("241739", "Universidad Ana G. Mendez-Cupey",       "Ana G Mendez Cupey"),
    ("243601", "Universidad Ana G. Mendez-Gurabo",      "Ana G Mendez Gurabo"),
    ("243443", "Universidad del Sagrado Corazon",       "Universidad del Sagrado Corazon"),
    ("262086", "University of Massachusetts Global",    "University of Massachusetts Global"),
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
        with urlopen(url, timeout=45) as r:
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
    if results:
        for h in results:
            geo = h.get("geo") or {}
            print(f"  {h['id']}  |  {h['display_name']}  |  region={geo.get('region')}")
    else:
        print("  (no results)")
    time.sleep(2)
