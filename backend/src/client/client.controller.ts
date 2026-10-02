import type { Request, Response } from "express";
import { fetchClientCount, fetchClients, insertClient, updateClient, removeClient } from "./client.service.ts";

export const getClientCount = async (_req: Request, res: Response) => {
  try {
    const totalClients = await fetchClientCount();
    return res.status(200).json({ totalClients });
  } catch (error) {
    console.error("Failed to fetch client count:", error);
    return res.status(500).json({ message: "Could not fetch client count" });
  }
};

export const getClients = async (_req: Request, res: Response) => {
  try {
    const clients = await fetchClients();
    return res.status(200).json({ clients });
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return res.status(500).json({ message: "Could not fetch clients" });
  }
};

export const addClient = async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body ?? {};


    if (typeof name !== "string" || !name.trim() || name.trim().length > 200) {
      return res.status(400).json({ message: "Client name must contain 1 to 200 characters" });
    }
    if (email != null && typeof email !== "string") {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const clientEmail = email?.trim() || null;
    if (clientEmail && (clientEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const client = await insertClient(name.trim(), clientEmail);
    return res.status(201).json({ client });
    
  } catch (error) {
    console.error("Failed to add client:", error);
    return res.status(500).json({ message: "Could not add client" });
  }
};

export const editClient = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!isValidClientId(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    const { name, email } = req.body ?? {};
    if (typeof name !== "string" || !name.trim() || name.trim().length > 200) {
      return res.status(400).json({ message: "Client name must contain 1 to 200 characters" });
    }
    if (email != null && typeof email !== "string") {
      return res.status(400).json({ message: "Invalid email address" });
    }
    const clientEmail = email?.trim() || null;
    if (clientEmail && (clientEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const client = await updateClient(id, name.trim(), clientEmail);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    return res.status(200).json({ client });
  } catch (error) {
    console.error("Failed to update client:", error);
    return res.status(500).json({ message: "Could not update client" });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!isValidClientId(id)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    const deleted = await removeClient(id);
    if (!deleted) {
      return res.status(404).json({ message: "Client not found" });
    }
    return res.status(200).json({ message: "Client deleted successfully" });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23503") {
      return res.status(409).json({ message: "Clients with linked projects cannot be deleted" });
    }
    console.error("Failed to delete client:", error);
    return res.status(500).json({ message: "Could not delete client" });
  }
};

function isValidClientId(id: unknown): id is string {
  return typeof id === "string" && /^[1-9]\d{0,18}$/.test(id)
    && BigInt(id) <= 9223372036854775807n;
}
