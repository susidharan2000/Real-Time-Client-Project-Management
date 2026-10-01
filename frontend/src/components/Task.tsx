import { Link, useSearchParams } from "react-router";
import axios from "axios";
import { useEffect, useRef, useState } from "react";

type Status = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type TaskRowList = {
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
};

type ProjectOption = { project_id: string; title: string };
type AssigneeOption = { id: string; name: string };
type TaskProps = { accessToken: string; role:string; };

const statusLabels: Record<Status, string> = {
  TO_DO: "To do", IN_PROGRESS: "In progress", IN_REVIEW: "In review", DONE: "Done",
};
const statusColors: Record<Status, string> = {
  TO_DO: "bg-slate-100 text-slate-600", IN_PROGRESS: "bg-blue-50 text-blue-700",
  IN_REVIEW: "bg-amber-50 text-amber-800", DONE: "bg-emerald-50 text-emerald-700",
};
const priorityColors: Record<Priority, string> = {
  LOW: "border-slate-200 text-slate-600", MEDIUM: "border-blue-200 text-blue-700",
  HIGH: "border-amber-200 text-amber-800", CRITICAL: "border-red-200 text-red-700",
};

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function errorMessage(err: unknown) {
  return axios.isAxiosError<{message: string}>(err)
    ? err.response?.data?.message ?? "Could not reach the server. Please try again."
    : "Something went wrong. Please try again.";
}

export default function Task({accessToken,role}: TaskProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedTaskName = searchParams.get("task_name") ?? "";
  const appliedProjectId = searchParams.get("project_id") || "all";
  const requestedStatus = searchParams.get("status") ?? "all";
  const appliedStatus = ["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(requestedStatus) ? requestedStatus : "all";
  const appliedPriority = searchParams.get("priority") || "all";
  const [showAddTaskUI, setshowAddTaskUI] = useState(false);
  const [tasks, setTasks] = useState<TaskRowList[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [taskID, setTaskID] = useState("");
  const [taskName, setTaskName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [status, setStatus] = useState<Status>("TO_DO");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [taskListRefresh, setTaskListRefresh] = useState(false);
  const [optionsRefresh, setOptionsRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [selectedTask, setSelectedTask] = useState<TaskRowList | null>(null);
  const detailsRef = useRef<HTMLDialogElement>(null);


  const [taskNameFilter,SetTaskNameFilter] = useState(appliedTaskName)
  const [projectIDFiter,SetProjectIDFilter] = useState(appliedProjectId)
  const [statusFilter,SetStatusFilter] = useState(appliedStatus)
  const [priorityFilter,SetPriorityFilter] = useState(appliedPriority)
  const [projectListFilter,SetProjectListfilter] = useState<{project_id: string; project_title: string}[]>([])

   const URL = "http://localhost:3000";

//set the FilterFeild
  useEffect(()=>{
    async function fetchProjectListForFilter(){
      if (!accessToken) return;
      try{
        let endpoint = "";
        if (role === "ADMIN"){
          endpoint = "/task/projects";
        }else if(role === "PROJECT_MANAGER"){
          endpoint = "/task/created-by-me/projects";
        }else if (role === "DEVELOPER"){
          endpoint = "/task/assigned-to-me/projects";
        }else{
          return;
        }
        const res = await axios.get<{projects: {project_id: string; project_title: string}[]}>(`${URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        SetProjectListfilter(res.data.projects);

      }catch(error){
        console.error("Failed to fetch projects for filter:", error);
      }
  }
  fetchProjectListForFilter()
  },[role, accessToken])


  //handle the Filter
  function handleFilter(){
    const params = new URLSearchParams();
    if (taskNameFilter.trim()) params.set("task_name", taskNameFilter.trim());
    if (projectIDFiter !== "all") params.set("project_id", projectIDFiter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    setSearchParams(params);
    setTaskListRefresh((current) => !current);
  }

  //handle Clear Filter
  async function handleClearFilter(){
    SetTaskNameFilter("")
    SetProjectIDFilter("all")
    SetStatusFilter("all")
    SetPriorityFilter("all")
    setSearchParams({});
    setTaskListRefresh((current) => !current)
  }

  // Reset the draft fields when navigation changes the applied filters.
  const filterKey = JSON.stringify([appliedTaskName, appliedProjectId, appliedStatus, appliedPriority]);
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey);
  if (previousFilterKey !== filterKey) {
    setPreviousFilterKey(filterKey);
    SetTaskNameFilter(appliedTaskName);
    SetProjectIDFilter(appliedProjectId);
    SetStatusFilter(appliedStatus);
    SetPriorityFilter(appliedPriority);
  }

  // Fetch the list again after a successful change.
  useEffect(() => {
    const controller = new AbortController();
    async function fetchTasks() {
      setLoading(true);
      setListError("");
      try {
        const res = await axios.get<{tasks: TaskRowList[]}>(`${URL}/task/search`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
          params: {
            task_name: appliedTaskName || undefined,
            project_id: appliedProjectId === "all" ? undefined : appliedProjectId,
            status: appliedStatus === "all" ? undefined : appliedStatus,
            priority: appliedPriority === "all" ? undefined : appliedPriority,
          },
        });
        if (!controller.signal.aborted) setTasks(res.data.tasks);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch tasks:", err);
        setListError(errorMessage(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    if (accessToken) fetchTasks();
    return () => controller.abort();
  }, [accessToken, taskListRefresh, appliedTaskName, appliedProjectId, appliedStatus, appliedPriority]);


  //Fetch option for the Add Feild
  useEffect(() => {
    async function fetchOptions() {
      setOptionsLoading(true);
      setOptionsError("");
      try {
        const config = { headers: { Authorization: `Bearer ${accessToken}` } };
        const [projectRes, assigneeRes] = await Promise.all([
          axios.get<{projects: ProjectOption[]}>(`${URL}/project`, config),
          axios.get<{assignees: AssigneeOption[]}>(`${URL}/task/assignees`, config),
        ]);
        setProjects(projectRes.data.projects);
        setAssignees(assigneeRes.data.assignees);
      } catch (err) {
        console.error("Failed to fetch task choices:", err);
        setOptionsError(errorMessage(err));
      } finally {
        setOptionsLoading(false);
      }
    }
    if (accessToken) fetchOptions();
  }, [accessToken, optionsRefresh]);


  //PopUp Card
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
  }, [selectedTask]);

  function clearFields() {
    setTaskID("");
    setTaskName("");
    setDescription("");
    setProjectId("");
    setAssignedToUserId("");
    setStatus("TO_DO");
    setPriority("MEDIUM");
    setDueDate("");
    setError("");
  }

  function handleAddTask() {
    clearFields();
    setshowAddTaskUI(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleReviseTask(task: TaskRowList) {
    setTaskID(task.task_id);
    setTaskName(task.title);
    setDescription(task.description ?? "");
    setProjectId(task.project_id);
    setAssignedToUserId(task.assigned_to_userid ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(localDateTime(task.due_date));
    setError("");
    setshowAddTaskUI(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Use POST for a new task and PUT when revising an existing task.
  async function handleSaveTask() {
    if (saving) return;
    if (!taskName.trim() || !projectId) {
      setError("Enter a task name and select a project.");
      return;
    }
    const date = dueDate ? new Date(dueDate) : null;
    if (date && !Number.isFinite(date.getTime())) {
      setError("Enter a valid due date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: taskName.trim(), description: description.trim(), project_id: projectId,
        assigned_to: assignedToUserId || null, status, priority,
        due_date: date ? date.toISOString() : null,
      };
      const config = { headers: { Authorization: `Bearer ${accessToken}` } };
      if (taskID) {
        await axios.put(`${URL}/task/${taskID}`, payload, config);
      } else {
        await axios.post(`${URL}/task`, payload, config);
      }
      clearFields();
      setshowAddTaskUI(false);
      setTaskListRefresh((current) => !current);
    } catch (err) {
      console.error("Failed to save task:", err);
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(task: TaskRowList) {
    if (saving || !window.confirm(`Delete "${task.title}"? Its activity history will also be deleted.`)) return;
    setSaving(true);
    setError("");
    try {
      await axios.delete(`${URL}/task/${task.task_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (taskID === task.task_id) {
        clearFields();
        setshowAddTaskUI(false);
      }
      setTaskListRefresh((current) => !current);
    } catch (err) {
      console.error("Failed to delete task:", err);
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-h-[calc(100dvh-5rem)] bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 sm:py-8" aria-labelledby="tasks-title">
      <div className="mx-auto max-w-7xl space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <Link to="/" className="rounded text-slate-500 hover:text-emerald-800">Dashboard</Link>
          <span aria-hidden="true" className="text-slate-300">/</span>
          <span aria-current="page" className="font-medium text-slate-800">Tasks</span>
        </nav>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Task management</p>
            <h1 id="tasks-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Your tasks</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Organize project work, assign your team, and keep track of deadlines.</p>
          </div>
          <button type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:cursor-pointer hover:bg-emerald-700" disabled={saving} onClick={handleAddTask}>
            <span aria-hidden="true" className="text-xl font-normal">+</span> Add task
          </button>
        </div>


        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {showAddTaskUI && 
        (
           <div role="form" aria-labelledby="task-form-title" className="rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5 sm:px-6">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 4H5v17h14V4h-4M9 2h6v4H9ZM9 11h6M9 15h6" />
              </svg>
            </span>
            <div>
              <h2 id="task-form-title" className="text-lg font-semibold">{taskID ? "Revise task" : "Add task"}</h2>
              <p className="mt-1 text-sm text-slate-500">Define the work, choose a project, and set its priority.</p>
            </div>
          </div>

          {optionsError && <div role="alert" className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <p>{optionsError}</p>
            <button type="button" onClick={() => setOptionsRefresh((current) => !current)} className="mt-2 min-h-11 rounded-lg px-3 font-semibold hover:cursor-pointer hover:bg-red-100">Reload choices</button>
          </div>}
          {optionsLoading && <p role="status" className="px-6 pt-4 text-sm text-slate-500">Loading projects and assignees…</p>}
          <fieldset disabled={saving} className="min-w-0 space-y-5 p-5 disabled:opacity-60 sm:p-6">
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700">Task name
              <input id="task-title" value={taskName} onChange={(event) => setTaskName(event.target.value)} name="title" type="text" placeholder="e.g. Build the login page" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600" />
            </label>
            <label htmlFor="task-description" className="block text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span>
              <textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} name="description" rows={3} placeholder="Describe what needs to be done…" className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600" />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label htmlFor="task-project" className="text-sm font-medium text-slate-700">Project
                <select id="task-project" disabled={optionsLoading || !!optionsError} value={projectId} onChange={(event) => setProjectId(event.target.value)} name="project_id" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 focus:border-emerald-600">
                  <option value="">Select a project</option>
                  {projects.map((project) => <option key={project.project_id} value={project.project_id}>{project.title}</option>)}
                </select>
                {!optionsLoading && !optionsError && projects.length === 0 && <span className="mt-2 block text-xs font-normal text-slate-500">Create a project before adding tasks.</span>}
              </label>
              <label htmlFor="task-assignee" className="text-sm font-medium text-slate-700">Assigned to <span className="font-normal text-slate-400">(optional)</span>
                <select id="task-assignee" disabled={optionsLoading || !!optionsError} value={assignedToUserId} onChange={(event) => setAssignedToUserId(event.target.value)} name="assigned_to" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 focus:border-emerald-600">
                  <option value="">Unassigned</option>
                  {assignedToUserId && !assignees.some((user) => user.id === assignedToUserId) && <option value={assignedToUserId} disabled>Current assignee unavailable — select another or unassign</option>}
                  {assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <label htmlFor="task-status" className="text-sm font-medium text-slate-700">Status
                <select id="task-status" value={status} onChange={(event) => setStatus(event.target.value as Status)} name="status" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 focus:border-emerald-600">
                  <option value="TO_DO">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="IN_REVIEW">In review</option>
                  <option value="DONE">Done</option>
                </select>
              </label>
              <label htmlFor="task-priority" className="text-sm font-medium text-slate-700">Priority
                <select id="task-priority" name="priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 focus:border-emerald-600">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </label>
              <label htmlFor="task-due-date" className="min-w-0 text-sm font-medium text-slate-700">Due date <span className="font-normal text-slate-400">(optional)</span>
                <input id="task-due-date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} name="due_date" type="datetime-local" className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 focus:border-emerald-600" />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button type="button" className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:cursor-pointer hover:bg-slate-50" onClick={() => { clearFields(); setshowAddTaskUI(false); }} >Cancel</button>
              <button type="button" disabled={optionsLoading || !!optionsError} onClick={handleSaveTask} className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:cursor-pointer hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving…" : taskID ? "Save changes" : "Create task"}</button>
            </div>
          </fieldset>
        </div>
        )
        }


        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold">Task directory</h2>
            <p className="text-xs text-slate-500">Assignments, priorities &amp; deadlines</p>
          </div>
          <div className="grid gap-4 border-b border-slate-200 px-5 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_auto] xl:items-end">
            <label htmlFor="task-search" className="text-sm font-medium text-slate-600">Search tasks
              <input id="task-search" name="search" type="search" placeholder="Search by task name…" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-emerald-600" value={taskNameFilter} onChange={(event)=>SetTaskNameFilter(event.target.value)} />
            </label>
            <label htmlFor="task-project-filter" className="text-sm font-medium text-slate-600">Project
              <select id="task-project-filter" name="project_filter" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600" value={projectIDFiter} onChange={(event)=>{SetProjectIDFilter(event.target.value);console.log(event.target)}}>
                <option value="all">All projects</option>
                {projectListFilter.map((project)=>(
                  <option value={project.project_id} key={project.project_id}>{project.project_title}</option>
                ))}
              </select>
            </label>
            <label htmlFor="task-status-filter" className="text-sm font-medium text-slate-600">Status
              <select id="task-status-filter" name="status_filter" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600" value={statusFilter} onChange={(event)=>{SetStatusFilter(event.target.value);console.log(event.target.value)}}>
                <option value="all">All statuses</option>
                <option value="TO_DO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="IN_REVIEW">In review</option>
                <option value="DONE">Done</option>
              </select>
            </label>
            <label htmlFor="task-priority-filter" className="text-sm font-medium text-slate-600">Priority
              <select id="task-priority-filter" name="priority_filter" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600"
              value={priorityFilter}
              onChange={(event)=>{SetPriorityFilter(event.target.value);console.log(event.target.value)}}>
                <option value="all">All priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </label>
            <div className="flex items-center gap-2 self-end">
              <button type="button" onClick={handleFilter} className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:cursor-pointer hover:bg-emerald-700">Search</button>
              <button type="button" onClick={handleClearFilter} className="min-h-11 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:cursor-pointer hover:bg-slate-100" >Clear filters</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <caption className="sr-only">Tasks, assignments, status, priority, due dates, and management actions</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-4">Task</th>
                  <th scope="col" className="px-6 py-4">Project</th>
                  <th scope="col" className="px-6 py-4">Assigned to</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4">Priority</th>
                  <th scope="col" className="px-6 py-4">Due date</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-500"><span role="status">Loading tasks…</span></td></tr> : listError ? <tr><td colSpan={7} className="px-6 py-12 text-center">
                  <p role="alert" className="text-red-700">{listError}</p>
                  <button type="button" onClick={() => setTaskListRefresh((current) => !current)} className="mt-3 min-h-11 rounded-xl px-4 py-2 font-semibold text-emerald-800 hover:cursor-pointer hover:bg-emerald-50">Try again</button>
                </td></tr> : tasks.length > 0 ? tasks.map((task) => (
                <tr key={task.task_id} className="transition-colors hover:bg-emerald-50/40">
                  <th scope="row" className="px-6 py-5 font-semibold text-slate-900">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4H5v17h14V4h-4M9 2h6v4H9ZM8 12l2 2 5-5" /></svg>
                      </span>
                      <div className="w-52 min-w-0">
                        <p className="truncate" title={task.title}>{task.title}</p>
                        <p className="mt-1 truncate text-xs font-normal text-slate-500">{task.description || "No description"}</p>
                      </div>
                    </div>
                  </th>
                  <td className="max-w-52 break-words px-6 py-5 text-slate-600">{task.project_title}</td>
                  <td className="max-w-48 break-words px-6 py-5 text-slate-600">{task.assigned_to_user_name || "Unassigned"}</td>
                  <td className="px-6 py-5"><span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statusColors[task.status]}`}>{statusLabels[task.status]}</span></td>
                  <td className="px-6 py-5"><span className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${priorityColors[task.priority]}`}>{task.priority}</span></td>
                  <td className="px-6 py-5 text-xs text-slate-600">
                    {task.due_date ? new Date(task.due_date).toLocaleString() : "No due date"}
                    {task.is_overdue && <span className="mt-1 block font-semibold text-red-700">Overdue</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => setSelectedTask(task)} disabled={saving} aria-haspopup="dialog" className="disabled:opacity-50 min-h-11 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 hover:cursor-pointer hover:bg-emerald-100">Review</button>
                      <button type="button" onClick={() => handleReviseTask(task)} disabled={saving} className="disabled:opacity-50 min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">Revise</button>
                      <button type="button" onClick={() => handleDelete(task)} disabled={saving} className="disabled:opacity-50 min-h-11 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-red-600 hover:cursor-pointer hover:border-red-100 hover:bg-red-50 hover:text-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
                )) : <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <p className="font-semibold">No tasks yet</p>
                  <p className="mt-2 text-sm text-slate-500">Add your first task to get started.</p>
                </td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {selectedTask && <dialog ref={detailsRef} aria-labelledby="task-review-title" onCancel={(event) => { event.preventDefault(); setSelectedTask(null); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:px-6">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Task review</p>
            <h2 id="task-review-title" className="text-xl font-bold [overflow-wrap:anywhere]">{selectedTask.title}</h2>
          </div>
          <button type="button" onClick={() => setSelectedTask(null)} aria-label="Close task review" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xl text-slate-500 hover:cursor-pointer hover:bg-slate-100">×</button>
        </div>
        <div className="space-y-6 p-5 sm:p-6">
          <dl className="grid gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Project</dt><dd className="mt-1 break-words text-sm font-semibold">{selectedTask.project_title}</dd></div>
            <div><dt className="text-xs text-slate-500">Assigned to</dt><dd className="mt-1 break-words text-sm font-semibold">{selectedTask.assigned_to_user_name || "Unassigned"}</dd></div>
            <div><dt className="text-xs text-slate-500">Status</dt><dd className="mt-1 text-sm font-semibold">{statusLabels[selectedTask.status]}</dd></div>
            <div><dt className="text-xs text-slate-500">Priority</dt><dd className="mt-1 text-sm font-semibold">{selectedTask.priority}</dd></div>
            <div><dt className="text-xs text-slate-500">Due date</dt><dd className="mt-1 text-sm font-semibold">{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleString() : "No due date"}{selectedTask.is_overdue && <span className="mt-1 block text-red-700">Overdue</span>}</dd></div>
            <div><dt className="text-xs text-slate-500">Created by</dt><dd className="mt-1 break-words text-sm font-semibold">{selectedTask.created_by_user_name}</dd></div>
          </dl>
          <div><h3 className="text-sm font-semibold">Description</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 [overflow-wrap:anywhere]">{selectedTask.description || "No description provided."}</p></div>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={() => setSelectedTask(null)} className="min-h-11 rounded-xl bg-emerald-800 px-5 py-2 text-sm font-semibold text-white hover:cursor-pointer hover:bg-emerald-700">Close</button>
        </div>
      </dialog>}
    </section>
  );
}
