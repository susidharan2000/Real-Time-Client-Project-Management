
import type { Request, Response } from "express";

import {fetchMyNotifications} from "./notification.service";


export async function getNotifications(_req: Request, res: Response) {
    try{
        const userID = res.locals.userId
        const notification = await fetchMyNotifications(userID)
        return res.status(200).json({notification});
    }catch(error){
        return res.status(500).json({ message:"Could Not fetch Notification"});
    }
}