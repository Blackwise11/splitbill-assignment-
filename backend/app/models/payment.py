"""Repayment ORM model used by the optional settlement extension."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.group import Group
from app.models.user import User


class Payment(Base):
    """An immutable transfer from one group member to another."""

    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint(
            "group_id",
            "idempotency_key",
            name="uq_payments_group_idempotency_key",
        ),
        CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
        CheckConstraint("from_user <> to_user", name="ck_payments_distinct_users"),
        Index("ix_payments_group_id_created_at", "group_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    from_user: Mapped[str] = mapped_column(
        ForeignKey("users.username", ondelete="RESTRICT"), nullable=False
    )
    to_user: Mapped[str] = mapped_column(
        ForeignKey("users.username", ondelete="RESTRICT"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    group: Mapped[Group] = relationship(back_populates="payments")
    payer: Mapped[User] = relationship(foreign_keys=[from_user])
    recipient: Mapped[User] = relationship(foreign_keys=[to_user])
