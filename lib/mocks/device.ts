/** Хард-режим только в браузере на компьютере и вне Telegram. */
export function isMobileUA(ua: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile|Telegram/i.test(ua);
}
