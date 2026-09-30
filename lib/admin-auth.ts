const text = new TextEncoder();

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  const binary = Array.from(new Uint8Array(bytes instanceof Uint8Array ? bytes.buffer : bytes), (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", text.encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, iterations }, key, 256));
}

export async function verifyAdminPassword(password: string, stored: string) {
  const [algorithm, iterationsText, saltText, digestText] = stored.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000 || !saltText || !digestText) return false;
  try {
    return sameBytes(await pbkdf2(password, fromBase64Url(saltText), iterations), fromBase64Url(digestText));
  } catch { return false; }
}

async function sessionSignature(payload: string, signingKey: string) {
  const key = await crypto.subtle.importKey("raw", text.encode(signingKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, text.encode(payload)));
}

export async function createAdminSession(username: string, signingKey: string) {
  const expires = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const payload = `${username}.${expires}`;
  return `${payload}.${await sessionSignature(payload, signingKey)}`;
}

export async function verifyAdminSession(value: string | undefined, signingKey: string | undefined) {
  if (!value || !signingKey) return false;
  const [username, expiresText, signature, ...extra] = value.split(".");
  const expires = Number(expiresText);
  if (extra.length || !/^[a-z0-9_-]{3,64}$/.test(username ?? "") || !Number.isInteger(expires) || expires * 1000 < Date.now() || !signature) return false;
  try { return sameBytes(fromBase64Url(signature), fromBase64Url(await sessionSignature(`${username}.${expires}`, signingKey))); }
  catch { return false; }
}
