import type { Request, Response } from "express";
import { fetchClientCount } from "./client.service.ts";

export const getClientCount = async (_req: Request, res: Response) => {
  try {
    const totalClients = await fetchClientCount();
    return res.status(200).json({ totalClients });
  } catch (error) {
    console.error("Failed to fetch client count:", error);
    return res.status(500).json({ message: "Could not fetch client count" });
  }
};
