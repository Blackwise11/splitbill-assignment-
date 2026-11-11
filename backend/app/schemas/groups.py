"""Group request/response schemas."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Username = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50),
]


class StrictModel(BaseModel):
    """Reject unknown fields so typos never silently change semantics."""

    model_config = ConfigDict(extra="forbid")


class GroupOut(BaseModel):
    id: int
    name: str
    members: list[str]
    member_count: int = Field(ge=1)

    model_config = ConfigDict(from_attributes=True)
