type FilterOption = {
  id: string;
  name: string;
};

type ProjectFiltersProps = {
  search: string;
  clientFilter: string;
  managerFilter: string;
  clients: FilterOption[];
  managers: FilterOption[];
  onSearchChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onManagerChange: (value: string) => void;
  onClear: () => void;
};

export default function ProjectFilters({search, clientFilter, managerFilter, clients, managers, onSearchChange, onClientChange, onManagerChange, onClear}: ProjectFiltersProps) {
  return (
    <div className="grid gap-4 border-b border-slate-200 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
      <label htmlFor="project-search" className="text-sm font-medium text-slate-600">Search projects
        <input id="project-search" name="search" type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search name or description…" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-emerald-600" />
      </label>
      <label htmlFor="project-client-filter" className="text-sm font-medium text-slate-600">Client
        <select id="project-client-filter" name="client_filter" value={clientFilter} onChange={(event) => onClientChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600">
          <option value="all">All clients</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          {clientFilter !== "all" && !clients.some((client) => client.id === clientFilter) && <option value={clientFilter}>Selected client (no projects)</option>}
        </select>
      </label>
      <label htmlFor="project-manager-filter" className="text-sm font-medium text-slate-600">Manager
        <select id="project-manager-filter" name="manager_filter" value={managerFilter} onChange={(event) => onManagerChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-emerald-600">
          <option value="all">All managers</option>
          <option value="unassigned">Unassigned</option>
          {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
          {managerFilter !== "all" && managerFilter !== "unassigned" && !managers.some((manager) => manager.id === managerFilter) && <option value={managerFilter}>Selected manager (no projects)</option>}
        </select>
      </label>
      <button type="button" onClick={onClear} className="min-h-11 self-end rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:cursor-pointer hover:bg-slate-100">Clear filters</button>
    </div>
  );
}
