import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { authRouter } from "./auth/auth.route.ts";

export const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
