import { Router } from "express";
import jwt from "jsonwebtoken";
import monitorBus from "../services/monitorBus.js";

const router = Router();

/**
 * Server-Sent Events stream for the Backend Monitor page.
 * EventSource cannot send custom Authorization headers, so the token is
 * passed as a query parameter for this endpoint only.
 */
router.get("/stream", (req, res) => {
  try {
    const token = req.query.token;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET || "chainverify_super_secret_change_me");
    }
  } catch {
    return res.status(401).end();
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  // Replay recent history so a freshly-opened tab isn't empty
  monitorBus.history.forEach((entry) => {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  });

  const onLog = (entry) => {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  };
  monitorBus.on("log", onLog);

  const keepAlive = setInterval(() => res.write(": ping\n\n"), 20000);

  req.on("close", () => {
    clearInterval(keepAlive);
    monitorBus.off("log", onLog);
  });
});

router.get("/history", (req, res) => {
  res.json({ logs: monitorBus.history });
});

export default router;
