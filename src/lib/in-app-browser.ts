// App 內建瀏覽器（LINE／FB／IG／Messenger 等）判斷：Google 禁止在這些環境登入（403 disallowed_useragent）。
// 規則與 layout.tsx 頁首防護一致。
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger|MicroMessenger|KAKAOTALK|\bLine\//i.test(navigator.userAgent || '');
}
