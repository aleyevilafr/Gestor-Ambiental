import re


def normalize_chilean_rut(value: str) -> str:
    cleaned = re.sub(r"[^0-9kK]", "", value)
    if len(cleaned) < 2:
        raise ValueError("El RUT no tiene un formato válido.")

    body, verifier = cleaned[:-1], cleaned[-1].upper()
    if not body.isdigit() or int(body) == 0:
        raise ValueError("El RUT no tiene un formato válido.")

    total = 0
    multiplier = 2
    for digit in reversed(body):
        total += int(digit) * multiplier
        multiplier = 2 if multiplier == 7 else multiplier + 1

    expected = 11 - (total % 11)
    expected_verifier = "0" if expected == 11 else "K" if expected == 10 else str(expected)
    if verifier != expected_verifier:
        raise ValueError("El RUT no es válido.")

    return f"{int(body)}-{verifier}"
