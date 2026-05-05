import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Language } from "@/lib/translations"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hasArabicText(text: string | null | undefined) {
  return /[\u0600-\u06FF]/.test(text || "")
}

export function textDirectionFor(text: string | null | undefined) {
  return hasArabicText(text) ? "rtl" : "ltr"
}

export function formatNumberEn(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", options).format(value)
}

export function localeWithEnglishDigits(language: Language) {
  return language === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US"
}
