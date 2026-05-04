/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "node:path";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";

import { envVars } from "./config/env";

import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { notFound } from "./middleware/notFound";
import { apiLimiter } from "./middleware/rateLimiter";
import { indexRoutes } from ".";
import { PaymentController } from "./modules/payment/payment.controler";
import { authRoutes } from "./modules/auth/auth.router";

const app: Application = express();

// Trust reverse proxy (Nginx) so req.protocol, req.ip, secure cookies work in production
app.set("trust proxy", 1);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/demo", express.static(path.join(process.cwd(), "public")));


/* -------------------------------------------
   Stripe Webhook (RAW BODY)
-------------------------------------------- */
app.post(
  "/api/v1/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.handleStripeWebhookEvent
);

/* -------------------------------------------
   CORS
-------------------------------------------- */
app.use(
  cors({
    origin: [envVars.FRONTEND_URL, envVars.BETTER_AUTH_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

/* -------------------------------------------
   Cookie Parser (🔥 MUST COME BEFORE BetterAuth)
-------------------------------------------- */
app.use(cookieParser());

/* -------------------------------------------
   Body Parsers
-------------------------------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------------------------------
   BetterAuth (AFTER cookieParser)
-------------------------------------------- */
app.use("/api/auth", toNodeHandler(auth));

/* -------------------------------------------
   Basic Health Route
-------------------------------------------- */
app.get("/", (req: Request, res: Response) => {
  res.send("Nexora Backend Running Successfully!");
});

/* -------------------------------------------
   Health Check (for uptime monitoring / load balancer)
   -------------------------------------------
   NOTE on Render free tier:
   - Free web services sleep after ~15 minutes of inactivity.
   - The first request after sleep may take 30–60 seconds (cold start).
   - Upgrading to a paid Render plan removes cold starts entirely.
   - To mitigate on the free plan, configure an EXTERNAL uptime pinger
     (e.g. cron-job.org, UptimeRobot) to hit this endpoint every
     ~10 minutes. Do NOT self-ping from inside this process — it will
     not prevent sleep and wastes resources.
-------------------------------------------- */
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

/* -------------------------------------------
   API Routes
   - apiLimiter is mounted only on /api/v1 so health checks,
     static assets, and the Stripe webhook are never throttled.
-------------------------------------------- */
app.use("/auth", authRoutes);
app.use("/api/v1", apiLimiter, indexRoutes);

/* -------------------------------------------
   Global Error Handler + 404
-------------------------------------------- */
app.use(globalErrorHandler);
app.use(notFound);

export default app;