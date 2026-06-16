"""Temp script — verify OpenAlex IDs for marquee schools."""
import json, time, sys, os
sys.path.insert(0, r'C:\Users\laksh\land_here')
os.chdir(r'C:\Users\laksh\land_here')
from dotenv import load_dotenv; load_dotenv()
from urllib.parse import urlencode
from urllib.request import urlopen
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.university import University

STATE_NAME = {
    'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California',
    'CO':'Colorado','CT':'Connecticut','DE':'Delaware','FL':'Florida','GA':'Georgia',
    'HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa','KS':'Kansas',
    'KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts',
    'MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana',
    'NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico',
    'NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma',
    'OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina',
    'SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont',
    'VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming',
    'DC':'District of Columbia','PR':'Puerto Rico',
}

LOOKUPS = [
    ('University of Michigan-Ann Arbor',                     'University of Michigan',                    'MI'),
    ('Pennsylvania State University-Main Campus',            'Pennsylvania State University',              'PA'),
    ('Ohio State University-Main Campus',                    'Ohio State University',                      'OH'),
    ('Purdue University-Main Campus',                        'Purdue University',                          'IN'),
    ('University of Virginia-Main Campus',                   'University of Virginia',                     'VA'),
    ('Columbia University in the City of New York',          'Columbia University',                        'NY'),
    ('Rutgers University-New Brunswick',                     'Rutgers University',                         'NJ'),
    ('Colorado State University-Fort Collins',               'Colorado State University',                  'CO'),
    ('North Carolina State University at Raleigh',           'North Carolina State University',            'NC'),
    ('University of New Hampshire-Main Campus',              'University of New Hampshire',                'NH'),
    ('Arizona State University Campus Immersion',            'Arizona State University',                   'AZ'),
    ('Arizona State University Digital Immersion',           'Arizona State University',                   'AZ'),
    ('University of Florida-Online',                         'University of Florida',                      'FL'),
    ('The University of Alabama',                            'University of Alabama',                      'AL'),
    ('The University of Montana',                            'University of Montana',                      'MT'),
    ('CUNY Bernard M Baruch College',                        'Baruch College',                             'NY'),
    ('CUNY Brooklyn College',                                'Brooklyn College',                           'NY'),
    ('CUNY City College',                                    'City College of New York',                   'NY'),
    ('CUNY Hunter College',                                  'Hunter College',                             'NY'),
    ('CUNY John Jay College of Criminal Justice',            'John Jay College of Criminal Justice',       'NY'),
    ('CUNY Lehman College',                                  'Lehman College',                             'NY'),
    ('CUNY New York City College of Technology',             'New York City College of Technology',        'NY'),
    ('CUNY York College',                                    'York College',                               'NY'),
    ('College of Staten Island CUNY',                        'College of Staten Island',                   'NY'),
    ('Texas A&M University-College Station',                 'Texas A&M University',                       'TX'),
    ('University of Minnesota-Twin Cities',                  'University of Minnesota',                    'MN'),
    ('University of Missouri-Columbia',                      'University of Missouri',                     'MO'),
    ('University of South Carolina-Columbia',                'University of South Carolina',               'SC'),
    ('University of Oklahoma-Norman Campus',                 'University of Oklahoma',                     'OK'),
    ('University of Pittsburgh-Pittsburgh Campus',           'University of Pittsburgh',                   'PA'),
    ('University of Washington-Seattle Campus',              'University of Washington',                   'WA'),
    ('University of Washington-Bothell Campus',              'University of Washington Bothell',           'WA'),
    ('University of Washington-Tacoma Campus',               'University of Washington Tacoma',            'WA'),
    ('University of Colorado Denver/Anschutz Medical Campus','University of Colorado Denver',              'CO'),
    ('University of New Mexico-Main Campus',                 'University of New Mexico',                   'NM'),
    ('Rutgers University-Newark',                            'Rutgers University Newark',                  'NJ'),
    ('Tulane University of Louisiana',                       'Tulane University',                          'LA'),
    ('Miami University-Oxford',                              'Miami University',                           'OH'),
    ('North Dakota State University-Main Campus',            'North Dakota State University',              'ND'),
    ('Ohio University-Main Campus',                          'Ohio University',                            'OH'),
    ('Oklahoma State University-Main Campus',                'Oklahoma State University',                  'OK'),
    ('New Mexico State University-Main Campus',              'New Mexico State University',                'NM'),
    ('University of Akron Main Campus',                      'University of Akron',                        'OH'),
    ('University of Cincinnati-Main Campus',                 'University of Cincinnati',                   'OH'),
    ('Missouri State University-Springfield',                'Missouri State University',                  'MO'),
    ('Bowling Green State University-Main Campus',           'Bowling Green State University',             'OH'),
    ('Wright State University-Main Campus',                  'Wright State University',                    'OH'),
    ('Saint Cloud State University',                         'St. Cloud State University',                 'MN'),
    ('Georgia Institute of Technology-Main Campus',          'Georgia Institute of Technology',            'GA'),
    ('Virginia Polytechnic Institute and State University',  'Virginia Tech',                              'VA'),
    ('University of Hawaii at Manoa',                        'University of Hawaii at Manoa',              'HI'),
    ('North Carolina A & T State University',                'North Carolina A&T State University',       'NC'),
    ('Southern University and A & M College',                'Southern University and A&M College',       'LA'),
    ('Alabama A & M University',                             'Alabama A&M University',                    'AL'),
    ('St. John\'s University-New York',                      'St. John\'s University',                    'NY'),
    ('Saint Joseph\'s University - Philadelphia',            'Saint Joseph\'s University',                'PA'),
    ('University at Albany',                                 'University at Albany',                      'NY'),
    ('University at Buffalo',                                'University at Buffalo',                     'NY'),
    ('University of Puerto Rico-Mayaguez',                   'University of Puerto Rico Mayaguez',        'PR'),
    ('University of Puerto Rico-Rio Piedras',                'University of Puerto Rico Rio Piedras',     'PR'),
    ('Maryville University of Saint Louis',                  'Maryville University',                      'MO'),
    ('The University of Tennessee-Knoxville',                'University of Tennessee',                   'TN'),
    ('The University of Tennessee-Chattanooga',              'University of Tennessee at Chattanooga',    'TN'),
    ('The University of Tennessee-Martin',                   'University of Tennessee at Martin',         'TN'),
    ('The University of Tampa',                              'University of Tampa',                       'FL'),
    ('The University of Arizona Global Campus',              'University of Arizona',                     'AZ'),
    ('The College of New Jersey',                            'College of New Jersey',                     'NJ'),
]


def search_openalex(search_name, state_abbrev):
    state_full = STATE_NAME.get(state_abbrev, '')
    params = {
        'filter': 'country_code:US',
        'search': search_name,
        'per_page': 5,
        'select': 'id,display_name,geo',
        'api_key': settings.OPENALEX_API_KEY,
    }
    url = 'https://api.openalex.org/institutions?' + urlencode(params)
    try:
        with urlopen(url, timeout=15) as r:
            data = json.loads(r.read())
        results = data.get('results', [])
        for hit in results:
            geo = hit.get('geo') or {}
            region = (geo.get('region') or '').strip()
            state_ok = not state_full or not region or state_full.lower() == region.lower()
            if state_ok:
                return hit
        # If no state match, return top result with a warning
        if results:
            return ('NO_STATE_MATCH', results[0])
        return None
    except Exception as e:
        print(f'  ERROR searching {search_name}: {e}')
        return None


db = SessionLocal()
overrides = {}
no_match = []
state_mismatch = []

print('=' * 120)
print(f'{"scorecard_id":<12} | {"scorecard_name":<50} | {"openalex_id":<35} | {"openalex_name":<35} | region')
print('=' * 120)

for sc_name, oa_search, state in LOOKUPS:
    u = db.query(University).filter(University.name == sc_name).first()
    if not u:
        print(f'NOT IN DB: {sc_name}')
        time.sleep(0.15)
        continue
    result = search_openalex(oa_search, state)
    time.sleep(0.15)
    if result is None:
        print(f'{u.scorecard_id:<12} | {sc_name[:50]:<50} | NO MATCH FOUND')
        no_match.append(sc_name)
    elif isinstance(result, tuple) and result[0] == 'NO_STATE_MATCH':
        hit = result[1]
        geo = hit.get('geo') or {}
        region = geo.get('region', '?')
        print(f'{u.scorecard_id:<12} | {sc_name[:50]:<50} | {hit["id"]:<35} | {hit["display_name"][:35]:<35} | STATE MISMATCH region={region}')
        state_mismatch.append((sc_name, hit))
    else:
        hit = result
        geo = hit.get('geo') or {}
        region = geo.get('region', 'null')
        overrides[u.scorecard_id] = hit['id']
        print(f'{u.scorecard_id:<12} | {sc_name[:50]:<50} | {hit["id"]:<35} | {hit["display_name"][:35]:<35} | {region}')

db.close()

print()
print('=== NO MATCH ===')
for n in no_match:
    print(f'  {n}')
print()
print('=== STATE MISMATCH (review manually) ===')
for n, h in state_mismatch:
    print(f'  {n} -> {h["id"]} {h["display_name"]}')
print()
print('=== VERIFIED OVERRIDES DICT (paste into institution_overrides.py) ===')
for k, v in overrides.items():
    print(f'    "{k}": "{v}",')
