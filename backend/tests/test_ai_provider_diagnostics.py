import json
from types import SimpleNamespace

import httpx
import pytest

from app.integrations import ai_provider as provider


@pytest.mark.parametrize("fenced", [False, True])
def test_pure_and_json_fenced_output(monkeypatch, caplog, fenced):
    monkeypatch.setattr(provider, "get_settings", lambda: SimpleNamespace(
        app_env="production", ai_provider="gemini", ai_api_key="secret-test",
        ai_model="test", ai_timeout_seconds=20,
    ))
    raw = json.dumps({"proposals": [{"title": "Reporte"}], "warnings": []})
    if fenced:
        raw = f"```json\n{raw}\n```"
    def post(*args, **kwargs):
        assert kwargs["json"]["generationConfig"]["responseMimeType"] == "application/json"
        return httpx.Response(
            200, request=httpx.Request("POST", "https://example.com"),
            json={"candidates": [{"content": {"parts": [{"text": raw}]}}]},
        )
    monkeypatch.setattr(provider.httpx, "post", post)
    assert provider.analyze_obligations("texto").proposals[0]["title"] == "Reporte"
    assert not caplog.text


def test_additional_text_is_not_silently_removed():
    raw = 'Resultado:\n```json\n{"proposals": []}\n```'
    assert provider._normalize_json_fence(raw) == raw


@pytest.mark.parametrize("status,generated,expected", [
    (503, "{}", provider.AIProviderUnavailable),
    (200, "invalid json", provider.AIProviderInvalidResponse),
    (200, "[]", provider.AIProviderInvalidResponse),
])
def test_transport_and_invalid_output_are_distinct(monkeypatch, status, generated, expected):
    monkeypatch.setattr(provider, "get_settings", lambda: SimpleNamespace(
        app_env="production", ai_provider="gemini", ai_api_key="secret-test",
        ai_model="test", ai_timeout_seconds=20,
    ))
    monkeypatch.setattr(provider.httpx, "post", lambda *args, **kwargs: httpx.Response(
        status, request=httpx.Request("POST", "https://example.com"),
        json={"candidates": [{"content": {"parts": [{"text": generated}]}}]},
    ))
    with pytest.raises(expected):
        provider.analyze_obligations("texto")
