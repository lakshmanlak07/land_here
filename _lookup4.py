import json, time, sys, os
sys.path.insert(0, r'C:\Users\laksh\land_here')
os.chdir(r'C:\Users\laksh\land_here')
from dotenv import load_dotenv; load_dotenv()
from urllib.parse import urlencode
from urllib.request import urlopen
from app.core.config import settings

def q(search, country='US', n=5):
    params = {'filter': f'country_code:{country}', 'search': search, 'per_page': n,
              'select': 'id,display_name,geo', 'api_key': settings.OPENALEX_API_KEY}
    url = 'https://api.openalex.org/institutions?' + urlencode(params)
    with urlopen(url, timeout=15) as r:
        data = json.loads(r.read())
    for h in data.get('results', []):
        geo = h.get('geo') or {}
        name = (h.get('display_name') or '').encode('ascii','replace').decode()
        print(f"  {h['id']}  {name}  region={geo.get('region')}")
    return data.get('results', [])

print('=== UH Manoa ==='); q('University of Hawaii Manoa'); time.sleep(0.2)
print('\n=== Rutgers Newark (try direct) ==='); q('Rutgers Newark'); time.sleep(0.2)
print('\n=== St Johns NY ==='); q('St. John University New York'); time.sleep(0.2)
print('\n=== Saint Josephs PA ==='); q('Saint Joseph University Philadelphia'); time.sleep(0.2)
print('\n=== UPR Rio Piedras ==='); q('University Puerto Rico Rio Piedras', 'PR'); time.sleep(0.2)
