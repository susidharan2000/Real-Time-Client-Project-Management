import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { authRouter } from "./auth/auth.route.ts";
import { dashboardRouter } from "./dashboard/dashboard.router.ts"
import {taskRouter} from "./task/task.router.ts"
import {projectRouter} from "./project/project.router.ts"
import {clientRouter} from "./client/client.router.ts"

export const app= express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/dashboard", dashboardRouter);
app.use("/task", taskRouter);
app.use("/project", projectRouter);
app.use("/client", clientRouter);
