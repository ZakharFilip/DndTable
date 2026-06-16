import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { config } from "./config.js";

let client: AxiosInstance | null = null;
let loginPromise: Promise<void> | null = null;
let cachedUserId: string | null = null;

function createClient(): AxiosInstance {
  const jar = new CookieJar();
  return wrapper(
    axios.create({
      baseURL: config.mainApiUrl,
      jar,
      withCredentials: true,
      timeout: 60_000,
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    } as Parameters<typeof axios.create>[0] & { jar: CookieJar })
  );
}

async function ensureLoggedIn(): Promise<void> {
  if (loginPromise) return loginPromise;

  loginPromise = (async () => {
    const api = createClient();
    client = api;

    const me = await api.get("/auth/me");
    if (me.status === 200 && me.data?.success) return;

    const login = await api.post("/auth/login", {
      email: config.serviceEmail,
      password: config.servicePassword,
    });
    if (!login.data?.success) {
      throw new Error(login.data?.message ?? "Не удалось войти служебным пользователем");
    }
  })();

  try {
    await loginPromise;
  } catch (e) {
    loginPromise = null;
    client = null;
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
  return api.request({
    method,
    url: path,
    data,
    ...extra,
  });
}

export function resetBackendSession(): void {
  client = null;
  loginPromise = null;
  cachedUserId = null;
}
