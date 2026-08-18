export function isValidChileanRut(value: string): boolean {
  const cleaned = value.replace(/[^0-9kK]/g, "");
  if (cleaned.length < 2) return false;
  const body = cleaned.slice(0, -1);
  const verifier = cleaned.slice(-1).toUpperCase();
  if (!/^\d+$/.test(body) || Number(body) === 0) return false;

  let total = 0;
  let multiplier = 2;
  for (const digit of [...body].reverse()) {
    total += Number(digit) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (total % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return verifier === expected;
}
