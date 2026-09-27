import { Request,Response } from "express";
import { fetchProjectCount } from "./project.service";
export async function getProjectCount(req: Request, res: Response){
    try{
        const totalProject = await fetchProjectCount()
        return res.status(200).json({ totalProject });
    }catch(err){
        return res.status(500).json({message:"Counld not fetch Project Count"})
    }

}
