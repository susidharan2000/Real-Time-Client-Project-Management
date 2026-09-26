import {pool} from "../db/pool.ts";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createHash } from "node:crypto";

type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    username: string;
    role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";
  };
};
export async function authenticateUser(username: string, password: string): Promise<LoginResult | null> {
    try {
        const user = await pool.query("SELECT u.user_id, u.user_name, u.password_hash, u.is_active,r.role_name FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_name = $1 LIMIT 1", [username]);
        if (user.rowCount === 0) {
            return null;
        }

        if (!user.rows[0].is_active) {
            return null;
        }

        const hashedPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!hashedPassword) {
            return null;
        }

        const refreshToken = jwt.sign({user_id: user.rows[0].user_id}, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: '7d' });
        const accessToken = jwt.sign({user_id: user.rows[0].user_id}, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: '15m' });
        
        //creat the new session for the user and store the refresh token in the database
        const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");

        await pool.query("INSERT INTO refresh_tokens (user_id , token_hash, expires_at, device_info) VALUES ($1, $2, $3, $4)", [user.rows[0].user_id, refreshTokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), ""]); // Assuming device_info is not available
        const res: LoginResult = {
            accessToken,
            refreshToken,
            user: {
                userId: user.rows[0].user_id,
                username: user.rows[0].user_name,
                role: user.rows[0].role_name
            }
        }; 
        return res;
    }
    catch (err) {
        console.error("Error occurred while authenticating user:", err);
        throw err;
    }
}

export async function verifyRefreshToken(refreshToken: string): Promise<{ accessToken: string } | null> {
    try {
        const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
        const tokenRecord = await pool.query(`SELECT rt.user_id
                                                FROM refresh_tokens rt
                                                JOIN users u ON u.user_id = rt.user_id
                                                WHERE rt.token_hash = $1
                                                AND rt.revoked_at IS NULL
                                                AND rt.expires_at > now()
                                                AND u.is_active = true
                                                LIMIT 1`,
                                                [refreshTokenHash]
                                            );
        if (tokenRecord.rowCount === 0) {
            return null;
        }
        const accessToken = jwt.sign({ user_id: tokenRecord.rows[0].user_id }, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: '15m' });
        return { accessToken };

    } 
    catch (err) {
        console.error("Error occurred while verifying refresh token:", err);
        throw err;
    }
}

export async function RevokeRefreshToken(refreshToken: string): Promise<boolean> {
    try {
        const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
        const result = await pool.query("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1", [refreshTokenHash]);
        return (result.rowCount ?? 0) > 0;
    } catch (err) {
        console.error("Error occurred while revoking refresh token:", err);
        throw err;
    }
}
