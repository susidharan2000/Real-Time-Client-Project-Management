
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { isAuthorized } from "./project.service";

export function requireProjectAuth(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.get("Authorization");
      const header:string[]|null = authorization?.trim().split(" ") ?? null ;
    
      if (!header || header.length !== 2 || header[0].toLocaleLowerCase() != "bearer"){
        return res.status(401).json({
        message: "A Bearer access token is required",
        });
      }
    
      const token = header[1]
    
      //console.log(`Project token:${token}`)
    
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
        console.log(userId)
    
        const authorized:Boolean = await isAuthorized(userId, allowedRoles)
        //console.log(authorized)
    
        if (!authorized){
             return res.status(403).json({ message: "Admin access required" });
        }
        res.locals.userId = userId;
      } catch {
        return res.status(401).json({ message: "Invalid or expired access token" });
      }
      next();
  };
}
