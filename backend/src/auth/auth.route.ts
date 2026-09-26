import { Router } from "express";
import { login,logout,refreshToken} from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/refresh", refreshToken);
authRouter.post("/logout", logout);