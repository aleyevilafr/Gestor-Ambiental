from datetime import date
from pydantic import BaseModel, Field, field_validator, model_validator

class RecommendedAction(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    suggested_due_date: date | None = None
    expected_evidence: str | None = None
    @field_validator("title")
    @classmethod
    def title_required(cls, value: str) -> str:
        value=value.strip()
        if not value: raise ValueError("El título es obligatorio.")
        return value

    @field_validator("description", "expected_evidence", mode="before")
    @classmethod
    def empty_optional_strings_are_null(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("suggested_due_date", mode="before")
    @classmethod
    def invalid_dates_are_null(cls, value: object) -> object:
        if value in (None, ""):
            return None
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError:
                return None
        return None
class CompliancePlanProposal(BaseModel):
    objective: str | None = None
    assessment: str | None = None
    recommended_actions: list[RecommendedAction] = Field(default_factory=list, max_length=5)
    warnings: list[str] = Field(default_factory=list, max_length=10)

    @model_validator(mode="before")
    @classmethod
    def normalize_optional_strings_and_invalid_dates(cls, value: object) -> object:
        if not isinstance(value, dict):
            return value
        data = dict(value)
        for key in ("objective", "assessment"):
            if isinstance(data.get(key), str) and not data[key].strip():
                data[key] = None
        warnings = [warning.strip() for warning in data.get("warnings", []) if isinstance(warning, str) and warning.strip()]
        actions = data.get("recommended_actions", [])
        if isinstance(actions, list):
            for action in actions:
                if not isinstance(action, dict):
                    continue
                raw_date = action.get("suggested_due_date")
                if raw_date not in (None, ""):
                    try:
                        date.fromisoformat(raw_date) if isinstance(raw_date, str) else (_ for _ in ()).throw(ValueError())
                    except ValueError:
                        action["suggested_due_date"] = None
                        warnings.append("Una fecha sugerida inválida fue descartada.")
        data["warnings"] = warnings[:10]
        return data
