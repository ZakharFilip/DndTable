import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { config } from "./config.js";
import { connectDb, disconnectDb } from "./db.js";
import { checkMainApiAuth, getServiceUserId, proxyRequest } from "./backendClient.js";
import { demoteBotFromSession, elevateBotForSession, withBotSessionAccess } from "./sessionAccess.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

function requireBridgeKey(req: Request, res: Response, next: NextFunction): void {
  if (!config.bridgeApiKey) {
    next();
    return;
  }
  const key = req.header("x-diplom-bridge-key");
  if (key !== config.bridgeApiKey) {
    res.status(401).json({ success: false, message: "Неверный ключ моста" });
    return;
  }
  next();
}

function forwardResponse(res: Response, upstream: { status: number; data: unknown }) {
  res.status(upstream.status).json(upstream.data);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "diplom-bridge" });
});

app.get("/health/deep", async (_req, res) => {
  const auth = await checkMainApiAuth();
  if (!auth.ok) {
    res.status(503).json({
      ok: false,
      service: "diplom-bridge",
      mainApi: config.mainApiUrl,
      error: auth.error,
    });
    return;
  }
  res.json({
    ok: true,
    service: "diplom-bridge",
    mainApi: config.mainApiUrl,
    serviceUserId: auth.userId,
  });
});

app.use(requireBridgeKey);

// --- Auth (прокси на основной backend, cookie сохраняется в мосте) ---

app.post("/auth/login", async (req, res, next) => {
  try {
    const upstream = await proxyRequest("post", "/auth/login", req.body);
    forwardResponse(res, upstream);
  } catch (e) {
    next(e);
  }
});

app.get("/auth/me", async (_req, res, next) => {
  try {
    const upstream = await proxyRequest("get", "/auth/me");
    forwardResponse(res, upstream);
  } catch (e) {
    next(e);
  }
});

app.post("/auth/logout", async (_req, res, next) => {
  try {
    const upstream = await proxyRequest("post", "/auth/logout");
    forwardResponse(res, upstream);
  } catch (e) {
    next(e);
  }
});

// --- Сессии: списки без повышения прав ---

app.get("/api/sessions", async (_req, res, next) => {
  try {
    const upstream = await proxyRequest("get", "/api/sessions");
    forwardResponse(res, upstream);
  } catch (e) {
    next(e);
  }
});

app.get("/api/sessions/public", async (_req, res, next) => {
  try {
    const upstream = await proxyRequest("get", "/api/sessions/public");
    forwardResponse(res, upstream);
  } catch (e) {
    next(e);
  }
});

// --- Join / leave с управлением правами бота ---

app.post("/api/sessions/:id/join", async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = await getServiceUserId();
    await elevateBotForSession(sessionId, userId);
    const upstream = await proxyRequest("post", `/api/sessions/${sessionId}/join`);
    forwardResponse(res, upstream);
  } catch (e) {
    next(e);
  }
});

app.post("/api/sessions/:id/leave", async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = await getServiceUserId();
    await demoteBotFromSession(sessionId, userId);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// --- Полная загрузка стола ---

app.get("/api/sessions/:id/full", async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = await getServiceUserId();
    const upstream = await withBotSessionAccess(sessionId, userId, () =>
      proxyRequest("get", `/api/sessions/${sessionId}/full`)
    );
    forwardResponse(res, upstream);
  } catch (e) {
    next(e);
  }
});

// --- Patch с broadcast через основной backend ---

app.post("/api/sessions/:id/patch", async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = await getServiceUserId();
    const upstream = await withBotSessionAccess(sessionId, userId, () =>
      proxyRequest("post", `/api/sessions/${sessionId}/patch`, req.body)
    );
    forwardResponse(res, upstream);
  } catch (e) {
    next(e);
  }
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Внутренняя ошибка моста";
  console.error("[diplom-bridge]", err);
  res.status(500).json({ success: false, message });
});

async function main() {
  await connectDb();
  const host = config.bindHost;
  app.listen(config.port, host, async () => {
    console.log(`Diplom Bridge listening on http://${host}:${config.port}`);
    console.log(`Main API: ${config.mainApiUrl}`);
    console.log(`Service user: ${config.serviceEmail}`);
    console.log(`Auto leave after request: ${config.autoLeaveAfterRequest}`);

    const auth = await checkMainApiAuth();
    if (auth.ok) {
      console.log(`Main API auth OK (userId=${auth.userId})`);
    } else {
      console.error(`Main API auth FAILED: ${auth.error}`);
    }
  });
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await disconnectDb();
  process.exit(1);
});

process.on("SIGINT", async () => {
  await disconnectDb();
  process.exit(0);
});
