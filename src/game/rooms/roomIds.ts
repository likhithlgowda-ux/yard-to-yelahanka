const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid confusing I/1/O/0

export function normalizeRoomCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generateRoomCode(len = 6) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
