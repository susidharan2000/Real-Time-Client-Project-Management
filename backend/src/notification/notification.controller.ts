
import type { Request, Response } from "express";

import {fetchMyNotifications, markNotificationAsReaded} from "./notification.service";


export async function getNotifications(_req: Request, res: Response) {
    try{
        const userID = res.locals.userId
        const notification = await fetchMyNotifications(userID)
        return res.status(200).json({notification});
    }catch(error){
        return res.status(500).json({ message:"Could Not fetch Notification"});
    }
}

export async function markAsReaded(req: Request, res: Response){
    try{
        const userID = res.locals.userId
        const { notificationIDs } = req.body ?? {};

        if (!Array.isArray(notificationIDs) || notificationIDs.length === 0 || notificationIDs.length > 500){
            return res.status(400).json({
               message: "Provide 1 to 500 valid notification IDs",
            });
        }

        if(!notificationIDs.every(id => typeof id === "string" && /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n)){
            return res.status(400).json({
                message: "valid notification IDs type",
            });
        }

        await markNotificationAsReaded(userID, notificationIDs);
         return res.status(200).json({
         message: "Notifications marked as read",
        });
    }
    catch(error){
        console.error("Failed to mark notifications as read:", error);
    return res.status(500).json({
      message: "Could not mark notifications as read",
    });
    }
}