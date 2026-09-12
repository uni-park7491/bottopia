'use client';
import { useSyncExternalStore } from 'react';
import { isLocale, type Locale } from './i18n';
const localeEventName = 'bottopia-locale-change';

function subscribeToLocale(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(localeEventName, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(localeEventName, onStoreChange);
  };
}

let fallbackLocale: Locale = 'ko';
function readLocale(): Locale {
  try {
    const savedLocale = window.localStorage.getItem('bottopia-locale');
    return isLocale(savedLocale) ? savedLocale : fallbackLocale;
  } catch { return fallbackLocale; }
}

function readServerLocale(): Locale {
  return 'ko';
}

export function saveLocale(locale: Locale) {
  fallbackLocale = locale;
  try { window.localStorage.setItem('bottopia-locale', locale); } catch { /* Keep this tab usable when storage is blocked. */ }
  window.dispatchEvent(new Event(localeEventName));
}


export function useSiteLocale() { return useSyncExternalStore(subscribeToLocale, readLocale, readServerLocale); }
