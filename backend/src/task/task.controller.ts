import { Request,Response } from "express";
import { fetchTaskCount,fetchOverDueTaskCount,fetchTaskCountbyStatus } from "./task.service";
export async function getTaskCount(_req: Request, res: Response){
    try{
        const totalTask = await fetchTaskCount()
        return res.status(200).json({ totalTask });
    }catch(err){
        return res.status(500).json({message:"Counld not fetch Task Count"})
    }

}

export async function getAllOverDueTaskCount(_req: Request, res: Response){
    try{
        const totalOverDueTask = await fetchOverDueTaskCount()
        return res.status(200).json({ totalOverDueTask });
    }catch(err){
        return res.status(500).json({message:"Counld not fetch OverDue Task Count"})
    }
}

export async function getTaskCountByStatus(_req: Request, res: Response){
    try{
        const taskCountByStats = await fetchTaskCountbyStatus()
        return res.status(200).json({  taskCountByStats });
    }catch(err){
        return res.status(500).json({message:"Counld not fetch  Task by Status Count"})
    }
}