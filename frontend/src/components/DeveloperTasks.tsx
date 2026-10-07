import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import axios from "axios";

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
  accessToken :string 
}

export default function DeveloperTasks({accessToken}:DeveloperTaskProp) {
  const URL = "http://localhost:3000";

  //serach Params
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [taskListRefresh,setTaskListRefresh] = useState(false)

  //filter States
  const [taskNameFilter,setTaskNameFilter] = useState(appliedTaskName)
  const [projectIdFilter,setProjectIdFilter] = useState(appliedProjectId)
  const [statusFilter,setStatusFilter] = useState(appliedStatus)
  const [priorityFilter,setPriorityFilter] = useState(appliedPriority)

  // Keep the filter fields in sync with browser navigation.
  const filterKey = JSON.stringify([appliedTaskName,appliedProjectId,appliedStatus,appliedPriority]);
  const [previousFilterKey,setPreviousFilterKey] = useState(filterKey);
  if(previousFilterKey !== filterKey){
    setPreviousFilterKey(filterKey)
    setTaskNameFilter(appliedTaskName)
    setProjectIdFilter(appliedProjectId)
    setStatusFilter(appliedStatus)
    setPriorityFilter(appliedPriority)
  }

  // Fetch projects that contain tasks assigned to this developer.
  useEffect(() =>{
    async function fetchProjects(){
      try {
        setProjectsError("")
        const response = await axios.get<{projects: ProjectOption[]}>(`${URL}/task/assigned-to-me/projects`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setProjects(response.data.projects)
      } catch (error) {
        console.error("Failed to fetch assigned task projects:", error)
        setProjectsError("Could not load projects")
      }
    }
    if(accessToken) fetchProjects()
  },[accessToken])

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
  },[accessToken,appliedTaskName,appliedProjectId,appliedStatus,appliedPriority,taskListRefresh])

  function handleSearch(){
    const params = new URLSearchParams();
    if(overdue) params.set("overdue","true")
    if(taskNameFilter.trim()) params.set("task_name",taskNameFilter.trim())
    if(projectIdFilter) params.set("project_id",projectIdFilter)
    if(statusFilter) params.set("status",statusFilter)
    if(priorityFilter) params.set("priority",priorityFilter)
    setSearchParams(params)
    setTaskListRefresh((current) => !current)
  }

  function handleClearFilters(){
    setTaskNameFilter("")
    setProjectIdFilter("")
    setStatusFilter("")
    setPriorityFilter("")
    setSearchParams(overdue ? { overdue: "true" } : {})
    setTaskListRefresh((current) => !current)
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

          <div className="grid gap-4 border-b border-slate-200 px-5 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] xl:items-end">
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
            <div className="flex items-center gap-2 self-end">
              <button type="button" onClick={handleSearch} className="min-h-11 rounded-xl bg-emerald-800 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:cursor-pointer hover:bg-emerald-700">Search</button>
              <button type="button" onClick={handleClearFilters} className="min-h-11 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:cursor-pointer hover:bg-slate-100">Clear filters</button>
            </div>
          </div>

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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-500">Loading tasks…</td></tr>
                ) : listError ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center text-red-700" role="alert">{listError}</td></tr>
                ) : visibleTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700" aria-hidden="true">
                        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4H5v17h14V4h-4M9 2h6v4H9ZM8 12l2 2 5-5" /></svg>
                      </span>
                      <p className="mt-4 font-semibold text-slate-800">{overdue ? "No overdue tasks" : "No assigned tasks"}</p>
                      <p className="mt-1 text-sm text-slate-500">{overdue ? "You're caught up on overdue work." : "Tasks assigned to you will appear here."}</p>
                    </td>
                  </tr>
                ) : visibleTasks.map((task) => (
                  <tr key={task.task_id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/70">
                    <th scope="row" className="px-6 py-5 font-semibold text-slate-900">
                      <p className="max-w-64 break-words">{task.title}</p>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
