import uuid
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    student_visa_name: Mapped[str | None] = mapped_column(String(200))
    official_immigration_url: Mapped[str | None] = mapped_column(String(500))
    currency_code: Mapped[str | None] = mapped_column(String(10))
    is_destination: Mapped[bool] = mapped_column(Boolean, default=False)
    is_origin: Mapped[bool] = mapped_column(Boolean, default=False)

    users_from: Mapped[list["User"]] = relationship(  # noqa: F821
        "User", foreign_keys="User.origin_country_code", back_populates="origin_country"
    )
    users_to: Mapped[list["User"]] = relationship(  # noqa: F821
        "User", foreign_keys="User.destination_country_code", back_populates="destination_country"
    )
    info_steps: Mapped[list["InfoStep"]] = relationship(  # noqa: F821
        "InfoStep", back_populates="destination_country"
    )
    guides: Mapped[list["CountryGuide"]] = relationship(  # noqa: F821
        "CountryGuide", back_populates="country"
    )
