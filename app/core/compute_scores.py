"""
Compute LandHere Scores for universities that have:
  - match_confidence = 'high'
  - All five scoring metrics present (mean_citedness, works_count,
    median_earnings_10yr, tuition_out_of_state, completion_rate)

Affordability is scored on tuition_out_of_state (the full international /
out-of-state tuition our users actually pay), NOT avg_net_price (which is the
in-state, aided, domestic net price). avg_net_price is retained for display.

Percentile approach: each metric is ranked 0-100 across eligible schools,
then combined with the weights from ranking_config.SCORING_WEIGHTS.

  research_score  = weighted sub-score for research metrics (0-100)
  outcomes_score  = weighted sub-score for outcomes metrics (0-100)
  landhere_score  = full weighted composite (0-100, rounded to 1 dp)
  has_full_score  = True only when all metrics present

Schools that are high-confidence but lack any metric get their scores
cleared and has_full_score=False.

Run with:
    python -m app.core.compute_scores
"""

from app.core.database import SessionLocal
from app.core.ranking_config import SCORING_WEIGHTS
from app.models.university import University


def _percentile_ranks(values: list[float], invert: bool = False) -> list[float]:
    """Return 0-100 percentile rank for each entry (min-rank on ties).

    invert=True flips the ordering so that lower raw values → higher percentile
    (used for avg_net_price where cheaper is better).
    """
    n = len(values)
    if n <= 1:
        return [50.0] * n
    work = [-v for v in values] if invert else list(values)
    return [sum(1 for x in work if x < v) / (n - 1) * 100.0 for v in work]


def main() -> None:
    db = SessionLocal()
    try:
        unis = (
            db.query(University)
            .filter(
                University.country_code == 'US',
                University.match_confidence == 'high',
            )
            .all()
        )

        complete = [
            u for u in unis
            if u.mean_citedness is not None
            and u.works_count is not None
            and u.median_earnings_10yr is not None
            and u.tuition_out_of_state is not None
            and u.completion_rate is not None
        ]

        n = len(complete)
        print(f'High-confidence universities:          {len(unis)}')
        print(f'With all 5 metrics (scoreable):        {n}')

        if n == 0:
            print('No universities with complete data — nothing to score.')
            return

        # Compute percentile ranks for each metric
        pct_ri  = _percentile_ranks([u.mean_citedness          for u in complete])
        pct_ro  = _percentile_ranks([float(u.works_count)      for u in complete])
        pct_ear = _percentile_ranks([float(u.median_earnings_10yr) for u in complete])
        pct_aff = _percentile_ranks([float(u.tuition_out_of_state) for u in complete], invert=True)
        pct_grd = _percentile_ranks([u.completion_rate         for u in complete])

        w = SCORING_WEIGHTS
        research_weight_sum = w['research_impact'] + w['research_output']   # 0.50
        outcomes_weight_sum = w['earnings'] + w['affordability'] + w['graduation']  # 0.50

        for i, u in enumerate(complete):
            ri, ro, ear, aff, grd = pct_ri[i], pct_ro[i], pct_ear[i], pct_aff[i], pct_grd[i]

            u.research_score = round(
                (w['research_impact'] * ri + w['research_output'] * ro) / research_weight_sum,
                1,
            )
            u.outcomes_score = round(
                (w['earnings'] * ear + w['affordability'] * aff + w['graduation'] * grd)
                / outcomes_weight_sum,
                1,
            )
            u.landhere_score = round(
                w['research_impact'] * ri
                + w['research_output'] * ro
                + w['earnings'] * ear
                + w['affordability'] * aff
                + w['graduation'] * grd,
                1,
            )
            u.has_full_score = True

        # Clear scores for high-confidence schools that lack complete data
        complete_ids = {u.id for u in complete}
        cleared = 0
        for u in unis:
            if u.id not in complete_ids:
                u.research_score = None
                u.outcomes_score = None
                u.landhere_score = None
                u.has_full_score = False
                cleared += 1

        db.commit()
        print(f'Scored:                                {n}')
        print(f'High but incomplete (scores cleared):  {cleared}')

        ranked = sorted(complete, key=lambda u: u.landhere_score or 0.0, reverse=True)

        header = (f'{"Rank":<5} {"Name":<48} {"Score":>6} '
                  f'{"In-state Net":>13} {"Intl Tuition":>13} {"Earnings 10yr":>14}')
        print(f'\n{header}')
        print('=' * len(header))
        print('TOP 25')
        print('-' * len(header))

        def _row(rank, u):
            net  = f'${u.avg_net_price:,}'        if u.avg_net_price        else 'n/a'
            intl = f'${u.tuition_out_of_state:,}' if u.tuition_out_of_state else 'n/a'
            earn = f'${u.median_earnings_10yr:,}' if u.median_earnings_10yr else 'n/a'
            print(f'{rank:<5} {(u.name or "")[:48]:<48} {u.landhere_score or 0:>6.1f} '
                  f'{net:>13} {intl:>13} {earn:>14}')

        for rank, u in enumerate(ranked[:25], 1):
            _row(rank, u)

        print(f'\nBOTTOM 5')
        print('-' * len(header))
        for rank, u in enumerate(ranked[max(0, n - 5):], max(1, n - 4)):
            _row(rank, u)

    finally:
        db.close()


if __name__ == '__main__':
    main()
