import { API_URL } from "../api";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import axios from "axios";
import type { Socket } from "socket.io-client";

type Status = "TO_DO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Task = {
    task_id: string;
    title: string;
    description: string | null;
    project_id: string;
    project_title: string;
    assigned_to_userid: string | null;
    assigned_to_user_name: string | null;
    created_by_userid: string;
    created_by_user_name: string;
    status: Status;
    priority: Priority;
    due_date: string | null;
    is_overdue: boolean;
}

type ProjectOption = { project_id: string; project_title: string };

type DeveloperTaskProp = {
  accessToken :string;
  socket: Socket | null;
}

export default function DeveloperTasks({accessToken,socket}:DeveloperTaskProp) {
  const URL = API_URL;

  //serach Params
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedDueFrom = searchParams.get("due_from") ?? "";
  const appliedDueTo = searchParams.get("due_to") ?? "";
  const [dueFromFilter,setDueFromFilter] = useState(appliedDueFrom);
  const [dueToFilter,setDueToFilter] = useState(appliedDueTo);
  const [dateFilterError,setDateFilterError] = useState("");
  const overdue = searchParams.get("overdue") === "true";
  const appliedTaskName = searchParams.get("task_name") ?? "";
  const appliedProjectId = searchParams.get("project_id") ?? "";
  const appliedStatus = searchParams.get("status") ?? "";
  const appliedPriority = searchParams.get("priority") ?? "";

  //Task List State
  const [loading,setLoading] = useState(true)
  const [listError,setListError] = useState("")
  const [tasks,setTasks] = useState<Task[]>([])
  const [projects,setProjects] = useState<ProjectOption[]>([])
  const [projectsError,setProjectsError] = useState("")
  const [taskListRefresh,setTaskListRefresh] = useState(0)
  const [updatingTaskId,setUpdatingTaskId] = useState<string | null>(null)
  const [statusError,setStatusError] = useState("")
  const [statusMessage,setStatusMessage] = useState("")
  const [selectedTaskId,setSelectedTaskId] = useState<string | null>(null)
  const detailsRef = useRef<HTMLDialogElement>(null)
  const selectedTask = tasks.find(task => task.task_id === selectedTaskId)

  useEffect(() => {
    if (!selectedTask) return;
    const dialog = detailsRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedTask?.task_id]);

  //filter States
  const [taskNameFilter,setTaskNameFilter] = useState(appliedTaskName)
  const [projectIdFilter,setProjectIdFilter] = useState(appliedProjectId)
  const [statusFilter,setStatusFilter] = useState(appliedStatus)
  const [priorityFilter,setPriorityFilter] = useState(appliedPriority)

  // Keep the filter fields in sync with browser navigation.
  const filterKey = JSON.stringify([appliedTaskName,appliedProjectId,appliedStatus,appliedPriority, appliedDueFrom, appliedDueTo]);
  const [previousFilterKey,setPreviousFilterKey] = useState(filterKey);
  if(previousFilterKey !== filterKey){
    setPreviousFilterKey(filterKey)
    setDueFromFilter(appliedDueFrom);
    setDueToFilter(appliedDueTo);
    setDateFilterError("");
    setTaskNameFilter(appliedTaskName)
    setProjectIdFilter(appliedProjectId)
    setStatusFilter(appliedStatus)
    setPriorityFilter(appliedPriority)
  }

  // Fetch projects that contain tasks assigned to this developer.
  useEffect(() =>{
    const controller = new AbortController();
    async function fetchProjects(){
      try {
        setProjectsError("")
        const response = await axios.get<{projects: ProjectOption[]}>(`${URL}/task/assigned-to-me/projects`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setProjects(response.data.projects)
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch assigned task projects:", error)
        setProjectsError("Could not load projects")
      }
    }
    if(accessToken) fetchProjects()
    return () => controller.abort();
  },[accessToken,taskListRefresh])

  //Live task updates keep the currently applied filters.
  useEffect(() => {
    if (!socket || !accessToken) return;
    const refreshTaskList = () => {
      setTaskListRefresh(current => current + 1);
    };
    socket.on("task:assigned", refreshTaskList);
    socket.on("task:removed", refreshTaskList);
    socket.on("task:updated", refreshTaskList);
    return () => {
      socket.off("task:assigned", refreshTaskList);
      socket.off("task:removed", refreshTaskList);
      socket.off("task:updated", refreshTaskList);
    };
  }, [socket, accessToken]);

  // Fetch the task list when the applied filters change.
  useEffect(() =>{
    const controller = new AbortController();
    async function fetchTasks(){
      setLoading(true)
      setListError("")
      try {
        const response = await axios.get<{tasks: Task[]}>(`${URL}/task/assigned-to-me/search`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
          params: {
            due_from: appliedDueFrom || undefined,
            due_to: appliedDueTo || undefined,
            task_name: appliedTaskName || undefined,
            project_id: appliedProjectId || undefined,
            status: appliedStatus || undefined,
            priority: appliedPriority || undefined,
          },
        });
        if(!controller.signal.aborted) setTasks(response.data.tasks)
      } catch (error) {
        if(controller.signal.aborted) return;
        console.error("Failed to fetch assigned tasks:", error)
        setListError("Could not load your tasks")
      } finally {
        if(!controller.signal.aborted) setLoading(false)
      }
    }
    if(accessToken){
      fetchTasks()
    }
    return () => controller.abort();
  },[accessToken,appliedTaskName,appliedProjectId,appliedStatus,appliedPriority, appliedDueFrom, appliedDueTo,taskListRefresh])

  async function handleTaskStatusChange(task: Task){
    if (updatingTaskId || !accessToken) return;
    if (task.status !== "TO_DO" && task.status !== "IN_PROGRESS") return;
    const action = task.status === "TO_DO" ? "start" : "submit-review";
    setUpdatingTaskId(task.task_id)
    setStatusError("")
    setStatusMessage("")
    try {
      await axios.patch(`${URL}/task/${task.task_id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setStatusMessage(task.status === "TO_DO" ? "Task started." : "Task submitted for review.")
      setTaskListRefresh(current => current + 1)
    } catch (error) {
      console.error("Failed to change task status:", error)
      setStatusError(axios.isAxiosError<{message: string}>(error)
        ? error.response?.data?.message ?? "Could not update task status"
        : "Could not update task status")
      if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 409)) {
        setTaskListRefresh(current => current + 1)
      }
    } finally {
      setUpdatingTaskId(null)
    }
  }

  function handleSearch(){
    if (dueFromFilter && dueToFilter && dueFromFilter > dueToFilter) {
      setDateFilterError("Due from must be on or before Due to.");
      return;
    }
    setDateFilterError("");
    const params = new URLSearchParams();
    if (dueFromFilter) params.set("due_from", dueFromFilter);
    if (dueToFilter) params.set("due_to", dueToFilter);
    if(overdue) params.set("overdue","true")
    if(taskNameFilter.trim()) params.set("task_name",taskNameFilter.trim())
    if(projectIdFilter) params.set("project_id",projectIdFilter)
    if(statusFilter) params.set("status",statusFilter)
    if(priorityFilter) params.set("priority",priorityFilter)
    setSearchParams(params)
    setTaskListRefresh((current) => current + 1)
  }

  function handleClearFilters(){
    setDueFromFilter("");
    setDueToFilter("");
    setDateFilterError("");
    setTaskNameFilter("")
    setProjectIdFilter("")
    setStatusFilter("")
    setPriorityFilter("")
    setSearchParams(overdue ? { overdue: "true" } : {})
    setTaskListRefresh((current) => current + 1)
  }

  const visibleTasks = overdue ? tasks.filter((task) => task.is_overdue) : tasks;

  return (
    <section className="flex min-h-[calc(100dvh-5rem)] flex-col bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 sm:py-8" aria-labelledby="developer-tasks-title">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <Link to="/" className="rounded text-slate-500 hover:text-emerald-800">Dashboard</Link>
          <span aria-hidden="true" className="text-slate-300">/</span>
          <span aria-current="page" className="font-medium text-slate-800">{overdue ? "Overdue tasks" : "My tasks"}</span>
        </nav>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Your workspace</p>
          <h1 id="developer-tasks-title" className="text-3xl font-bold tracking-tight sm:text-4xl">{overdue ? "Overdue tasks" : "My tasks"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{overdue ? "Keep track of assigned work past its due date." : "See your assigned work, priorities, and deadlines in one place."}</p>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Task views">
          <Link to="/DeveloperTasks" aria-current={!overdue ? "page" : undefined} className={`rounded-xl px-4 py-2 text-sm font-semibold ${!overdue ? "bg-emerald-800 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}>All assigned</Link>
          <Link to="/DeveloperTasks?overdue=true" aria-current={overdue ? "page" : undefined} className={`rounded-xl px-4 py-2 text-sm font-semibold ${overdue ? "bg-rose-700 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}>Overdue</Link>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold">{overdue ? "Overdue task list" : "Assigned task list"}</h2>
            <p className="mt-1 text-xs text-slate-500">Tasks, projects, priorities, and due dates</p>
          </div>

          <div className="grid gap-4 border-b border-slate-200 px-5 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-4 xl:items-end">
            <label htmlFor="developer-task-search" className="text-sm font-medium text-slate-600">Search tasks
              <input id="developer-task-search" type="search" value={taskNameFilter} onChange={(event) => setTaskNameFilter(event.target.value)} placeholder="Search by task name…" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-emerald-600" />
            </label>
            <label htmlFor="developer-task-project" className="text-sm font-medium text-slate-600">Project
              <select id="developer-task-project" value={projectIdFilter} onChange={(event) => setProjectIdFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600">
                <option value="">All projects</option>
                {projects.map((project) => <option key={project.project_id} value={project.project_id}>{project.project_title}</option>)}
              </select>
              {projectsError && <span className="mt-1 block text-xs text-red-700">{projectsError}</span>}
            </label>
            <label htmlFor="developer-task-status" className="text-sm font-medium text-slate-600">Status
              <select id="developer-task-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600">
                <option value="">All statuses</option>
                <option value="TO_DO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="IN_REVIEW">In review</option>
                <option value="DONE">Done</option>
              </select>
            </label>
            <label htmlFor="developer-task-priority" className="text-sm font-medium text-slate-600">Priority
              <select id="developer-task-priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600">
                <option value="">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </label>
            <label htmlFor="developer-task-due-from-filter" className="text-sm font-medium text-slate-600">Due from (UTC)
              <input id="developer-task-due-from-filter" type="date" value={dueFromFilter} max={dueToFilter || undefined} onChange={(event) => { setDueFromFilter(event.target.value); setDateFilterError(""); }} className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600" />
            </label>
            <label htmlFor="developer-task-due-to-filter" className="text-sm font-medium text-slate-600">Due to (UTC)
              <input id="developer-task-due-to-filter" type="date" value={dueToFilter} min={dueFromFilter || undefined} onChange={(event) => { setDueToFilter(event.target.value); setDateFilterError(""); }} className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600" />
            </label>
            <div className="flex items-center gap-2 self-end xl:col-span-2 xl:justify-end">
              <button type="button" onClick={handleSearch} className="min-h-11 rounded-xl bg-emerald-800 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:cursor-pointer hover:bg-emerald-700">Search</button>
              <button type="button" onClick={handleClearFilters} className="min-h-11 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:cursor-pointer hover:bg-slate-100">Clear filters</button>
            </div>
          </div>

          {statusError && <p role="alert" className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">{statusError}</p>}
          {statusMessage && <p role="status" className="border-b border-emerald-100 bg-emerald-50 px-6 py-3 text-sm text-emerald-800">{statusMessage}</p>}

          {dateFilterError && <p role="alert" className="px-6 py-3 text-sm text-red-700">{dateFilterError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <caption className="sr-only">{overdue ? "Overdue tasks" : "Assigned tasks"}</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-4">Task</th>
                  <th scope="col" className="px-6 py-4">Project</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4">Priority</th>
                  <th scope="col" className="px-6 py-4">Due date</th>
                  <th scope="col" className="px-6 py-4">Assigned by</th>
                  <th scope="col" className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-500">Loading tasks…</td></tr>
                ) : listError ? (
                  <tr><td colSpan={7} className="px-6 py-16 text-center text-red-700" role="alert">{listError}</td></tr>
                ) : visibleTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700" aria-hidden="true">
                        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4H5v17h14V4h-4M9 2h6v4H9ZM8 12l2 2 5-5" /></svg>
                      </span>
                      <p className="mt-4 font-semibold text-slate-800">{overdue ? "No overdue tasks" : "No assigned tasks"}</p>
                      <p className="mt-1 text-sm text-slate-500">{overdue ? "You're caught up on overdue work." : "Tasks assigned to you will appear here."}</p>
                    </td>
                  </tr>
                ) : visibleTasks.map((task) => (
                  <tr key={task.task_id} onClick={() => setSelectedTaskId(task.task_id)} className="cursor-pointer border-b border-slate-200 last:border-b-0 hover:bg-slate-50/70">
                    <th scope="row" className="px-6 py-5 font-semibold text-slate-900">
                      <button type="button" aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); setSelectedTaskId(task.task_id); }} className="max-w-64 cursor-pointer break-words rounded text-left hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">{task.title}</button>
                      {task.description && <p className="mt-1 max-w-64 truncate text-xs font-normal text-slate-500" title={task.description}>{task.description}</p>}
                    </th>
                    <td className="px-6 py-5 text-slate-600">{task.project_title}</td>
                    <td className="px-6 py-5"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{task.status.replaceAll("_", " ")}</span></td>
                    <td className="px-6 py-5 text-slate-600">{task.priority}</td>
                    <td className="px-6 py-5 text-slate-600">
                      {task.due_date ? new Date(task.due_date).toLocaleString() : "No due date"}
                      {task.is_overdue && <span className="mt-1 block text-xs font-semibold text-red-700">Overdue</span>}
                    </td>
                    <td className="px-6 py-5 text-slate-600">{task.created_by_user_name}</td>
                    <td onClick={(event) => event.stopPropagation()} className="px-6 py-5 text-right">
                      {task.status === "TO_DO" || task.status === "IN_PROGRESS" ? (
                        <button type="button" onClick={() => handleTaskStatusChange(task)} disabled={updatingTaskId !== null || !accessToken}
                          aria-label={`${task.status === "TO_DO" ? "Start task" : "Submit for review"}: ${task.title}`}
                          className="min-h-11 whitespace-nowrap rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:cursor-pointer hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                          {updatingTaskId === task.task_id ? "Updating…" : task.status === "TO_DO" ? "Start task" : "Submit for review"}
                        </button>
                      ) : (
                        <span className="whitespace-nowrap text-xs text-slate-500">{task.status === "IN_REVIEW" ? "Awaiting review" : "Completed"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {selectedTask && (
        <dialog ref={detailsRef} aria-labelledby="developer-task-details-title"
          onCancel={(event) => { event.preventDefault(); setSelectedTaskId(null); }}
          onClick={(event) => { if (event.target === event.currentTarget) setSelectedTaskId(null); }}
          className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
          <div>
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Task #{selectedTask.task_id}</p>
                <h2 id="developer-task-details-title" className="text-xl font-bold [overflow-wrap:anywhere]">{selectedTask.title}</h2>
              </div>
              <button type="button" autoFocus onClick={() => setSelectedTaskId(null)} aria-label="Close task details" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-700">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
              </button>
            </div>
            <div className="space-y-6 px-6 py-6">
              <dl className="grid gap-5 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <div><dt className="text-xs text-slate-500">Project</dt><dd className="mt-1 break-words text-sm font-semibold">{selectedTask.project_title}</dd></div>
                <div><dt className="text-xs text-slate-500">Assigned to</dt><dd className="mt-1 break-words text-sm font-semibold">{selectedTask.assigned_to_user_name || "Unassigned"}</dd></div>
                <div><dt className="text-xs text-slate-500">Status</dt><dd className="mt-1 text-sm font-semibold">{selectedTask.status.replaceAll("_", " ")}</dd></div>
                <div><dt className="text-xs text-slate-500">Priority</dt><dd className="mt-1 text-sm font-semibold">{selectedTask.priority}</dd></div>
                <div><dt className="text-xs text-slate-500">Due date</dt><dd className="mt-1 text-sm font-semibold">{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleString() : "No due date"}{selectedTask.is_overdue && <span className="mt-1 block text-red-700">Overdue</span>}</dd></div>
                <div><dt className="text-xs text-slate-500">Assigned by</dt><dd className="mt-1 break-words text-sm font-semibold">{selectedTask.created_by_user_name}</dd></div>
              </dl>
              <div><h3 className="text-sm font-semibold">Description</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 [overflow-wrap:anywhere]">{selectedTask.description || "No description provided."}</p></div>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setSelectedTaskId(null)} className="min-h-11 cursor-pointer rounded-xl bg-emerald-800 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Close</button>
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
