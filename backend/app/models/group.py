"""Group and membership ORM models."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.user import User


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    memberships: Mapped[list["GroupMember"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="GroupMember.username",
    )
    expenses: Mapped[list["Expense"]] = relationship(  # noqa: F821
        back_populates="group",
        cascade="all, delete-orphan",
    )
    payments: Mapped[list["Payment"]] = relationship(  # noqa: F821
        back_populates="group",
        cascade="all, delete-orphan",
    )

    @property
    def member_usernames(self) -> list[str]:
        """Members in deterministic ascending username order."""
        return [membership.username for membership in self.memberships]


class GroupMember(Base):
    __tablename__ = "group_members"

    group_id: Mapped[int] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True
    )
    username: Mapped[str] = mapped_column(
        ForeignKey("users.username", ondelete="CASCADE"), primary_key=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    group: Mapped[Group] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(back_populates="memberships", lazy="joined")
