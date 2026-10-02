import { Request,Response } from "express";
import { fetchProjectCount,fetchAllProject,fetchMyProjects,fetchProjectManagers,insertProject,updateProject,removeProject,isAuthorized, fetchManagedProjectCount } from "./project.service";

export async function getProjectCount(req: Request, res: Response){
    try{
        const totalProject = await fetchProjectCount()
        return res.status(200).json({ totalProject });
    }catch(err){
        return res.status(500).json({message:"Counld not fetch Project Count"})
    }

}

export async function getAllProject(_req: Request, res: Response){
    try{
        const projects = await fetchAllProject()
        return res.status(200).json({projects});
    }
    catch(err){
         return res.status(500).json({message:"Counld not fetch Project"})
    }
}

export async function getMyProjects(_req: Request, res: Response){
    try{
        const userId:string = res.locals.userId;
        const projects = await fetchMyProjects(userId);
        return res.status(200).json({projects});
    }catch(err){
        return res.status(500).json({message:"Could not fetch your projects"});
    }
}

export async function getProjectManagers(_req: Request, res: Response){
    try{
        const managers = await fetchProjectManagers();
        return res.status(200).json({ managers });
    }catch(err){
        console.error("Failed to fetch project managers:", err);
        return res.status(500).json({ message: "Could not fetch project managers" });
    }
}

export async function addProject(req: Request, res: Response){
    try{
        const { title, description, client_id, project_manager_id} = req.body ?? {};
        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ message: "Project title is required" });
        }
        if (description != null && typeof description !== "string") {
            return res.status(400).json({ message: "Invalid project description" });
        }
        const managerId = project_manager_id == null || project_manager_id === "" ? null : project_manager_id;
        if (managerId !== null) {
            const managerExists = await isAuthorized(String(managerId), ["PROJECT_MANAGER"]);
            if (!managerExists) {
                return res.status(400).json({ message: "Select an active project manager" });
            }
        }
        const createdBy = res.locals.userId;

        const project = await insertProject(title.trim(), description?.trim() || null, String(client_id), String(createdBy), managerId === null ? null : String(managerId));
        return res.status(201).json({ project });
    }catch(err){
        if (err instanceof Error && "code" in err && err.code === "23503") {
            return res.status(400).json({ message: "The selected client or user no longer exists" });
        }
        console.error("Failed to create project:", err);
        return res.status(500).json({ message: "Could not create project" });
    }
}

export async function editProject(req: Request, res: Response){
    try{
        const id = req.params.id;
        const { title, description, client_id, project_manager_id } = req.body ?? {};
        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ message: "Project title is required" });
        }
        if (description != null && typeof description !== "string") {
            return res.status(400).json({ message: "Invalid project description" });
        }
        const managerId = project_manager_id == null || project_manager_id === "" ? null : project_manager_id;
        if (managerId !== null) {
            const managerExists = await isAuthorized(String(managerId), ["PROJECT_MANAGER"]);
            if (!managerExists) {
                return res.status(400).json({ message: "Select an active project manager" });
            }
        }

        const userId = res.locals.userId;
        const project = await updateProject(String(id), title.trim(), description?.trim() || null, String(client_id), managerId === null ? null : String(managerId), String(userId));
        if (!project) {
            return res.status(404).json({ message: "Project not found or you do not have permission to edit it" });
        }
        return res.status(200).json({ project });
    }catch(err){
        if (err instanceof Error && "code" in err && err.code === "23503") {
            return res.status(400).json({ message: "The selected client or user no longer exists" });
        }
        console.error("Failed to update project:", err);
        return res.status(500).json({ message: "Could not update project" });
    }
}

export async function deleteProject(req: Request, res: Response){
    try{
        const id = req.params.id;
        const userId = res.locals.userId;
        const deleted = await removeProject(String(id), String(userId));
        if (!deleted) {
            return res.status(404).json({ message: "Project not found or you are not its creator" });
        }
        return res.status(200).json({ message: "Project deleted successfully" });
    }catch(err){
        if (err instanceof Error && "code" in err && err.code === "23503") {
            return res.status(409).json({ message: "Project is referenced by other records" });
        }
        console.error("Failed to delete project:", err);
        return res.status(500).json({ message: "Could not delete project" });
    }
}


export async function getMyProjectCount(_req: Request, res: Response){
    try{
        const userID = res.locals.userId;
        const myProjectCount = await fetchManagedProjectCount(String(userID));
        return res.status(200).json({myProjectCount: myProjectCount});
    }
    catch(err){
        return res.status(500).json({message:"Could not fetch your project count"});
    }
}