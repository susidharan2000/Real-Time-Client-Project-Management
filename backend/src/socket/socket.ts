import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { pool } from "../db/pool.js";
import { addUser, removeUser, fetchOnlineUserCount } from "../presence/presence.service.js";

export function setupSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    const secret = process.env.ACCESS_TOKEN_SECRET;

    if (typeof token !== "string" || !secret) {
      return next(new Error("Unauthorized"));
    }

    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
      if (typeof payload === "string" || typeof payload.exp !== "number" ||
          typeof payload.user_id !== "string" || !payload.user_id.trim()) {
        return next(new Error("Unauthorized"));
      }

      const user = await pool.query<{ role_name: string }>(
        `SELECT r.role_name FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.user_id = $1 AND u.is_active = true LIMIT 1`,
        [payload.user_id]
      );
      if (user.rows.length === 0) {
        return next(new Error("Unauthorized"));
      }

      socket.data.userId = payload.user_id;
      socket.data.role = user.rows[0].role_name;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId: string = socket.data.userId;
    const room = `user:${userId}`;

    socket.join(room);
    if (socket.data.role === "ADMIN") {
      socket.join("admins");
    }

    const firstConnection = io.sockets.adapter.rooms.get(room)?.size === 1;
    if (firstConnection) {
      addUser(userId);
    }
    //send Initial State
    io.to("admins").emit("presence:count", {
      onlineCount: fetchOnlineUserCount(),
    });

    socket.on("disconnecting", () => {
      if (io.sockets.adapter.rooms.get(room)?.size === 1) {
        removeUser(userId);
        io.to("admins").emit("presence:count", {
          onlineCount: fetchOnlineUserCount(),
        });
      }
    });
  });
  return io
}
