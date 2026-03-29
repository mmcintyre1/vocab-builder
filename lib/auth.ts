export function checkPin(pin: string | null): boolean {
  const validPin = process.env.NEXT_PUBLIC_APP_PIN;
  if (!validPin) return false;
  return pin === validPin;
}

export function getPinFromRequest(request: Request): string | null {
  return request.headers.get("x-pin");
}
