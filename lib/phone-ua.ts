// Phones only. iPad and Android tablets stay on the normal browser OAuth flow.
export function isPhoneUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;

  if (/iPhone|iPod/i.test(userAgent)) return true;

  if (/Android/i.test(userAgent) && /Mobile/i.test(userAgent)) return true;

  if (/Windows Phone|IEMobile|BlackBerry|BB10|Opera Mini/i.test(userAgent)) {
    return true;
  }

  return false;
}
