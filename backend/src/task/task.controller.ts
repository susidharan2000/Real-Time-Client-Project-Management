import { Request,Response } from "express";
import type { Server } from "socket.io";
import { fetchCreatedTaskCountByPriority } from "./task.service";

export async function getCreatedTaskCountByPriority(_req: Request, res: Response) {
    try {
        const userId: string = res.locals.userId;
        const taskByPriority = await fetchCreatedTaskCountByPriority(userId);
        return res.status(200).json({ taskByPriority });
    } catch (error) {
        console.error("Failed to fetch task counts by priority:", error);
        return res.status(500).json({ message: "Could not fetch task counts by priority" });
    }
}
import { updateAssignedTaskStatus } from "./task.service";

import { Task,TaskInput,TaskStatus,TaskPriority,fetchTaskCount,fetchOverDueTaskCount,fetchTaskCountbyStatus,fetchTask,fetchTaskAssignees,insertTask,updateTask,removeTask,isAuthorized,fetchProjectWithAtleastOneTask,Project,fetchProjectsWithTasksCreatedByMe,fetchProjectsWithTasksAssignedToMe,searchAllTasksService,fetchCreatedTaskCount, fetchCreatedOverdueTaskCount,fetchCreatedTaskCountByStatus,fetchUpcomingTaskByDueDateForManager, UpcomingTask, fetchTasksCreatedByMe, fetchAssignedTaskCount ,fetchAssignedOverdueTaskCount,fetchAssignedTaskCountByStatusCount,fetchUpcomingAssignedTasks,fetchTasksAssignedToMe, TaskCounts, UpdatedTask, DeletedTask} from "./task.service";
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
        const taskCountByStats:TaskCounts = await fetchTaskCountbyStatus()
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

//Create the Task
//creators - ADMIN, PROJECT_MANAGER
//Reciver - ADMIN(TASK Assigned to the User_Name by Actor_Name in the Project Project_Name),
//          PROJECT_MANAGER (TASK Assigned to the User_Name by Actor_Name in the Project Project_Name)
//          DEVELOPER (you are Assigned a new Task #task_id)
export async function addTask(req: Request, res: Response){
    try{
        const io = req.app.locals.io as Server;
        const input = getTaskInput(req.body);
        if (typeof input === "string") return res.status(400).json({ message: input });
        if (input.due_date && input.due_date.getTime() <= Date.now()) {
            return res.status(400).json({ message: "Due date must be in the future" });
        }
        const userId = res.locals.userId;
        const actorName:string = res.locals.userName;
        //const actorRole:string = res.locals.role
        if (!isValidId(userId)) return res.status(401).json({ message: "Invalid access token" });
        if (input.assigned_to !== null && !await isAuthorized(input.assigned_to, ["DEVELOPER"])) {
            return res.status(400).json({ message: "Select an active user for assignment" });
        }
        const newTask = await insertTask(input, String(userId), actorName);
        if (!newTask) return res.status(404).json({ message: "Project not found or you do not have permission to create tasks in it" });

        //Emit Events
        try {
            //Admin
            io.to("admins").emit("task:created");
            io.to("admins").emit("notification:created");
            //Project Manager
            const projectManagerID: string|null = newTask.project_creator_id
            if(projectManagerID){
                io.to(`user:${projectManagerID}`).emit("task:created");
                io.to(`user:${projectManagerID}`).emit("notification:created");
            }
            //Developer
            const assignedDeveloperID: string|null = newTask.assigned_to
            if (assignedDeveloperID){
                io.to(`user:${assignedDeveloperID}`).emit("task:assigned");
                io.to(`user:${assignedDeveloperID}`).emit("notification:created");
            }
        } catch (eventError) {
            console.error("Task created, but live updates failed:", eventError);
        }

        return res.status(201).json({ task: { task_id: newTask.task_id } });
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
        const io = req.app.locals.io as Server;
        const id= req.params.id;
        if(typeof id !== "string" || !id){
            return res.status(400).json({message:"Invalid Task ID"});
        }
        const task_id:string = id;

        const userId = res.locals.userId

        if (!isValidId(task_id)) return res.status(400).json({ message: "Invalid task ID" });
        const input = getTaskInput(req.body);
        if (typeof input === "string") return res.status(400).json({ message: input });
        if (input.assigned_to !== null && !await isAuthorized(input.assigned_to, ["DEVELOPER"])) {
            return res.status(400).json({ message: "Select an active user for assignment" });
        }
        const task:UpdatedTask | null = await updateTask(userId,task_id, input);
        if (!task) return res.status(404).json({ message: "Task not found" });

        //Emit Event
        try{
            //Admin
            io.to("admins").emit("task:updated");
            io.to("admins").emit("notification:created");
            //project Manager
            if(task.project_creator_id){
                io.to(`user:${task.project_creator_id}`).emit("task:updated");
                io.to(`user:${task.project_creator_id}`).emit("notification:created");
            }
            //developers
            if(task.assigneeChanged && task.previous_assigned_to){
                io.to(`user:${task.previous_assigned_to}`).emit("task:removed");
                io.to(`user:${task.previous_assigned_to}`).emit("notification:created");
            }
            if(task.assigned_to){
                io.to(`user:${task.assigned_to}`).emit(task.assigneeChanged ? "task:assigned" : "task:updated");
                io.to(`user:${task.assigned_to}`).emit("notification:created");
            }
        }catch(error){
            console.error("Task updated, but live updates failed:", error);
        }

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
        const userId = res.locals.userId
        if(typeof id !== "string" || !id){
            return res.status(400).json({message:"Invalid Task ID"});
        }
        const taskID:string = id
        const io = req.app.locals.io as Server;

        if (!isValidId(taskID)) return res.status(400).json({ message: "Invalid task ID" });
        const deletedTask: DeletedTask|null = await removeTask(userId,taskID);
        if (!deletedTask) return res.status(404).json({ message: "Task not found" });

        //Emit Event
        try{
            //Admins
            io.to("admins").emit("task:deleted");
            io.to("admins").emit("notification:created");;
            //Project Manager
            const projectManagerID:string|null = deletedTask.project_creator_id
            if(projectManagerID){
                io.to(`user:${projectManagerID}`).emit("task:deleted");
                io.to(`user:${projectManagerID}`).emit("notification:created");
            }
            //Developer
            const developerID:string|null = deletedTask.assigned_to;
            if (developerID){
                io.to(`user:${developerID}`).emit("task:removed");
                io.to(`user:${developerID}`).emit("notification:created");
            }

        }catch(error){
            console.error("Task Deleted, but live updates failed:", error);
        }

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
    const dueDates = getDueDateFilters(req.query);
    if (typeof dueDates === "string") return res.status(400).json({ message: dueDates });

    try{
         const { task_name, project_id, status, priority } = req.query;

         for (const value of [task_name, project_id, status, priority]){
            if (value !== undefined && typeof value !== "string") {
                return res.status(400).json({message: "Invalid search filters",});
            }
         }

         const filters = {
            ...dueDates,
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
    const dueDates = getDueDateFilters(req.query);
    if (typeof dueDates === "string") return res.status(400).json({ message: dueDates });

    try{
        const userId:string = res.locals.userId; 
        const { task_name, project_id, status, priority } = req.query;
         
         for (const value of [task_name, project_id, status, priority]){
            if (value !== undefined && typeof value !== "string") {
                return res.status(400).json({message: "Invalid search filters",});
            }
         }
         const filters = {
            ...dueDates,
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


export async function getAssignedTaskCount(_req: Request, res: Response){
    try{
        const userId:string = res.locals.userId;
        const totalAssignedTask = await fetchAssignedTaskCount(userId);
        return res.status(200).json({ totalAssignedTask });
    }catch(error){
        return res.status(500).json({ message: "Could not fetch assigned task count" });
    }
}

export async function getAssignedOverdueTaskCount(_req: Request, res: Response){
    try{
        const userId:string = res.locals.userId;
        const totalAssignedOverdueTask = await fetchAssignedOverdueTaskCount(userId);
        return res.status(200).json({ totalAssignedOverdueTask });
    }catch(error){
        return res.status(500).json({ message: "Could not fetch assigned overdue task count" });
    }
}

export async function getAssignedTaskCountByStatusCount(_req: Request, res: Response){
    try{
        const userId:string = res.locals.userId;
        const taskCounts:TaskCounts = await fetchAssignedTaskCountByStatusCount(userId);
        return res.status(200).json({ taskCounts });
    }catch(error){
        return res.status(500).json({ message: "Could not fetch assigned task count by status" });
    }
}


export async function getUpcomingAssignedTasks(_req: Request, res: Response){
    try{
        const userId:string = res.locals.userId;
        const tasks:Task[] = await fetchUpcomingAssignedTasks(userId);
        return res.status(200).json({ tasks });
    }
    catch(error){
        return res.status(500).json({ message: "Could not fetch assigned tasks" });
    }
}

export async function searchTasksAssignedToMe(req:Request, res: Response){
    const dueDates = getDueDateFilters(req.query);
    if (typeof dueDates === "string") return res.status(400).json({ message: dueDates });

    const userId:string = res.locals.userId;
    let { task_name, project_id, status, priority } = req.query;


    for(let value of [task_name, project_id, status, priority]){
            if (typeof value  !== "string" && value !== undefined){
                return res.status(500).json({message:"Invalid Filter Types"})
            }
    }

    if (typeof status === "string"  && !["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(status)) {
        return res.status(400).json({ message: "Invalid task status" });
    }

    if (typeof priority === "string"  && !["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priority)) {
        return res.status(400).json({message: "Invalid task priority"});
    }

    task_name === "all" && (task_name = undefined)
    project_id === "all" && (project_id = undefined)
    status === "all" && (status = undefined)
    priority === "all" && (priority = undefined)

    const filter = {
        ...dueDates,
        task_name: typeof task_name === "string"?task_name:undefined,
        project_id:typeof project_id === "string"?project_id:undefined,
        status:typeof status === "string"?status:undefined,
        priority:typeof priority === "string"?priority:undefined
    }


    const tasks: Task[] = await fetchTasksAssignedToMe(userId, filter);
    return res.status(200).json({ tasks });

}


export async function startTask(req: Request, res: Response) {
    return changeAssignedTaskStatus(req, res, "TO_DO", "IN_PROGRESS");
}

export async function submitTaskForReview(req: Request, res: Response) {
    return changeAssignedTaskStatus(req, res, "IN_PROGRESS", "IN_REVIEW");
}

async function changeAssignedTaskStatus(req: Request, res: Response, previousStatus: TaskStatus, newStatus: TaskStatus) {
    try {
        const id = req.params.id;
        if (typeof id !== "string" || !isValidId(id)) {
            return res.status(400).json({ message: "Invalid task ID" });
        }
        const userId: string = res.locals.userId;
        const task = await updateAssignedTaskStatus(userId, id, previousStatus, newStatus);
        if (!task) {
            return res.status(404).json({ message: "Task not found or not assigned to you" });
        }
        if (task === "INVALID_STATUS") {
            return res.status(409).json({ message: `Task must be ${previousStatus} to move to ${newStatus}` });
        }

        try {
            const io = req.app.locals.io as Server;
            io.to("admins").emit("task:updated");
            io.to("admins").emit("notification:created");
            if (task.project_creator_id) {
                io.to(`user:${task.project_creator_id}`).emit("task:updated");
                io.to(`user:${task.project_creator_id}`).emit("notification:created");
            }
            io.to(`user:${userId}`).emit("task:updated");
            io.to(`user:${userId}`).emit("notification:created");
        } catch (error) {
            console.error("Task status updated, but live updates failed:", error);
        }
        return res.status(200).json({ task });
    } catch (error) {
        console.error("Failed to update assigned task status:", error);
        return res.status(500).json({ message: "Could not update task status" });
    }
}

// Date-only search bounds are UTC calendar dates; due_to includes the whole day.
function getDueDateFilters(query: Request["query"]): { due_from?: string; due_to?: string } | string {
    const { due_from, due_to } = query;
    for (const value of [due_from, due_to]) {
        if (value === undefined) continue;
        if (typeof value !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) {
            return "Due dates must use YYYY-MM-DD";
        }
        const date = new Date(`${value}T00:00:00.000Z`);
        if (value.startsWith("0000") || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
            return "Invalid due date";
        }
    }
    if (typeof due_from === "string" && typeof due_to === "string" && due_from > due_to) {
        return "Due from must be on or before Due to";
    }
    return {
        due_from: typeof due_from === "string" ? due_from : undefined,
        due_to: typeof due_to === "string" ? due_to : undefined,
    };
}
