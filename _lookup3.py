"""Final targeted probes for remaining missing schools."""
import json, time, sys, os
sys.path.insert(0, r'C:\Users\laksh\land_here')
os.chdir(r'C:\Users\laksh\land_here')
from dotenv import load_dotenv; load_dotenv()
from urllib.parse import urlencode
from urllib.request import urlopen
from app.core.config import settings

def openalex(search, per_page=6):
    params = {
        'filter': 'country_code:US',
        'search': search,
        'per_page': per_page,
        'select': 'id,display_name,geo',
        'api_key': settings.OPENALEX_API_KEY,
    }
    url = 'https://api.openalex.org/institutions?' + urlencode(params)
    with urlopen(url, timeout=15) as r:
        data = json.loads(r.read())
    for h in data.get('results', []):
        geo = h.get('geo') or {}
        name = (h.get('display_name') or '').encode('ascii','replace').decode()
        print(f"  {h['id']}  {name:<50}  region={geo.get('region')}")
    return data.get('results', [])

# Alabama (Tuscaloosa) — UAB was wrong match
print('=== University of Alabama Tuscaloosa ===')
openalex('University of Alabama')
time.sleep(0.2)

# Rutgers Newark
print('\n=== Rutgers Newark ===')
openalex('Rutgers University Newark New Jersey')
time.sleep(0.2)

# St. Johns (no apostrophe in search)
print('\n=== St Johns University ===')
openalex('Saint Johns University New York')
time.sleep(0.2)

# Saint Josephs Philadelphia
print('\n=== Saint Josephs University ===')
openalex('Saint Josephs University Pennsylvania')
time.sleep(0.2)

# Puerto Rico
print('\n=== University Puerto Rico Mayaguez ===')
params = {
    'filter': 'country_code:PR',
    'search': 'Mayaguez',
    'per_page': 4,
    'select': 'id,display_name,geo',
    'api_key': settings.OPENALEX_API_KEY,
}
url = 'https://api.openalex.org/institutions?' + urlencode(params)
with urlopen(url, timeout=15) as r:
    d = json.loads(r.read())
for h in d.get('results', []):
    name = (h.get('display_name') or '').encode('ascii','replace').decode()
    print(f"  {h['id']}  {name}")
time.sleep(0.2)

print('\n=== University Puerto Rico Rio Piedras ===')
params['search'] = 'Rio Piedras'
url = 'https://api.openalex.org/institutions?' + urlencode(params)
with urlopen(url, timeout=15) as r:
    d = json.loads(r.read())
for h in d.get('results', []):
    name = (h.get('display_name') or '').encode('ascii','replace').decode()
    print(f"  {h['id']}  {name}")
time.sleep(0.2)

# Saint Cloud State (check it came through - might have unicode issue)
print('\n=== Saint Cloud State ===')
openalex('Saint Cloud State University Minnesota')
time.sleep(0.2)

# North Carolina A&T
print('\n=== NC A and T ===')
openalex('North Carolina A T State University')
time.sleep(0.2)
