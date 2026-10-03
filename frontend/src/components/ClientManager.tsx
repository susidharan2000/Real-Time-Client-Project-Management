import { Link } from "react-router";
import axios from "axios";
import { useEffect, useState } from "react";

type ClientRowList = {
  id: number
  name: string
  email: string 
  projectCount:number
}

type ClientManagerProps = {
  accessToken: string;
};

export default function ClientManager({accessToken}:ClientManagerProps) {
  const[showAddComponentUI,setShowAddComponentUI] = useState<Boolean>(false)
  const[showEditComponentUI,setshowEditComponentUI] = useState<Boolean>(false)
  const[clients,setClients] = useState<ClientRowList[]>([])

  // set errors
  const [,SetError] = useState("")

  //client list
  const[clientID,setClientID] = useState<number>(0)
  const[clientname,setClientName] = useState("")
  const[email,setEmail] = useState("")

  //Client List Rerender
  const [clientListrefresh, setClientListrefresh] = useState(false);

  //Serach Client
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");


  //perform Serach
  const searchText = search.trim().toLowerCase();
  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchText) ||
      (client.email ?? "").toLowerCase().includes(searchText);
    const matchesProjects = projectFilter === "all" ||
      (projectFilter === "with" && client.projectCount > 0) ||
      (projectFilter === "without" && client.projectCount === 0);

    return matchesSearch && matchesProjects;
  });

  const URL = "http://localhost:3000"

  //fetch all the clients
  useEffect(()=>{
    async function fetchClients(){
      try{
        const res = await axios.get(`${URL}/client`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setClients(res.data.clients)
      }
      catch(err){
        console.error("Failed to fetch clients:", err);
      }
    }
    if (accessToken){
      fetchClients();
    }
  },[accessToken,clientListrefresh])

  //Create Client
  function handleCreateClient(){
    if(!clientname){
      SetError("Client Name Feild is Empty")
      return 
    }
    if (!email){
      SetError("Client Name Feild is Empty")
      return 
    }
    (async()=>{
      try{
      await axios.post(`${URL}/client`, {
        name: clientname,
        email: email,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      }
    );
    setClientName("")
    setEmail("")
    setShowAddComponentUI(false)
    setClientListrefresh((current) => !current)//refersh

    }catch(err){
      console.error("Failed to create clients:", err);
    }
    })()

  }

  //Delete Company

async function handleDelete(id: number) {
  try {
    await axios.delete(`${URL}/client/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    setClientListrefresh((current) => !current);
  } catch (err) {
    console.error("Failed to delete client:", err);
  }
}


//Edit Client

function handleEditClient(client: ClientRowList){
  setClientID(client.id)
  setClientName(client.name)
  setEmail(client.email)
  setShowAddComponentUI(false)
  setshowEditComponentUI(true)
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveEditClient(){
  try{
    await axios.put(`${URL}/${clientID}`, {
        name: clientname,
        email: email,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      }
    );
    setshowEditComponentUI(false)
    setClientName("")
    setEmail("")
    setClientListrefresh((current) => !current)//refersh
  }
  catch(err){
    SetError("Failed to Edit client")
    console.error("Failed to delete client:", err);
  }
}

function clearFeild(){
  setClientName("")
    setEmail("")
}



  return (
    <section className="min-h-[calc(100dvh-5rem)] bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 sm:py-8" aria-labelledby="clients-title">
      <div className="mx-auto max-w-7xl space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <Link to="/" className="rounded text-slate-500 hover:text-emerald-800">Dashboard</Link>
          <span aria-hidden="true" className="text-slate-300">/</span>
          <span aria-current="page" className="font-medium text-slate-800">Clients</span>
        </nav>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">Client management</p>
            <h1 id="clients-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Your clients</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Keep client details and project connections in one place.</p>
          </div>
          {
            !showAddComponentUI &&
            <button type="button" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 hover:cursor-pointer" onClick={()=>{setShowAddComponentUI(true);setshowEditComponentUI(false)}}>
            <span aria-hidden="true" className="text-xl font-normal">+</span> Add client
          </button>
          }
        </div>

        {showAddComponentUI && 
        <div role="form" aria-labelledby="client-form-title" className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 id="client-form-title" className="text-lg font-semibold">Client details</h2>
          <p className="mt-1 text-sm text-slate-500">Enter a client name and an optional contact email.</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label htmlFor="client-name" className="text-sm font-medium">Client name
              <input id="client-name" name="name" type="text" placeholder="e.g. Acme Studio" autoComplete="organization" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600" onChange={(event) => setClientName(event.target.value)} />
            </label>
            <label htmlFor="client-email" className="text-sm font-medium">Email <span className="font-normal text-slate-400">(optional)</span>
              <input id="client-email" name="email" type="email" placeholder="contact@company.com" autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600" onChange={(event) => setEmail(event.target.value)}/>
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" className="min-h-11 rounded-xl bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 hover:cursor-pointer" onClick={()=>{setShowAddComponentUI(false);clearFeild()}} >Close</button>
            <button type="button" className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 hover:cursor-pointer" onClick={handleCreateClient}>Save client</button>
          </div>
        </div>        
        }

        {
          showEditComponentUI && 
          <div role="form" aria-labelledby="edit-client-title" className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 3 5 5M4 15 16 3a2 2 0 0 1 5 5L9 20l-6 1 1-6ZM14 21h7" />
              </svg>
            </span>
            <div>
              <h2 id="edit-client-title" className="text-lg font-semibold text-slate-900">Edit client</h2>
              <p className="mt-1 text-sm text-slate-500">Update the client’s name and contact details.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label htmlFor="edit-client-name" className="text-sm font-medium text-slate-700">Client name
              <input id="edit-client-name" name="name" type="text" placeholder="Client name" autoComplete="organization" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600" value={clientname} onChange={(event) => setClientName(event.target.value)}/>
            </label>
            <label htmlFor="edit-client-email" className="text-sm font-medium text-slate-700">Email <span className="font-normal text-slate-400">(optional)</span>
              <input id="edit-client-email" name="email" type="email" placeholder="contact@company.com" autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600" value={email} onChange={(event) => setEmail(event.target.value)}/>
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:cursor-pointer hover:bg-slate-50" onClick={()=>{setshowEditComponentUI(false);clearFeild()}}>Cancel</button>
            <button type="button" className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:cursor-pointer hover:bg-emerald-700" onClick={saveEditClient}>Save changes</button>
          </div>
        </div>
        }

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold">Client directory</h2>
            <p className="text-xs text-slate-500">Contact details &amp; linked projects</p>
          </div>

          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-end sm:px-6">
            <label htmlFor="client-search" className="flex-1 text-sm font-medium text-slate-600">Search clients
              <input id="client-search" name="search" type="search" placeholder="Search by name or email…" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-emerald-600" value={search} onChange={(event) => setSearch(event.target.value)}/>
            </label>
            <label htmlFor="client-project-filter" className="text-sm font-medium text-slate-600 sm:w-52">Projects
              <select id="client-project-filter" name="projects" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                <option value="all">All clients</option>
                <option value="with">With projects</option>
                <option value="without">Without projects</option>
              </select>
            </label>
            <button type="button" className="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:cursor-pointer" onClick={() => { setSearch(""); setProjectFilter("all"); }}>Clear filters</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <caption className="sr-only">Client list and management actions</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-4">Client</th>
                  <th scope="col" className="px-6 py-4">Email address</th>
                  <th scope="col" className="px-6 py-4">Projects</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
              {filteredClients.length > 0 ? (
                    filteredClients.map((client)=>(
                    <tr key={client.id} className="transition-colors hover:bg-emerald-50/40">
                      <th scope="row" className="px-6 py-5 text-left font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
                            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M9 21v-3h2v3" />
                            </svg>
                          </span>
                          <span className="max-w-64 break-words">{client.name}</span>
                        </div>
                      </th>
                      <td className="max-w-72 break-words px-6 py-5 text-slate-600">{client.email}</td>
                      <td className="px-6 py-5">
                        <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tabular-nums text-slate-700 ring-1 ring-inset ring-slate-200">{client.projectCount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 hover:cursor-pointer" onClick={()=>handleEditClient(client)}>
                            <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m16 3 5 5M4 15 16 3a2 2 0 0 1 5 5L9 20l-6 1 1-6ZM14 21h7" /></svg>
                            Edit
                          </button>
                          <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-700 hover:cursor-pointer" onClick={()=>handleDelete(client.id)}>
                            <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                  ):
                  (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <span aria-hidden="true" className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                            <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M9 21v-3h2v3" />
                            </svg>
                          </span>
                          <p className="text-base font-semibold text-slate-900">No clients to show</p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">Add a client to get started, or adjust your filters to find a match.</p>
                        </div>
                      </td>
                    </tr>
                  )

              }
              </tbody>

            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
