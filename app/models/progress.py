import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StepProgress(Base):
    """One row per journey step a user has marked complete.

    Owned by exactly one user (composite primary key), deleted with the user or
    the step (ON DELETE CASCADE). Absence of a row means "not completed".
    """

    __tablename__ = "user_step_progress"
    __table_args__ = (Index("ix_user_step_progress_step_id", "step_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    step_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("info_steps.id", ondelete="CASCADE"), primary_key=True
    )
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
