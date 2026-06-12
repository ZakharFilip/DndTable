/** API origin for REST and avatars. Empty string = same origin (production default). */
export function resolveApiBase(): string {
  return (
    import.meta.env.VITE_API_BASE ??
    import.meta.env.VITE_API_URL ??
    (import.meta.env.DEV ? "http://localhost:4000" : "")
  );
}

/** Socket.IO URL. Undefined = connect to current host (production default). */
export function resolveSocketUrl(): string | undefined {
  const fromEnv =
    import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_SOCKET_BASE;
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  return import.meta.env.DEV ? "http://localhost:4000" : undefined;
}
