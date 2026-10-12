import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Integer, Float, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class University(Base):
    __tablename__ = "universities"
    # Mirrors the indexes the migrations create, so `alembic check` and
    # autogenerate see no drift (and never propose dropping them).
    __table_args__ = (
        Index("ix_universities_full_score_landhere", "has_full_score", "landhere_score"),
        Index("ix_universities_state", "state"),
        Index("ix_universities_tuition_out_of_state", "tuition_out_of_state"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    scorecard_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    openalex_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ror_id: Mapped[str | None] = mapped_column(String(50), nullable=True)

    name: Mapped[str] = mapped_column(String(500), nullable=False)
    country_code: Mapped[str] = mapped_column(String(10), nullable=False)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    official_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    avg_net_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tuition_out_of_state: Mapped[int | None] = mapped_column(Integer, nullable=True)
    median_earnings_10yr: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    median_debt: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Share of degree-seeking undergrads who are non-resident aliens
    # (Scorecard UGDS_NRA) — used as an international-student proxy. Fraction 0–1.
    intl_student_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    citations_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    works_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mean_citedness: Mapped[float | None] = mapped_column(Float, nullable=True)

    research_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    outcomes_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    landhere_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    has_full_score: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_refreshed: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    match_confidence: Mapped[str | None] = mapped_column(String(10), nullable=True)
