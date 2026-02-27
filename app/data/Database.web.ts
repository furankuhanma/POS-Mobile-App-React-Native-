import * as Crypto from "expo-crypto";

// ─── Web stub ─────────────────────────────────────────────────────────────────
// Metro automatically uses this file on web instead of Database.ts,
// so expo-sqlite (and its .wasm files) are never bundled for web.

export function generateUUID(): string {
  return Crypto.randomUUID();
}

export async function getDb(): Promise<null> {
  return null;
}

export async function getDeviceConfig(_key: string): Promise<string | null> {
  return null;
}

export async function setDeviceConfig(
  _key: string,
  _value: string,
): Promise<void> {
  // no-op on web
}

export async function getTerminalId(): Promise<string> {
  return "web-terminal";
}

export async function runMigrations(): Promise<void> {
  // no-op on web
}
