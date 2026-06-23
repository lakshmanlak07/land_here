import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Boolean, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

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

    origin_country: Mapped["Country | None"] = relationship(  # noqa: F821
        "Country", foreign_keys=[origin_country_code], back_populates="users_from"
    )
    destination_country: Mapped["Country | None"] = relationship(  # noqa: F821
        "Country", foreign_keys=[destination_country_code], back_populates="users_to"
    )
