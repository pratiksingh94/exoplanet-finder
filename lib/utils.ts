import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const STAR_ID_RE =
  /^(?:kic|epic|tic|koi|hd|hip|kepler|k2)\s*[-_ ]?\d+(\.\d+)?$/i;

export function isValidStarId(star: unknown): boolean {
  if (typeof star !== "string") return false;
  const s = star.trim();
  if (s.length < 3 || s.length > 32) return false;
  return STAR_ID_RE.test(s);
}

export const STAR_ID_HINT =
  "Enter a valid star ID like KIC 8191672, EPIC 201912552 or TIC 410153553";
