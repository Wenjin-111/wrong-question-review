from pydantic import BaseModel
from datetime import datetime


class QuestionCreate(BaseModel):
    subject_id: int
    question_type_id: int
    content: str  # HTML
    answer: str   # JSON string
    explanation: str | None = None
    source: str | None = None
    tag_ids: list[int] = []


class QuestionUpdate(BaseModel):
    subject_id: int | None = None
    question_type_id: int | None = None
    content: str | None = None
    answer: str | None = None
    explanation: str | None = None
    source: str | None = None
    tag_ids: list[int] | None = None


class QuestionOut(BaseModel):
    id: int
    code: str = ""
    subject_id: int
    question_type_id: int
    content: str
    content_plain: str | None = None
    answer: str
    explanation: str | None = None
    source: str | None = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    subject_name: str = ""
    subject_color: str = ""
    type_name: str = ""
    tag_ids: list[int] = []
    tag_names: list[str] = []
    total_attempts: int = 0
    correct_attempts: int = 0
    accuracy: float = 0.0

    model_config = {"from_attributes": True}


class QuestionListOut(BaseModel):
    items: list[QuestionOut]
    total: int
    page: int
    page_size: int


class BatchDeleteRequest(BaseModel):
    ids: list[int]


class BatchTagRequest(BaseModel):
    ids: list[int]
    tag_ids: list[int]
