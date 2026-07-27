from pydantic import BaseModel


class TagOut(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}


class TagCreate(BaseModel):
    name: str
    color: str = "#007AFF"


class TagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
