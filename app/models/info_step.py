import uuid
from sqlalchemy import String, Integer, Boolean, Text, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

VALID_PHASES = (
    "before_applying",
    "after_acceptance",
    "visa_process",
    "before_departure",
    "after_arrival",
)


class InfoStep(Base):
    __tablename__ = "info_steps"
    # Mirrors the indexes the migrations create, so `alembic check` and
    # autogenerate see no drift (and never propose dropping them).
    __table_args__ = (
        Index("ix_info_steps_destination_code", "destination_code"),
        Index("ix_info_steps_origin_code", "origin_code"),
        Index("ix_info_steps_destination_phase_step", "destination_code", "phase", "step_number"),
        UniqueConstraint(
            "origin_code", "destination_code", "phase", "step_number",
            name="uq_info_steps_corridor_phase_step",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    origin_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    destination_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("countries.code"), nullable=False
    )
    phase: Mapped[str] = mapped_column(String(50), nullable=False)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    official_source_name: Mapped[str] = mapped_column(String(300), nullable=False)
    official_source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    destination_country: Mapped["Country"] = relationship(  # noqa: F821
        "Country", back_populates="info_steps"
    )
