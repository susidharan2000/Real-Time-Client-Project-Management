import { Router } from "express";
import { requireClientAuth } from "./client.middleware";
import { getClientCount, getClients, addClient, editClient, deleteClient } from "./client.controller";

export const clientRouter = Router();

clientRouter.get("/clientcount", requireClientAuth("ADMIN"),getClientCount);
clientRouter.get("/", requireClientAuth("ADMIN"),getClients);
clientRouter.post("/", requireClientAuth("ADMIN"),addClient);
clientRouter.put("/:id", requireClientAuth("ADMIN"),editClient);
clientRouter.delete("/:id", requireClientAuth("ADMIN"),deleteClient);
