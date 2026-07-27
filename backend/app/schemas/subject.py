from pydantic import BaseModel


class QuestionTypeOut(BaseModel):
    id: int
    subject_id: int
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class SubjectOut(BaseModel):
    id: int
    name: str
    color: str
    sort_order: int
    question_count: int = 0
    question_types: list[QuestionTypeOut] = []

    model_config = {"from_attributes": True}


class SubjectCreate(BaseModel):
    name: str
    color: str = "#007AFF"


class SubjectUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class QuestionTypeCreate(BaseModel):
    name: str


class QuestionTypeUpdate(BaseModel):
    name: str | None = None
