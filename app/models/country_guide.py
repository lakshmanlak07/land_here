import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

VALID_SECTIONS = (
    "banking",
    "healthcare",
    "working",
    "cost_of_living",
    "culture",
    "transport",
    "sim_phone",
)


class CountryGuide(Base):
    __tablename__ = "country_guides"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    country_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("countries.code"), nullable=False
    )
    section: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    official_source_url: Mapped[str | None] = mapped_column(String(500))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    country: Mapped["Country"] = relationship(  # noqa: F821
        "Country", back_populates="guides"
    )
