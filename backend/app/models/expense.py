"""Immutable expense and per-member share ORM models."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.group import Group
from app.models.user import User


class Expense(Base):
    """An immutable expense; deletion is a soft-delete tombstone."""

    __tablename__ = "expenses"
    __table_args__ = (
        UniqueConstraint(
            "group_id",
            "idempotency_key",
            name="uq_expenses_group_idempotency_key",
        ),
        CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
        CheckConstraint("split_type IN ('equal', 'exact')", name="ck_expenses_split_type"),
        Index("ix_expenses_group_id_created_at", "group_id", "created_at"),
        Index("ix_expenses_group_id_is_deleted", "group_id", "is_deleted"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_by: Mapped[str] = mapped_column(
        ForeignKey("users.username", ondelete="RESTRICT"), nullable=False
    )
    split_type: Mapped[str] = mapped_column(String(16), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    group: Mapped[Group] = relationship(back_populates="expenses")
    payer: Mapped[User] = relationship(back_populates="expenses_paid", foreign_keys=[paid_by])
    shares: Mapped[list["ExpenseShare"]] = relationship(
        back_populates="expense",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ExpenseShare.username",
    )


class ExpenseShare(Base):
    """Exact satang obligation of one member for one expense."""

    __tablename__ = "expense_shares"
    __table_args__ = (CheckConstraint("amount >= 0", name="ck_expense_shares_amount_non_negative"),)

    expense_id: Mapped[int] = mapped_column(
        ForeignKey("expenses.id", ondelete="CASCADE"), primary_key=True
    )
    username: Mapped[str] = mapped_column(
        ForeignKey("users.username", ondelete="RESTRICT"), primary_key=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    expense: Mapped[Expense] = relationship(back_populates="shares")
    user: Mapped[User] = relationship()
