const EMERGENCY_PATTERNS = [
  /\b(chest pain|chest pressure|chest tightness)\b/,
  /\b(can not|cannot|cant|unable to|struggling to|difficulty) (breathe|breathing)\b/,
  /\b(shortness of breath|severe trouble breathing)\b/,
  /\b(bleeding heavily|heavy bleeding|wont stop bleeding|bleeding wont stop)\b/,
  /\b(i|he|she|they|someone|person|patient|my child|my baby) (collapsed|is collapsing|has collapsed|fainted|is unconscious|is not waking up)\b/,
  /\b(face drooping|one sided weakness|sudden severe weakness)\b/,
];

/**
 * One conservative emergency-language boundary shared by intake and Teni.
 * It routes to immediate in-person help. It does not diagnose or monitor.
 */
export function isPossibleEmergency(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/\b(i|we|they|he|she)\s*['’]?m\b/g, "$1 am")
    .replace(/\b(can|won)\s*['’]?t\b/g, "$1t")
    .replace(/\s+/g, " ")
    .trim();

  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export const EMERGENCY_GUIDANCE =
  "This may be an emergency. Go to the nearest hospital or call emergency services on 112 now. Do not wait for an online consultation or a reply from Teni.";
