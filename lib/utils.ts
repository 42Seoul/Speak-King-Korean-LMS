import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
// @ts-ignore
import levenshtein from "fast-levenshtein"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeText(text: string): string {
  if (!text) return ""
  // Remove punctuation, spaces and convert to lowercase
  return text
    .toLowerCase()
    .replace(/[.,?!;:"'()\[\]{}]/g, "")
    .replace(/\s+/g, "")
}

export function evaluateSpeech(target: string, input: string): { score: number, passed: boolean } {
  const normalizedTarget = normalizeText(target)
  const normalizedInput = normalizeText(input)
  
  if (!normalizedTarget) return { score: 0, passed: false }
  if (!normalizedInput) return { score: 0, passed: false }

  // Check 1: Contains (Bonus)
  if (normalizedInput.includes(normalizedTarget)) {
    return { score: 100, passed: true }
  }

  // Check 2: Levenshtein Distance
  const distance = levenshtein.get(normalizedTarget, normalizedInput)
  const maxLength = Math.max(normalizedTarget.length, normalizedInput.length)
  
  if (maxLength === 0) return { score: 0, passed: false }

  const accuracy = ((maxLength - distance) / maxLength) * 100
  const score = Math.round(accuracy)
  
  return { 
    score, 
    passed: score >= 70 
  }
}