import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Integer, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.university import University  # noqa: F401  (relationship target)


class User(Base):
    __tablename__ = "users"
    # Mirrors the indexes the migrations create, so `alembic check` and
    # autogenerate see no drift (and never propose dropping them).
    __table_args__ = (
        Index("ix_users_origin_country_code", "origin_country_code"),
        Index("ix_users_destination_country_code", "destination_country_code"),
        Index("ix_users_university_id", "university_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(200))
    origin_country_code: Mapped[str | None] = mapped_column(
        String(10), ForeignKey("countries.code"), nullable=True
    )
    destination_country_code: Mapped[str | None] = mapped_column(
        String(10), ForeignKey("countries.code"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Onboarding profile (all nullable — populated post-signup, never required).
    stage: Mapped[str | None] = mapped_column(String(20))
    wants_to_work: Mapped[bool | None] = mapped_column(Boolean)
    wants_scholarships: Mapped[bool | None] = mapped_column(Boolean)
    concerns: Mapped[list | None] = mapped_column(JSON)
    first_month_priority: Mapped[str | None] = mapped_column(String(30))
    first_timer: Mapped[bool | None] = mapped_column(Boolean)
    confidence: Mapped[int | None] = mapped_column(Integer)
    # What the user most wants their plan to lead with:
    # deadlines / saving / prepared / smooth_landing.
    primary_goal: Mapped[str | None] = mapped_column(String(30))
    # The university the student picked in onboarding / profile. SET NULL so a
    # rankings refresh that drops a school never deletes the user.
    university_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("universities.id", ondelete="SET NULL"), nullable=True
    )

    origin_country: Mapped["Country | None"] = relationship(  # noqa: F821
        "Country", foreign_keys=[origin_country_code], back_populates="users_from"
    )
    destination_country: Mapped["Country | None"] = relationship(  # noqa: F821
        "Country", foreign_keys=[destination_country_code], back_populates="users_to"
    )
    university: Mapped["University | None"] = relationship("University")  # noqa: F821

    @property
    def university_name(self) -> str | None:
        return self.university.name if self.university is not None else None
