"""Schema-level guarantees that PostgreSQL stores money as NUMERIC(12,2)."""

from app.models import Expense, ExpenseShare, Payment
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable


def test_money_columns_compile_to_numeric_12_2_on_postgresql() -> None:
    for model in (Expense, ExpenseShare, Payment):
        ddl = str(CreateTable(model.__table__).compile(dialect=postgresql.dialect()))
        assert "NUMERIC(12, 2)" in ddl
