import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

export type Client = {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  projectCount: number;
};

type ClientManagerProps = {
  clients: Client[];
  onClientsChange: (clients: Client[]) => void;
  onClose: () => void;
};

const inputStyle = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-600 focus:outline-2 focus:outline-emerald-600 disabled:opacity-60";
const buttonStyle = "rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export default function ClientManager({ clients, onClientsChange, onClose }: ClientManagerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [form, setForm] = useState<"add" | Client | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    if (form) nameRef.current?.focus();
  }, [form]);

  useEffect(() => {
    if (deleting) cancelDeleteRef.current?.focus();
  }, [deleting]);

  function openForm(client?: Client) {
    setForm(client ?? "add");
    setName(client?.name ?? "");
    setEmail(client?.email ?? "");
    setDeleting(null);
    setActionError("");
    setNotice("");
  }

  function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    if (!name.trim()) {
      setActionError("Enter a client name.");
      return;
    }
    setActionError("");
    const input = { name: name.trim(), email: email.trim() || null };
    const updated = form === "add"
      ? [{ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), projectCount: 0 }, ...clients]
      : clients.map((client) => client.id === form.id ? { ...client, ...input } : client);
    onClientsChange(updated);
    setNotice(form === "add" ? "Client added to this preview." : "Client updated in this preview.");
    setForm(null);
    setSearch("");
    setProjectFilter("all");
  }

  function deleteClient() {
    if (!deleting || deleting.projectCount > 0) return;
    setActionError("");
    onClientsChange(clients.filter((client) => client.id !== deleting.id));
    setNotice("Client removed from this preview.");
    setDeleting(null);
  }

  const query = search.trim().toLowerCase();
  const filteredClients = clients.filter((client) => {
    const matchesSearch = `${client.name} ${client.email ?? ""}`.toLowerCase().includes(query);
    const matchesProjects = projectFilter === "all" || (projectFilter === "with" ? client.projectCount > 0 : client.projectCount === 0);
    return matchesSearch && matchesProjects;
  }).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-5xl overflow-hidden rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Client directory</p>
            <h2 id={titleId} className="mt-1 text-2xl font-bold tracking-tight">Manage clients</h2>
            <p className="mt-1 text-sm text-slate-500">Keep your client details in one place.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close client manager" className={`${buttonStyle} flex size-10 shrink-0 items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200`}>
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Local preview. Added clients and changes stay here while the dashboard is open; they are not saved to the server.</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">{clients.length} clients in this preview</p>
            <button type="button" onClick={() => openForm()} className={`${buttonStyle} bg-emerald-800 text-white hover:bg-emerald-700`}>+ Add client</button>
          </div>

          {notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
          {actionError && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</p>}

          {form && (
            <form onSubmit={saveClient} className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <h3 className="font-semibold">{form === "add" ? "Add a client" : "Edit client"}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">Client name <span className="text-red-600">*</span>
                  <input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} className={inputStyle} placeholder="Company or client name" />
                </label>
                <label className="space-y-1.5 text-sm font-medium">Email <span className="font-normal text-slate-500">(optional)</span>
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className={inputStyle} placeholder="contact@example.com" />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setForm(null); setActionError(""); }} className={`${buttonStyle} text-slate-600 hover:bg-white`}>Cancel</button>
                <button type="submit" disabled={!name.trim()} className={`${buttonStyle} bg-emerald-800 text-white hover:bg-emerald-700`}>{form === "add" ? "Add client" : "Save changes"}</button>
              </div>
            </form>
          )}

          {deleting && (
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4" role="group" aria-label="Confirm client deletion">
              <p className="text-sm text-red-900">Delete <strong>{deleting.name}</strong>? This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button ref={cancelDeleteRef} type="button" onClick={() => { setDeleting(null); setActionError(""); }} className={`${buttonStyle} text-slate-600 hover:bg-white`}>Cancel</button>
                <button type="button" onClick={deleteClient} className={`${buttonStyle} bg-red-700 text-white hover:bg-red-800`}>Delete client</button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="min-w-0"><span className="sr-only">Search clients by name or email</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email…" className={inputStyle} /></label>
            <label><span className="sr-only">Filter clients by projects</span><select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className={inputStyle}><option value="all">All clients</option><option value="with">With projects</option><option value="without">Without projects</option></select></label>
            <label><span className="sr-only">Sort clients</span><select value={sort} onChange={(event) => setSort(event.target.value)} className={inputStyle}><option value="newest">Newest first</option><option value="name">Name A–Z</option></select></label>
          </div>

          {filteredClients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
              <h3 className="font-semibold">{clients.length === 0 ? "No clients yet" : "No clients match your filters"}</h3>
              <p className="mt-2 text-sm text-slate-500">{clients.length === 0 ? "Add your first client to get started." : "Try another name or clear the filters."}</p>
              {clients.length > 0 && <button type="button" onClick={() => { setSearch(""); setProjectFilter("all"); }} className={`${buttonStyle} mt-3 text-emerald-800 hover:bg-emerald-50`}>Clear filters</button>}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Clients with email, project count, creation date, and management actions</caption>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3">Client</th><th scope="col" className="px-4 py-3">Email</th><th scope="col" className="px-4 py-3">Projects</th><th scope="col" className="px-4 py-3">Added</th><th scope="col" className="px-4 py-3 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.map((client) => <tr key={client.id} className="hover:bg-slate-50/70">
                    <th scope="row" className="max-w-60 break-words px-4 py-4 font-semibold text-slate-800">{client.name}</th>
                    <td className="max-w-64 break-words px-4 py-4 text-slate-500">{client.email || "—"}</td>
                    <td className="px-4 py-4 tabular-nums">{client.projectCount}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-500">{new Date(client.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openForm(client)} aria-label={`Edit ${client.name}`} className={`${buttonStyle} text-slate-600 hover:bg-slate-100`}>Edit</button>
                      <button type="button" onClick={() => { setDeleting(client); setForm(null); setActionError(""); setNotice(""); }} disabled={client.projectCount > 0} title={client.projectCount > 0 ? "Clients with projects cannot be deleted" : undefined} aria-label={`Delete ${client.name}`} className={`${buttonStyle} text-red-700 hover:bg-red-50`}>Delete</button>
                    </div></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-500">Showing {filteredClients.length} of {clients.length} clients. Clients with linked projects cannot be deleted.</p>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
