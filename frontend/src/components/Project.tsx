import { Link } from "react-router";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import ProjectFilters from "./ProjectFilters";
import type { Socket } from "socket.io-client";

type ProjectRowList = {
  project_id: string;
  title: string;
  description: string | null;
  client_id: string;
  client_name: string;
  created_by_id: string;
  created_by: string;
  project_manager_id: string | null;
  project_manager: string | null;
};

type ClientOption = {
  id: string;
  name: string;
};

type ManagerOption = {
  id: string;
  name: string;
};

type ProjectProps = {
  accessToken: string;
  role:string;
  userId: string;
  userName: string;
  socket:Socket | null;
};

export default function Project({accessToken,role,userId,userName,socket}: ProjectProps) {
  const [showAddComponentUI, setShowAddComponentUI] = useState(false);
  const [showEditComponentUI, setShowEditComponentUI] = useState(false);
  const [projects, setProjects] = useState<ProjectRowList[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [projectID, setProjectID] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientID, setClientID] = useState("");
  const [managerID, setManagerID] = useState("");
  const [projectListRefresh, setProjectListRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsRefresh, setOptionsRefresh] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectRowList | null>(null);
  const detailsRef = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");

  const URL = "http://localhost:3000";

  useEffect(() => {
    if (!selectedProject) return;
    const dialog = detailsRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProject]);

  // Fetch projects again after creating, editing, or deleting.
  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      setListError("");
      try {
        const endpoint =
          role === "ADMIN" ? "/project" :
          role === "PROJECT_MANAGER" ? "/project/my-projects" :
          null;

          if (!endpoint) {
            setProjects([]);
            setListError("You do not have permission to view projects.");
          }
        setLoading(true);
        setListError("");
        const res = await axios.get<{ projects: ProjectRowList[] }>(`${URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setProjects(res.data.projects);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setListError(axios.isAxiosError<{message: string}>(err) ? err.response?.data?.message ?? "Could not load projects" : "Could not load projects");
      } finally {
        setLoading(false);
      }
    }
    if (accessToken) fetchProjects();
  }, [accessToken, projectListRefresh]);

  // Load the client and manager choices for the project form.
  useEffect(() => {
    async function fetchOptions() {
      setOptionsLoading(true);
      setOptionsError("");
      try {
        const config = {
          headers: { Authorization: `Bearer ${accessToken}` },
        };
        const [clientRes, managerRes] = await Promise.all([
          axios.get<{ clients: ClientOption[] }>(`${URL}/client`, config),
          axios.get<{ managers: ManagerOption[] }>(`${URL}/project/managers`, config),
        ]);
        setClients(clientRes.data.clients);
        setManagers(managerRes.data.managers);
      } catch (err) {
        console.error("Failed to fetch project form choices:", err);
        setOptionsError("Could not load client and manager choices. Please try again.");
      } finally {
        setOptionsLoading(false);
      }
    }
    if (accessToken) fetchOptions();
  }, [accessToken, optionsRefresh]);

  function clearFields() {
    setProjectID("");
    setTitle("");
    setDescription("");
    setClientID("");
    setManagerID("");
    setError("");
  }

  function handleAddProject() {
    clearFields();
    setShowEditComponentUI(false);
    setShowAddComponentUI(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Create project, then refresh the list from the API.
  async function handleCreateProject() {
    if (saving) return;
    if (!title.trim() || !clientID) {
      setError("Enter a project name and select a client.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await axios.post(`${URL}/project`, {
        title: title.trim(),
        description: description.trim(),
        client_id: clientID,
        project_manager_id: role === "PROJECT_MANAGER" ? userId : managerID || null,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      clearFields();
      setShowAddComponentUI(false);
      setProjectListRefresh((current) => !current);
    } catch (err) {
      console.error("Failed to create project:", err);
      setError(axios.isAxiosError<{message: string}>(err) ? err.response?.data?.message ?? "Could not create project" : "Could not create project");
    } finally {
      setSaving(false);
    }
  }

  // Fill the form with the selected project.
  function handleEditProject(project: ProjectRowList) {
    setProjectID(project.project_id);
    setTitle(project.title);
    setDescription(project.description ?? "");
    setClientID(project.client_id);
    setManagerID(project.project_manager_id ?? "");
    setError("");
    setShowAddComponentUI(false);
    setShowEditComponentUI(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEditProject() {
    if (saving) return;
    if (!title.trim() || !clientID) {
      setError("Enter a project name and select a client.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await axios.put(`${URL}/project/${projectID}`, {
        title: title.trim(),
        description: description.trim(),
        client_id: clientID,
        project_manager_id: role === "PROJECT_MANAGER" ? userId : managerID || null,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      clearFields();
      setShowEditComponentUI(false);
      setProjectListRefresh((current) => !current);
    } catch (err) {
      console.error("Failed to update project:", err);
      setError(axios.isAxiosError<{message: string}>(err) ? err.response?.data?.message ?? "Could not update project" : "Could not update project");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(project: ProjectRowList) {
    if (saving || !window.confirm(`Delete "${project.title}"? Its tasks and activity history will also be deleted.`)) return;
    setSaving(true);
    setError("");
    try {
      await axios.delete(`${URL}/project/${project.project_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (projectID === project.project_id) {
        clearFields();
        setShowEditComponentUI(false);
      }
      setProjectListRefresh((current) => !current);
    } catch (err) {
      console.error("Failed to delete project:", err);
      setError(axios.isAxiosError<{message: string}>(err) ? err.response?.data?.message ?? "Could not delete project" : "Could not delete project");
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setClientFilter("all");
    setManagerFilter("all");
  }

  const searchText = search.trim().toLowerCase();
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchText) ||
      (project.description ?? "").toLowerCase().includes(searchText);
    const matchesClient = clientFilter === "all" || project.client_id === clientFilter;
    const matchesManager = managerFilter === "all" ||
      (managerFilter === "unassigned" ? project.project_manager_id === null : project.project_manager_id === managerFilter);
    return matchesSearch && matchesClient && matchesManager;
  });

  // Use the full list so filter choices stay available while searching.
  const clientChoices = new Map<string, string>();
  const managerChoices = new Map<string, string>();
  for (const project of projects) {
    clientChoices.set(project.client_id, project.client_name);
    if (project.project_manager_id !== null) {
      managerChoices.set(project.project_manager_id, project.project_manager ?? "Unknown manager");
    }
  }

  useEffect(()=>{
    if(!socket)return;

     const handleProjectList = ({ projects }: { projects: ProjectRowList[] }) => {
      console.log("Event Recived!")
      setProjects(projects);
    };

    socket.on("project:created",handleProjectList );
    socket.on("project:updated",handleProjectList);
    socket.on("project:deleted",handleProjectList);
    return ()=>{
      socket.off("project:created",handleProjectList );
    socket.off("project:updated",handleProjectList);
    socket.off("project:deleted",handleProjectList);
    }
  },[socket]);

  return (
    <section className="min-h-[calc(100dvh-5rem)] bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 sm:py-8" aria-labelledby="projects-title">
      <div className="mx-auto max-w-7xl space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <Link to="/" className="rounded text-slate-500 hover:text-emerald-800">Dashboard</Link>
          <span aria-hidden="true" className="text-slate-300">/</span>
          <span aria-current="page" className="font-medium text-slate-800">Projects</span>
        </nav>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Project management</p>
            <h1 id="projects-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Your projects</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Bring your clients, project details, and team together.</p>
          </div>
          <button type="button" onClick={handleAddProject} disabled={saving} className="disabled:opacity-50 inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:cursor-pointer hover:bg-emerald-700">
            <span aria-hidden="true" className="text-xl font-normal">+</span> Add project
          </button>
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {(showAddComponentUI || showEditComponentUI) && <div role="form" aria-labelledby="project-form-title" className="rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5 sm:px-6">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM12 11v6M9 14h6" />
              </svg>
            </span>
            <div>
              <h2 id="project-form-title" className="text-lg font-semibold">{showEditComponentUI ? "Edit project" : "Add project"}</h2>
              <p className="mt-1 text-sm text-slate-500">Give your project a name, connect a client, and assign a manager.</p>
            </div>
          </div>

          {optionsError && <div role="alert" className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
            <p>{optionsError}</p>
            <button type="button" onClick={() => setOptionsRefresh((current) => !current)} className="min-h-11 rounded-lg px-3 py-2 font-semibold hover:cursor-pointer hover:bg-red-100">Try again</button>
          </div>}
          {optionsLoading && <p role="status" className="px-6 pt-4 text-sm text-slate-500">Loading clients and managers…</p>}
          <fieldset disabled={saving} className="min-w-0 space-y-5 p-5 disabled:opacity-60 sm:p-6">
            <label htmlFor="project-title" className="block text-sm font-medium text-slate-700">Project name
              <input id="project-title" value={title} onChange={(event) => setTitle(event.target.value)} name="title" type="text" placeholder="e.g. Website redesign" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600" />
            </label>
            <label htmlFor="project-description" className="block text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span>
              <textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} name="description" rows={4} placeholder="Describe the project and what the team will deliver…" className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600" />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label htmlFor="project-client" className="text-sm font-medium text-slate-700">Client
                <select disabled={optionsLoading || !!optionsError} id="project-client" value={clientID} onChange={(event) => setClientID(event.target.value)} name="client_id" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 focus:border-emerald-600">
                  <option value="">Select a client</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
                {!optionsLoading && !optionsError && clients.length === 0 && <span className="mt-2 block text-xs font-normal text-slate-500">Add a client on the Clients page before creating a project.</span>}
              </label>
              <label htmlFor="project-manager" className="text-sm font-medium text-slate-700">Project manager {role === "ADMIN" && <span className="font-normal text-slate-400">(optional)</span>}
                <select disabled={optionsLoading || !!optionsError} id="project-manager" name="project_manager_id" value={role === "PROJECT_MANAGER" ? userId : managerID} onChange={(event) => setManagerID(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 focus:border-emerald-600">
                  {role === "PROJECT_MANAGER" ? (
                    <option value={userId}>{userName}</option>
                  ) : (
                    <>
                      <option value="">Unassigned</option>
                      {managerID && !managers.some((manager) => manager.id === managerID) && <option value={managerID} disabled>Current manager is unavailable — choose another or unassign</option>}
                      {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
                    </>
                  )}
                </select>
                {role === "ADMIN" && !optionsLoading && !optionsError && managers.length === 0 && <span className="mt-2 block text-xs font-normal text-slate-500">No active project managers available. You can leave this unassigned.</span>}
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button type="button" onClick={() => { clearFields(); setShowAddComponentUI(false); setShowEditComponentUI(false); }} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:cursor-pointer hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={optionsLoading || !!optionsError} onClick={showEditComponentUI ? saveEditProject : handleCreateProject} className="disabled:opacity-50 min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:cursor-pointer hover:bg-emerald-700">{saving ? "Saving…" : showEditComponentUI ? "Save changes" : "Create project"}</button>
            </div>
          </fieldset>
        </div>}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold">Project directory</h2>
            <p className="text-xs text-slate-500">Project details &amp; assignments</p>
          </div>
          <ProjectFilters
            search={search}
            clientFilter={clientFilter}
            managerFilter={managerFilter}
            clients={Array.from(clientChoices, ([id, name]) => ({ id, name }))}
            managers={Array.from(managerChoices, ([id, name]) => ({ id, name }))}
            onSearchChange={setSearch}
            onClientChange={setClientFilter}
            onManagerChange={setManagerFilter}
            onClear={clearFilters}
            userRole={role}
            userId={userId}
            userName={userName}
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <caption className="sr-only">Projects, clients, managers, and management actions</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-4">Project</th>
                  <th scope="col" className="px-6 py-4">Client</th>
                  <th scope="col" className="px-6 py-4">Manager</th>
                  <th scope="col" className="px-6 py-4">Created by</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-500"><span role="status">Loading projects…</span></td></tr> : listError ? <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <p role="alert" className="text-red-700">{listError}</p>
                  <button type="button" onClick={() => setProjectListRefresh((current) => !current)} className="mt-3 min-h-11 rounded-xl px-4 py-2 font-semibold text-emerald-800 hover:cursor-pointer hover:bg-emerald-50">Try again</button>
                </td></tr> : filteredProjects.length > 0 ? filteredProjects.map((project) => (
                <tr key={project.project_id} className="transition-colors hover:bg-emerald-50/40">
                  <th scope="row" className="px-6 py-5 font-semibold text-slate-900">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                        </svg>
                      </span>
                      <div className="w-64 min-w-0">
                        <p className="truncate" title={project.title}>{project.title}</p>
                        <button type="button" onClick={() => setSelectedProject(project)} aria-haspopup="dialog" aria-label={`View details for ${project.title}`} className="mt-1 block min-h-8 w-full truncate rounded text-left text-xs font-normal leading-5 text-slate-500 hover:cursor-pointer hover:text-emerald-800 hover:underline">
                          {project.description || "View project details"}
                        </button>
                      </div>
                    </div>
                  </th>
                  <td className="max-w-52 break-words px-6 py-5 text-slate-600">{project.client_name}</td>
                  <td className="max-w-52 break-words px-6 py-5 text-slate-600">{project.project_manager || "Unassigned"}</td>
                  <td className="max-w-52 break-words px-6 py-5 text-slate-600">{project.created_by}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => handleEditProject(project)} disabled={saving} className="disabled:opacity-50 inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
                        <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 5 5M4 15 16 3a2 2 0 0 1 5 5L9 20l-6 1 1-6ZM14 21h7" /></svg>
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(project)} disabled={saving} className="disabled:opacity-50 inline-flex min-h-11 items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-red-600 hover:cursor-pointer hover:border-red-100 hover:bg-red-50 hover:text-red-700">
                        <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                )) : <tr><td colSpan={5} className="px-6 py-16 text-center">
                  <p className="font-semibold text-slate-900">{projects.length === 0 ? "No projects yet" : "No matching projects"}</p>
                  <p className="mt-2 text-sm text-slate-500">{projects.length === 0 ? "Add your first project to get started." : "Try a different search, client, or manager."}</p>
                  {(search || clientFilter !== "all" || managerFilter !== "all") && <button type="button" onClick={clearFilters} className="mt-3 min-h-11 rounded-xl px-4 py-2 font-semibold text-emerald-800 hover:cursor-pointer hover:bg-emerald-50">Clear filters</button>}
                </td></tr>}
              </tbody>
            </table>
          </div>
          {!loading && !listError && <p role="status" className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500">Showing {filteredProjects.length} of {projects.length} projects</p>}
        </div>
      </div>
      {selectedProject && <dialog ref={detailsRef} aria-labelledby="project-details-title" onCancel={(event) => { event.preventDefault(); setSelectedProject(null); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Project details</p>
            <h2 id="project-details-title" className="text-xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-2xl">{selectedProject.title}</h2>
          </div>
          <button type="button" onClick={() => setSelectedProject(null)} aria-label="Close project details" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:cursor-pointer hover:bg-slate-100 hover:text-slate-900">
            <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M6 18 18 6" /></svg>
          </button>
        </div>
        <div className="space-y-6 p-5 sm:p-6">
          <dl className="grid gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Client</dt>
              <dd className="mt-1 text-sm font-semibold [overflow-wrap:anywhere]">{selectedProject.client_name}</dd>
            </div>
           <div>
              <dt className="text-xs font-medium text-slate-500">Project manager</dt>
              <dd className="mt-1 text-sm font-semibold [overflow-wrap:anywhere]">{selectedProject.project_manager || "Unassigned"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Created by</dt>
              <dd className="mt-1 text-sm font-semibold [overflow-wrap:anywhere]">{selectedProject.created_by}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Project ID</dt>
              <dd className="mt-1 text-sm font-semibold [overflow-wrap:anywhere]">{selectedProject.project_id}</dd>
            </div>
          </dl>
          <div>
            <h3 className="text-sm font-semibold">Description</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 [overflow-wrap:anywhere]">{selectedProject.description || "No description provided."}</p>
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-6">
          <button type="button" onClick={() => setSelectedProject(null)} className="min-h-11 rounded-xl bg-emerald-800 px-5 py-2 text-sm font-semibold text-white hover:cursor-pointer hover:bg-emerald-700">Close</button>
        </div>
      </dialog>}
    </section>
  );
}
