
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { getAuthorizedUser, isTaskProjectManager, type User } from "./task.service";

export function requireTaskAuth(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.get("Authorization");
      const header:string[]|null = authorization?.trim().split(" ") ?? null ;
    
      if (!header || header.length !== 2 || header[0].toLocaleLowerCase() != "bearer"){
        return res.status(401).json({
        message: "A Bearer access token is required",
        });
      }
    
      const token = header[1]
    
    
      if (!token) {
        return res.status(401).json({ message: "An access token is required" });
      }
    
      const secret = process.env.ACCESS_TOKEN_SECRET;
      if (!secret) {
        return res.status(500).json({ message: "Authentication is not configured" });
      }
    
      try {
        const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
        if (typeof payload === "string" || typeof payload.exp !== "number") {
          return res.status(401).json({ message: "Invalid access token" });
        }
    
        const userId = payload.user_id;
    
        const authorized:User | null= await getAuthorizedUser(userId, allowedRoles)
    
        if (!authorized){
             return res.status(403).json({ message: "Unauthorized User" });
        }
        res.locals.userId = authorized.userId;
        res.locals.role = authorized.role;
        res.locals.userName = authorized.userName;
        
      } catch {
        return res.status(401).json({ message: "Invalid or expired access token" });
      }
      next();
  };
}

export async function requireTaskEditAccess(req: Request, res: Response, next: NextFunction) {
  const taskId = req.params.id;
  if (typeof taskId !== "string" || !/^[1-9]\d{0,18}$/.test(taskId)
      || BigInt(taskId) > 9223372036854775807n) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  const userId = res.locals.userId;
  const role = res.locals.role;
  if (typeof userId !== "string" || !userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (role === "ADMIN") return next();
  if (role !== "PROJECT_MANAGER") {
    return res.status(403).json({ message: "You do not have permission to edit tasks" });
  }

  try {
    const allowed = await isTaskProjectManager(taskId, userId);
    if (!allowed) {
      return res.status(403).json({ message: "You can only edit tasks in projects you manage" });
    }
  } catch (error) {
    console.error("Failed to check task edit permission:", error);
    return res.status(500).json({ message: "Could not check task edit permission" });
  }
  next();
}
