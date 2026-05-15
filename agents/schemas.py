from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Feature(BaseModel):
    id: str
    name: str
    description: str
    priority: Priority
    user_story: Optional[str] = None


class Task(BaseModel):
    id: str
    description: str
    feature_id: str


class AcceptanceCriterion(BaseModel):
    id: str
    description: str
    # テストのヒント（オプション）。実装詳細ではなく、何を確認するか
    test_hint: Optional[str] = None


class Sprint(BaseModel):
    number: int
    name: str
    goal: str
    tasks: list[Task]
    acceptance_criteria: list[AcceptanceCriterion]


class ProductSpec(BaseModel):
    project_name: str
    description: str
    features: list[Feature]
    sprints: list[Sprint]


class CriterionResult(BaseModel):
    criterion_id: str
    description: str
    passed: bool
    score: float = Field(ge=0.0, le=1.0)
    evidence: str  # テストで確認した内容
    feedback: str  # 不合格の場合の具体的な改善点


class EvaluationResult(BaseModel):
    sprint_number: int
    overall_score: float = Field(ge=0.0, le=1.0)
    passed: bool
    criterion_results: list[CriterionResult]
    bugs: list[str]
    improvements: list[str]
    summary: str


class SelfEvaluation(BaseModel):
    sprint_number: int
    completed_tasks: list[str]
    incomplete_tasks: list[str]
    known_issues: list[str]
    confidence: float = Field(ge=0.0, le=1.0)
    summary: str


class SprintResult(BaseModel):
    sprint_number: int
    summary: str
    files_changed: list[str]
    self_evaluation: SelfEvaluation
    ready_for_evaluation: bool
