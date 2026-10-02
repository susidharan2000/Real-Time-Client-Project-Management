import { Request,Response } from "express";
import { Task,TaskInput,TaskStatus,TaskPriority,fetchTaskCount,fetchOverDueTaskCount,fetchTaskCountbyStatus,fetchTask,fetchTaskAssignees,insertTask,updateTask,removeTask,isAuthorized,fetchProjectWithAtleastOneTask,Project,fetchProjectsWithTasksCreatedByMe,fetchProjectsWithTasksAssignedToMe,searchAllTasksService,fetchCreatedTaskCount, fetchCreatedOverdueTaskCount,fetchCreatedTaskCountByStatus,fetchUpcomingTaskByDueDateForManager, UpcomingTask, fetchTasksCreatedByMe } from "./task.service";
export async function getTaskCount(_req: Request, res: Response){
    try{
        const totalTask:number = await fetchTaskCount()
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

export async function getAllTask(_req: Request, res: Response){
    try{
        const tasks:Task[] = await fetchTask()
        return res.status(200).json({  tasks });
    }
    catch(err){
        return res.status(500).json({message:"Counld not fetch Task"})
    }
}

export async function getTaskAssignees(_req: Request, res: Response){
    try{
        const assignees = await fetchTaskAssignees();
        return res.status(200).json({ assignees });
    }catch(err){
        console.error("Failed to fetch assignees:", err);
        return res.status(500).json({ message: "Could not fetch assignees" });
    }
}

export async function addTask(req: Request, res: Response){
    try{
        const input = getTaskInput(req.body);
        if (typeof input === "string") return res.status(400).json({ message: input });
        if (input.due_date && input.due_date.getTime() <= Date.now()) {
            return res.status(400).json({ message: "Due date must be in the future" });
        }
        const userId = res.locals.userId;
        if (!isValidId(userId)) return res.status(401).json({ message: "Invalid access token" });
        if (input.assigned_to !== null && !await isAuthorized(input.assigned_to, ["ADMIN", "PROJECT_MANAGER", "DEVELOPER"])) {
            return res.status(400).json({ message: "Select an active user for assignment" });
        }
        const task = await insertTask(input, String(userId));
        return res.status(201).json({ task });
    }catch(err){
        if (err instanceof Error && "code" in err && err.code === "23503") {
            return res.status(400).json({ message: "The selected project or user no longer exists" });
        }
        console.error("Failed to create task:", err);
        return res.status(500).json({ message: "Could not create task" });
    }
}

export async function editTask(req: Request, res: Response){
    try{
        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).json({ message: "Invalid task ID" });
        const input = getTaskInput(req.body);
        if (typeof input === "string") return res.status(400).json({ message: input });
        if (input.assigned_to !== null && !await isAuthorized(input.assigned_to, ["ADMIN", "PROJECT_MANAGER", "DEVELOPER"])) {
            return res.status(400).json({ message: "Select an active user for assignment" });
        }
        const task = await updateTask(String(id), input);
        if (!task) return res.status(404).json({ message: "Task not found" });
        return res.status(200).json({ task });
    }catch(err){
        if (err instanceof Error && "code" in err && err.code === "23503") {
            return res.status(400).json({ message: "The selected project or user no longer exists" });
        }
        console.error("Failed to update task:", err);
        return res.status(500).json({ message: "Could not update task" });
    }
}

export async function deleteTask(req: Request, res: Response){
    try{
        const id = req.params.id;
        if (!isValidId(id)) return res.status(400).json({ message: "Invalid task ID" });
        const deleted = await removeTask(String(id));
        if (!deleted) return res.status(404).json({ message: "Task not found" });
        return res.status(200).json({ message: "Task deleted successfully" });
    }catch(err){
        console.error("Failed to delete task:", err);
        return res.status(500).json({ message: "Could not delete task" });
    }
}

function isValidId(id: unknown): id is string | number {
    if (typeof id === "number") return Number.isSafeInteger(id) && id > 0;
    return typeof id === "string" && /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n;
}

// Shared validation for the create and revise forms.
function getTaskInput(body: Request["body"]): TaskInput | string {
    const { title, description, project_id, assigned_to, status = "TO_DO", priority = "MEDIUM", due_date } = body ?? {};
    if (typeof title !== "string" || !title.trim()) return "Task name is required";
    if (description != null && typeof description !== "string") return "Invalid task description";
    if (!isValidId(project_id)) return "Select a valid project";
    const assignedTo = assigned_to == null || assigned_to === "" ? null : assigned_to;
    if (assignedTo !== null && !isValidId(assignedTo)) return "Invalid assignee ID";
    if (!["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(status)) return "Invalid task status";
    if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priority)) return "Invalid task priority";
    let dueDate: Date | null = null;
    if (due_date != null && due_date !== "") {
        if (typeof due_date !== "string" || !/(Z|[+-]\d{2}:\d{2})$/i.test(due_date) || !Number.isFinite(Date.parse(due_date))) {
            return "Provide a valid due date with a timezone";
        }
        dueDate = new Date(due_date);
    }
    return {
        title: title.trim(),
        description: description?.trim() || null,
        project_id: String(project_id),
        assigned_to: assignedTo === null ? null : String(assignedTo),
        status: status as TaskStatus,
        priority: priority as TaskPriority,
        due_date: dueDate,
    };
}



export async function getProjectsWithTasksCreatedByMe(_req: Request, res: Response){
    try{
        const userId = res.locals.userId;
        const projects:Project[] = await fetchProjectsWithTasksCreatedByMe(String(userId));
        return res.status(200).json({projects});
    }catch(error){
        return res.status(500).json({ message: "Could not fetch projects with tasks created by you" });
    }
}

export async function getProjectsWithTasksAssignedToMe(_req: Request, res: Response){
    try{
        const userId = res.locals.userId;
        const projects:Project[] = await fetchProjectsWithTasksAssignedToMe(String(userId));
        return res.status(200).json({projects});
    }catch(error){
        return res.status(500).json({ message: "Could not fetch projects with tasks assigned to you" });
    }
}

export async function getProjectWithAtleastOneTask(_req: Request, res: Response){
    try{
        const projects:Project[] = await fetchProjectWithAtleastOneTask()
        return res.status(200).json({projects});
    }catch(error){
        return res.status(500).json({ message: "Could not fetch project with atleast one task" });
    }

}



//search Controller
export async function searchAllTasks(req: Request, res: Response){
    try{
         const { task_name, project_id, status, priority } = req.query;

         for (const value of [task_name, project_id, status, priority]){
            if (value !== undefined && typeof value !== "string") {
                return res.status(400).json({message: "Invalid search filters",});
            }
         }

         const filters = {
            task_name: typeof task_name === "string" ? task_name.trim() : undefined,
            project_id: typeof project_id === "string" ? project_id.trim() : undefined,
            status: typeof status === "string" ? status.trim() : undefined,
            priority: typeof priority === "string" ? priority.trim() : undefined,
         };
         if (filters.project_id === "all") filters.project_id = undefined;
         if (filters.status === "all") filters.status = undefined;
         if (filters.priority === "all") filters.priority = undefined;

         if (filters.project_id && !isValidId(filters.project_id)) {
            return res.status(400).json({message: "Invalid project ID"});
         }
         if (filters.status && !["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(filters.status)) {
            return res.status(400).json({message: "Invalid task status"});
         }
         if (filters.priority && !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(filters.priority)) {
            return res.status(400).json({message: "Invalid task priority"});
         }

         const tasks = await searchAllTasksService(filters);
        return res.status(200).json({ tasks });

    }catch(error){
         return res.status(500).json({ message: "Could not search All Task" });
    }
}

export async function getMyTasksCount(_req: Request, res: Response){
    try{
        const userId = res.locals.userId;
        const totalMyTask = await fetchCreatedTaskCount(String(userId));
        return res.status(200).json({ totalMyTask });
    }catch(error){
        return res.status(500).json({ message: "Could not fetch my task count" });
    }
}

export async function getCreatedOverdueTaskCount(_req: Request, res: Response){
    try{
        const userId:string = res.locals.userId;
        const totalMyOverdueTask = await fetchCreatedOverdueTaskCount(userId);
        return res.status(200).json({ totalMyOverdueTask });
    }catch(error){
        return res.status(500).json({ message: "Could not fetch my overdue task count" });
    }
}


export async function getCreatedTaskCountByStatus(_req: Request, res: Response){
    try{
        const userId:string = res.locals.userId;
        const taskCountByStats = await fetchCreatedTaskCountByStatus(userId);
        return res.status(200).json({  taskCountByStats });
    }catch(err){
        return res.status(500).json({message:"Counld not fetch  Task by Status Count"})
    }
}  


export async function getUpcomingTaskByDueDateCreatedByMe(_req: Request, res: Response){
    try{
        const userId:string = res.locals.userId;
        const upcomingDueTasks: UpcomingTask[] = await fetchUpcomingTaskByDueDateForManager(userId);
        return res.status(200).json({ upcomingDueTasks });
    }catch(error){
        return res.status(500).json({ message: "Could not fetch upcoming due tasks created by you" });
    }
}


export async function searchTasksCreatedByMe(req: Request, res: Response){
    try{
        const userId:string = res.locals.userId; 
        const { task_name, project_id, status, priority } = req.query;
         
         for (const value of [task_name, project_id, status, priority]){
            if (value !== undefined && typeof value !== "string") {
                return res.status(400).json({message: "Invalid search filters",});
            }
         }
         const filters = {
            task_name: typeof task_name === "string" ? task_name.trim() : undefined,
            project_id: typeof project_id === "string" ? project_id.trim() : undefined,
            status: typeof status === "string" ? status.trim() : undefined,
            priority: typeof priority === "string" ? priority.trim() : undefined,
         };
         if (filters.project_id === "all") filters.project_id = undefined;
         if (filters.status === "all") filters.status = undefined;
         if (filters.priority === "all") filters.priority = undefined;

         if (filters.status && !["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(filters.status)) {
            return res.status(400).json({message: "Invalid task status"});
         }
         if (filters.priority && !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(filters.priority)) {
            return res.status(400).json({message: "Invalid task priority"});
         }

        const tasks = await fetchTasksCreatedByMe(filters, userId);
        return res.status(200).json({ tasks });

    }
    catch(error){
        return res.status(500).json({ message: "Could not search tasks created by you" });
    }
}