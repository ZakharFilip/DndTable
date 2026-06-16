import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { CookieJar } from "tough-cookie";
import { config } from "./config.js";

let client: AxiosInstance | null = null;
let cookieJar: CookieJar | null = null;
let loginPromise: Promise<void> | null = null;
let cachedUserId: string | null = null;

function resolveRequestUrl(cfg: { baseURL?: string; url?: string }): string {
  const base = (cfg.baseURL ?? "").replace(/\/$/, "");
  const path = cfg.url ?? "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function isHttpsUrl(url: string): boolean {
  return url.startsWith("https://");
}

/**
 * В production backend выставляет cookie с флагом Secure.
 * При MAIN_API_URL=http://127.0.0.1:4000 tough-cookie не сохранит такие cookie —
 * снимаем Secure/SameSite=None для HTTP-соединения с локальным API.
 */
function normalizeSetCookieForTransport(raw: string, requestUrl: string): string {
  if (isHttpsUrl(requestUrl)) return raw;
  return raw
    .replace(/;\s*Secure/gi, "")
    .replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
}

function attachCookieJar(instance: AxiosInstance, jar: CookieJar): void {
  instance.interceptors.request.use(async (req: InternalAxiosRequestConfig) => {
    const url = resolveRequestUrl(req);
    const cookie = await jar.getCookieString(url);
    if (cookie) req.headers.set("Cookie", cookie);
    return req;
  });

  instance.interceptors.response.use(async (response) => {
    const raw = response.headers["set-cookie"];
    if (!raw) return response;
    const url = resolveRequestUrl(response.config);
    const items = Array.isArray(raw) ? raw : [raw];
    for (const item of items) {
      await jar.setCookie(normalizeSetCookieForTransport(item, url), url);
    }
    return response;
  });
}

function createClient(): AxiosInstance {
  const jar = new CookieJar();
  cookieJar = jar;

  const instance = axios.create({
    baseURL: config.mainApiUrl,
    timeout: 60_000,
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true,
  });

  attachCookieJar(instance, jar);
  return instance;
}

async function verifySession(api: AxiosInstance): Promise<boolean> {
  const me = await api.get("/auth/me");
  return me.status === 200 && me.data?.success === true;
}

async function performLogin(api: AxiosInstance): Promise<void> {
  const login = await api.post("/auth/login", {
    email: config.serviceEmail,
    password: config.servicePassword,
  });
  if (!login.data?.success) {
    throw new Error(
      login.data?.message ??
        `Не удалось войти служебным пользователем (${config.serviceEmail}) на ${config.mainApiUrl}`
    );
  }
  if (!(await verifySession(api))) {
    throw new Error(
      `Логин на ${config.mainApiUrl} прошёл, но сессия не сохранилась. ` +
        `Проверьте MAIN_API_URL: для production обычно https://kabantable.space, не http://localhost:4000`
    );
  }
}

async function ensureLoggedIn(): Promise<void> {
  if (loginPromise) return loginPromise;

  loginPromise = (async () => {
    if (!client) client = createClient();
    if (await verifySession(client)) return;
    await performLogin(client);
  })();

  try {
    await loginPromise;
  } catch (e) {
    loginPromise = null;
    client = null;
    cookieJar = null;
    cachedUserId = null;
    throw e;
  }
}

export async function getBackendClient(): Promise<AxiosInstance> {
  await ensureLoggedIn();
  if (!client) client = createClient();
  return client;
}

export async function getServiceUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const api = await getBackendClient();
  const res = await api.get("/auth/me");
  if (!res.data?.success) {
    throw new Error("Служебный пользователь не авторизован на основном API");
  }
  const id = res.data?.data?.user?.id;
  if (!id) throw new Error("Не удалось получить id служебного пользователя");
  cachedUserId = String(id);
  return cachedUserId;
}

export async function proxyRequest(
  method: "get" | "post" | "put" | "delete",
  path: string,
  data?: unknown,
  extra?: AxiosRequestConfig
) {
  const api = await getBackendClient();
  const response = await api.request({
    method,
    url: path,
    data,
    ...extra,
  });

  if (response.status === 401 && path !== "/auth/login") {
    resetBackendSession();
    const retryApi = await getBackendClient();
    return retryApi.request({
      method,
      url: path,
      data,
      ...extra,
    });
  }

  return response;
}

export async function checkMainApiAuth(): Promise<{ ok: boolean; userId?: string; error?: string }> {
  try {
    await ensureLoggedIn();
    const userId = await getServiceUserId();
    return { ok: true, userId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function resetBackendSession(): void {
  client = null;
  cookieJar = null;
  loginPromise = null;
  cachedUserId = null;
}
