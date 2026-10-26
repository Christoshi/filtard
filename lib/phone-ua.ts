// Phones only. Tablets (iPad, Android without "Mobile") keep the normal login.
export function isPhoneUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  if (/iPad|Tablet|Silk|PlayBook|Kindle/i.test(ua)) return false;
  if (/Android/i.test(ua)) return /Mobile/i.test(ua);
  return /iPhone|iPod|Windows Phone|IEMobile|Opera Mini|BlackBerry|BB10|webOS/i.test(
    ua
  );
}
