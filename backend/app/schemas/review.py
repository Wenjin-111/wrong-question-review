from pydantic import BaseModel
from datetime import datetime


class CreateSessionRequest(BaseModel):
    review_mode: str = "free"
    subject_ids: list[int] = []
    type_ids: list[int] = []
    tag_ids: list[int] = []
    question_ids: list[int] = []
    min_accuracy: int = 0
    limit: int = 20
    order: str = "random"


class SubmitAnswerRequest(BaseModel):
    question_id: int
    user_answer: str
    is_correct: bool | None = None  # Only for self-evaluation (subjective)
    current_index: int = 0
    rating: int | None = None  # FSRS rating 1-4 (Again/Hard/Good/Easy)


class SessionOut(BaseModel):
    session_id: int
    questions: list[dict]
    total: int


class SubmitResult(BaseModel):
    is_correct: bool
    correct_answer: str = ""
    explanation: str = ""
    sr_next_review: datetime | None = None
    need_self_evaluate: bool = False


class SessionSummary(BaseModel):
    session_id: int
    total_count: int
    correct_count: int
    wrong_count: int
    accuracy: float
    questions: list[dict]
