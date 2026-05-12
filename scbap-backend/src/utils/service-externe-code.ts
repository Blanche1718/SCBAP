import { randomInt } from "crypto";

const SERVICE_ACCESS_DIGITS = "0123456789";
const SUIVI_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomFromAlphabet(length: number, alphabet: string) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += alphabet[randomInt(0, alphabet.length)];
  }

  return value;
}

export function generateServiceAccessCode() {
  return randomFromAlphabet(6, SERVICE_ACCESS_DIGITS);
}

export function generateCodeSuivi() {
  return `SUIV-${randomFromAlphabet(6, SUIVI_CODE_CHARS)}`;
}
