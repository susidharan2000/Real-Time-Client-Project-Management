import { Router } from "express";
import { requireClientAuth } from "./client.middleware";
import { getClientCount } from "./client.controller";

export const clientRouter = Router();

clientRouter.get("/clientcount", requireClientAuth("ADMIN"),getClientCount);
