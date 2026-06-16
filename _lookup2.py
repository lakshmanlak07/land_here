"""Fix bad matches and recover missing lookups from the first run."""
import json, time, sys, os
sys.path.insert(0, r'C:\Users\laksh\land_here')
os.chdir(r'C:\Users\laksh\land_here')
from dotenv import load_dotenv; load_dotenv()
from urllib.parse import urlencode
from urllib.request import urlopen
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.university import University

def openalex(search, state_filter=None, per_page=8):
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
    hits = data.get('results', [])
    if state_filter:
        hits = [h for h in hits
                if ((h.get('geo') or {}).get('region') or '').lower() == (state_filter or '').lower()
                or not (h.get('geo') or {}).get('region')]
    for h in hits:
        geo = h.get('geo') or {}
        name = h.get('display_name','').encode('ascii','replace').decode()
        print(f"  {h['id']}  {name}  region={geo.get('region')}")
    return hits

db = SessionLocal()

# --- 1. University of Alabama (Tuscaloosa, NOT UAB) ---
print('\n=== University of Alabama (need Tuscaloosa, not Birmingham) ===')
hits = openalex('University of Alabama Tuscaloosa', 'Alabama')
time.sleep(0.2)

# --- 2. CUNY York College ---
print('\n=== CUNY York College ===')
hits2 = openalex('York College City University New York', 'New York')
time.sleep(0.2)

# --- 3. Rutgers University-Newark ---
print('\n=== Rutgers Newark ===')
hits3 = openalex('Rutgers University Newark', 'New Jersey')
time.sleep(0.2)

# --- 4. Schools after the crash (apostrophe issue) ---
print('\n=== St. Johns University New York ===')
hits4 = openalex("St Johns University New York")
time.sleep(0.2)

print('\n=== Saint Josephs University Philadelphia ===')
hits5 = openalex("Saint Josephs University Philadelphia")
time.sleep(0.2)

print('\n=== University at Albany ===')
hits6 = openalex("University at Albany", 'New York')
time.sleep(0.2)

print('\n=== University at Buffalo ===')
hits7 = openalex("University at Buffalo", 'New York')
time.sleep(0.2)

print('\n=== University of Puerto Rico Mayaguez ===')
hits8 = openalex("University of Puerto Rico Mayaguez")
time.sleep(0.2)

print('\n=== University of Puerto Rico Rio Piedras ===')
hits9 = openalex("University of Puerto Rico Rio Piedras")
time.sleep(0.2)

print('\n=== Maryville University ===')
hits10 = openalex("Maryville University", 'Missouri')
time.sleep(0.2)

print('\n=== University of Tennessee Knoxville ===')
hits11 = openalex("University of Tennessee Knoxville", 'Tennessee')
time.sleep(0.2)

print('\n=== University of Tennessee Chattanooga ===')
hits12 = openalex("University of Tennessee Chattanooga")
time.sleep(0.2)

print('\n=== University of Tennessee Martin ===')
hits13 = openalex("University of Tennessee Martin")
time.sleep(0.2)

print('\n=== University of Tampa ===')
hits14 = openalex("University of Tampa", 'Florida')
time.sleep(0.2)

print('\n=== University of Arizona (for Global Campus) ===')
hits15 = openalex("University of Arizona", 'Arizona')
time.sleep(0.2)

print('\n=== College of New Jersey ===')
hits16 = openalex("College of New Jersey", 'New Jersey')
time.sleep(0.2)

print('\n=== North Carolina A&T State University ===')
hits17 = openalex("North Carolina Agricultural Technical State University", 'North Carolina')
time.sleep(0.2)

print('\n=== Southern University A&M ===')
hits18 = openalex("Southern University A&M College", 'Louisiana')
time.sleep(0.2)

print('\n=== Alabama A&M University ===')
hits19 = openalex("Alabama Agricultural Mechanical University", 'Alabama')
time.sleep(0.2)

print('\n=== Pennsylvania State University-World Campus (same as Penn State main?) ===')
u_wc = db.query(University).filter(University.name == 'Pennsylvania State University-World Campus').first()
if u_wc:
    print(f'  scorecard_id={u_wc.scorecard_id}, state={u_wc.state}')
time.sleep(0.2)

# Scorecard IDs for what we need to confirm
for name in ['The University of Alabama', 'CUNY York College']:
    u = db.query(University).filter(University.name == name).first()
    if u:
        print(f'\n{name} -> scorecard_id={u.scorecard_id}')

db.close()
