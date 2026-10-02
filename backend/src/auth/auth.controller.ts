import type { Request, Response} from "express";
import { authenticateUser,verifyRefreshToken,RevokeRefreshToken,verifySession } from "./auth.service.ts";

// Validate the request body for username and password
//             Create the refresh token and access token
//             store the refresh token in the database
//             return the access token and refresh token to the client
export const login = async (req: Request, res: Response) => {
        try{
            const {username, password} = req.body;

            if (typeof username !== 'string' || typeof password !== 'string'){
                return res.status(400).json({message: "Invalid username or password"});
            }
            const result = await authenticateUser(username, password);
            if (result === null) {
                return res.status(401).json({message: "Invalid username or password"});
            }
            res.cookie("refreshToken", result.refreshToken, {httpOnly: true, secure: true, sameSite: "strict"});
            return res.status(200).json(
                {
                    "userName": result.user.username,
                    "userId": result.user.userId,
                    "role": result.user.role,
                    "accessToken": result.accessToken,
                }
            );
        }catch(err){
            return res.status(500).json({message: "Internal server error"});
        }
}

export const refreshToken = async (req: Request, res: Response) => {
    try{
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({message: "Refresh token not found"});
        }
        const result = await verifyRefreshToken(refreshToken);
        if (result === null) {
            return res.status(401).json({message: "Invalid refresh token"});
        }
        return res.status(200).json({"accessToken": result.accessToken});
    }
    catch(err){
        return res.status(500).json({message: "Internal server error"});
    }
}

export const logout = async (req: Request, res: Response) => {
    try{
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({message: "Refresh token not found"});
        }
        // Revoke the refresh token in the database
        const isRevoked = await RevokeRefreshToken(refreshToken);
        if (!isRevoked) {
            return res.status(400).json({message: "Failed to revoke refresh token"});
        }
        res.clearCookie("refreshToken");
        return res.status(200).json({message: "Logged out successfully"});
    }
    catch(err){
        return res.status(500).json({message: "Internal server error"});
    }
}

export const checkSession = async (req: Request, res: Response) => {
    try{
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({message: "Refresh token not found"});
        }
        const result = await verifySession(refreshToken);
        if (result === null) {
            return res.status(401).json({message: "Invalid refresh token"});
        }
        return res.status(200).json({
            "userName": result.user.username,
            "userId": result.user.userId,
            "role": result.user.role,
            "accessToken": result.accessToken,
        });
    }
    catch(err){
        return res.status(500).json({message: "Internal server error"});
    }
}
