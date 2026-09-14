// AES-GCM encryption for exchange API credentials. Server-only.

function getKeyMaterial(): string {
  const secret = process.env["CREDENTIALS_ENCRYPTION_KEY"];
  if (!secret) throw new Error("Missing CREDENTIALS_ENCRYPTION_KEY");
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(getKeyMaterial());
  const digest = await crypto.subtle.digest("SHA-256", raw);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptSecret(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  return `${toBase64(iv)}.${toBase64(cipher)}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const [ivPart, cipherPart] = payload.split(".");
  if (!ivPart || !cipherPart) throw new Error("Stored credential is malformed");
  const key = await getKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivPart) },
    key,
    fromBase64(cipherPart),
  );
  return new TextDecoder().decode(plain);
}
