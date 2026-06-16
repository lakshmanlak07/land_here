"""Get scorecard_ids for remaining schools."""
import sys, os
sys.path.insert(0, r'C:\Users\laksh\land_here')
os.chdir(r'C:\Users\laksh\land_here')
from dotenv import load_dotenv; load_dotenv()
from app.core.database import SessionLocal
from app.models.university import University

NAMES = [
    'University of Hawaii at Manoa',
    'North Carolina A & T State University',
    'Southern University and A & M College',
    'Alabama A & M University',
    'St. John\'s University-New York',
    'Saint Joseph\'s University - Philadelphia',
    'University at Albany',
    'University at Buffalo',
    'University of Puerto Rico-Mayaguez',
    'University of Puerto Rico-Rio Piedras',
    'Maryville University of Saint Louis',
    'The University of Tennessee-Knoxville',
    'The University of Tennessee-Chattanooga',
    'The University of Tennessee-Martin',
    'The University of Tampa',
    'The University of Arizona Global Campus',
    'The College of New Jersey',
    'Pennsylvania State University-World Campus',
]

db = SessionLocal()
for name in NAMES:
    u = db.query(University).filter(University.name == name).first()
    if u:
        print(f'{u.scorecard_id}  {u.state}  {name}')
    else:
        print(f'NOT_FOUND  --  {name}')
db.close()
