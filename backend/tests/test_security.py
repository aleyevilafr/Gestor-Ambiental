import pytest
from pydantic import ValidationError

from app.core.rut import normalize_chilean_rut
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.schemas.auth import RegisterRequest


def test_normalizes_valid_chilean_rut() -> None:
    assert normalize_chilean_rut("12.345.678-5") == "12345678-5"


def test_rejects_invalid_chilean_rut() -> None:
    with pytest.raises(ValueError):
        normalize_chilean_rut("12.345.678-9")


def test_password_is_hashed_with_argon2() -> None:
    password = "una-contraseña-segura"
    hashed = hash_password(password)

    assert hashed != password
    assert hashed.startswith("$argon2")
    assert verify_password(password, hashed)
    assert not verify_password("contraseña-incorrecta", hashed)


def test_access_token_round_trip() -> None:
    token = create_access_token("a3e1ca90-9102-4b1f-89c5-1a0e0e73d8d3")
    assert decode_access_token(token) == "a3e1ca90-9102-4b1f-89c5-1a0e0e73d8d3"


def test_registration_rejects_control_characters() -> None:
    with pytest.raises(ValidationError):
        RegisterRequest(
            organization_name="Empresa\x00",
            rut="12.345.678-5",
            name="Administrador",
            email="admin@empresa.cl",
            password="ClaveSegura2026!",
        )
