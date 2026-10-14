# data/

## universities.json
The LandHere university rankings dataset: 500 U.S. four-year institutions, of
which 267 have a complete LandHere Score (`has_full_score: true`). Only scored
rows are shown in the app.

- Built by the ingest pipeline (`app/core/ingest_scorecard.py` ->
  `ingest_openalex.py` -> `compute_scores.py`); last refreshed 2026-06-22.
- Load into any database (idempotent upsert on `scorecard_id`):
  `python -m app.core.universities_dataset load`
- Regenerate after a fresh ingest: `python -m app.core.universities_dataset export`

### Sources and licences
- U.S. Department of Education, College Scorecard - U.S. government work, public domain.
  https://collegescorecard.ed.gov/data/
- OpenAlex (research metrics) - CC0. https://openalex.org/

The LandHere Score is LandHere's own calculation from these inputs; see the
in-app Methodology screen and `app/core/ranking_config.py`.
