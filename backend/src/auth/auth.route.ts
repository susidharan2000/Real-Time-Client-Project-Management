import { Router } from "express";
import { login,logout,refreshToken, checkSession} from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/refresh", refreshToken);
authRouter.post("/checksession", checkSession);
authRouter.post("/logout", logout);