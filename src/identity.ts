// src/identity.ts
// Copiado de front_sistema_rpg/src/lib/identity.ts — manter em sync.

export function normalizeIdentity(value?: string | null): string {
  return (value || "").trim().toLowerCase().normalize("NFC");
}

export function buildIdentityAliasSet(
  values: Array<string | null | undefined>,
): Set<string> {
  return new Set(values.map(normalizeIdentity).filter(Boolean));
}

export function identityMatches(
  value: string | null | undefined,
  aliases: Set<string>,
): boolean {
  return aliases.has(normalizeIdentity(value));
}
