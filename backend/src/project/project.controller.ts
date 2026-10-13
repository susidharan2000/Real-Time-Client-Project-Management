import { Request,Response } from "express";
import { fetchProjectCount,fetchAllProject,fetchMyProjects,fetchProjectManagers,fetchProjectManager,insertProject,updateProject,removeProject,isAuthorized, fetchManagedProjectCount, Project, UpdateProjectResult, deletedResponse } from "./project.service";
import type { Server } from "socket.io";
export async function getProjectCount(req: Request, res: Response){
    try{
        const totalProject = await fetchProjectCount()
        return res.status(200).json({ totalProject });
    }catch(err){
        return res.status(500).json({message:"Counld not fetch Project Count"})
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
        const io = req.app.locals.io as Server;
        const { title, description, client_id, project_manager_id} = req.body ?? {};

        const role = res.locals.role
        const userId = res.locals.userId 
        const userName:string = res.locals.userName


        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ message: "Project title is required" });
        }
        if (description != null && typeof description !== "string") {
            return res.status(400).json({ message: "Invalid project description" });
        }
        if (!isProjectId(client_id) || (project_manager_id != null && project_manager_id !== "" && !isProjectId(project_manager_id))) {
            return res.status(400).json({ message: "Invalid client or project manager ID" });
        }
        const managerID: string|null = project_manager_id == null || project_manager_id === "" ? null : project_manager_id;
        if (managerID !== null) {
            const managerExists = await isAuthorized(String(managerID), ["PROJECT_MANAGER"]);
            if (!managerExists) {
                return res.status(400).json({ message: "Select an active project manager" });
            }
        }
        if (role === "PROJECT_MANAGER"&&  managerID !== null && String(userId) !== String(managerID)){
            return res.status(403).json({message: "Project managers can only assign themselves",}); 
        }

        const createdBy = res.locals.userId;
        const project = await insertProject(userId,userName,title.trim(), description?.trim() || null, String(client_id), String(createdBy), managerID === null ? null : managerID);
        
        try {
          //Admin
          io.to("admins").emit("project:created");
          io.to("admins").emit("notification:created");
          //project Manager
          if (project.created_by) {
            io.to(`user:${project.created_by}`).emit("project:created");
            io.to(`user:${project.created_by}`).emit("notification:created");
          }
        } catch (error) {
          console.error("Project created, but live feed failed:", error);
        }
        return res.status(201).json({ project });

    }catch(err){
        if (err instanceof Error && "code" in err && err.code === "23503") {
            return res.status(400).json({ message: "The selected client or user no longer exists" });
        }
        console.error("Failed to create project:", err);
        return res.status(500).json({ message: "Could not create project" });
    }
}

export async function editProject(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const { title, description, client_id, project_manager_id } =
      req.body ?? {};

    const io = req.app.locals.io as Server;
    const userId:string = res.locals.userId 
    const role:string = res.locals.role;
    const userName:string = res.locals.userName

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Project title is required" });
    }
    if (description != null && typeof description !== "string") {
      return res.status(400).json({ message: "Invalid project description" });
    }
    if (!isProjectId(id) || !isProjectId(client_id) || (project_manager_id != null && project_manager_id !== "" && !isProjectId(project_manager_id))) {
      return res.status(400).json({ message: "Invalid project, client or manager ID" });
    }
    const managerId: string | null =
      project_manager_id == null || project_manager_id === ""
        ? null
        : project_manager_id;
    if (managerId !== null) {
      const managerExists = await isAuthorized(String(managerId), [
        "PROJECT_MANAGER",
      ]);
      if (!managerExists) {
        return res
          .status(400)
          .json({ message: "Select an active project manager" });
      }
    }
    if (role === "PROJECT_MANAGER" && managerId !== null && String(userId) !== String(managerId)) {
      return res.status(403).json({
        message: "Project managers can only edit their Projects",
      });
    }

    const updateResult:UpdateProjectResult|null = await updateProject(userId,userName,String(id),title.trim(),description?.trim() || null,String(client_id),managerId === null ? null : String(managerId),String(userId));
    if (!updateResult) {
      return res.status(404).json({
        message: "Project not found or you do not have permission to edit it",
      });
    }

    try {
      //Emit event
      //Admin
      io.to("admins").emit("project:updated");
      io.to("admins").emit("notification:created");
      io.to(`user:${updateResult.project.created_by}`).emit("project:updated");
      io.to(`user:${updateResult.project.created_by}`).emit("notification:created");
    } catch (error) {
      console.error("Project updated, but live feed failed:", error);
    }

    return res.status(200).json({ project: updateResult.project });
    
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "23503") {
      return res
        .status(400)
        .json({ message: "The selected client or user no longer exists" });
    }
    console.error("Failed to update project:", err);
    return res.status(500).json({ message: "Could not update project" });
  }
}

export async function deleteProject(req: Request, res: Response) {
  try {
    const id = req.params.id;
    if (typeof id !== "string" || !isProjectId(id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    const project_id: string = id;

    const io = req.app.locals.io as Server;
    const userId:string = res.locals.userId;
    const userName:string = res.locals.userName

    const deletedProject:deletedResponse | null = await removeProject(project_id, userId,userName);
    if ( !deletedProject ||  !deletedProject.project) {
      return res
        .status(404)
        .json({ message: "Project not found or you are not its creator" });
    }

    try{
    //Emit Event 
    //admin
    io.to("admins").emit("project:deleted");
    io.to("admins").emit("notification:created");
    //project Manager
    const projectManagerID = deletedProject.project.created_by;
    io.to(`user:${projectManagerID}`).emit("project:deleted");
    io.to(`user:${projectManagerID}`).emit("notification:created");

    }catch(error){
        console.error("Project deleted, but live feed failed:", error);
    }

    return res.status(200).json({ message: "Project deleted successfully" });
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "23503") {
      return res
        .status(409)
        .json({ message: "Project is referenced by other records" });
    }
    console.error("Failed to delete project:", err);
    return res.status(500).json({ message: "Could not delete project" });
  }
}

function isProjectId(value: unknown): boolean {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0;
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n;
}
