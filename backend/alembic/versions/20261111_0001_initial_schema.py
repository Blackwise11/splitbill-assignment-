"""initial schema

Revision ID: 20261111_0001
Revises:
Create Date: 2026-11-11 00:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261111_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("username"),
    )

    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "group_members",
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["username"], ["users.username"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("group_id", "username"),
    )

    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("paid_by", sa.String(length=50), nullable=False),
        sa.Column("split_type", sa.String(length=16), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
        sa.CheckConstraint("split_type IN ('equal', 'exact')", name="ck_expenses_split_type"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["paid_by"], ["users.username"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "group_id", "idempotency_key", name="uq_expenses_group_idempotency_key"
        ),
    )
    op.create_index("ix_expenses_group_id_created_at", "expenses", ["group_id", "created_at"])
    op.create_index("ix_expenses_group_id_is_deleted", "expenses", ["group_id", "is_deleted"])

    op.create_table(
        "expense_shares",
        sa.Column("expense_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.CheckConstraint("amount >= 0", name="ck_expense_shares_amount_non_negative"),
        sa.ForeignKeyConstraint(["expense_id"], ["expenses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["username"], ["users.username"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("expense_id", "username"),
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("from_user", sa.String(length=50), nullable=False),
        sa.Column("to_user", sa.String(length=50), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("note", sa.String(length=200), nullable=True),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
        sa.CheckConstraint("from_user <> to_user", name="ck_payments_distinct_users"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["from_user"], ["users.username"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["to_user"], ["users.username"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "group_id", "idempotency_key", name="uq_payments_group_idempotency_key"
        ),
    )
    op.create_index("ix_payments_group_id_created_at", "payments", ["group_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_payments_group_id_created_at", table_name="payments")
    op.drop_table("payments")
    op.drop_table("expense_shares")
    op.drop_index("ix_expenses_group_id_is_deleted", table_name="expenses")
    op.drop_index("ix_expenses_group_id_created_at", table_name="expenses")
    op.drop_table("expenses")
    op.drop_table("group_members")
    op.drop_table("groups")
    op.drop_table("users")
