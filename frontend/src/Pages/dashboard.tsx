import AdminDashboard from "./AdminDashboard";
import ProjectManagerDashboard from "./ProjectManagerDashboard";
import DeveloperDashboard from "./DeveloperDashboard";
import Header from "./Header";
import { Navigate, Route, Routes } from "react-router";
import ClientManager from "../components/ClientManager";
import Project from "../components/Project";
import Task from "../components/Task";

type DashboardProps = {
  userName: string;
  userId: string;
  role: string;
  accessToken: string;
  handleLogout: ()=> Promise<void>;
  notificationCount?: number;
};

function Dashboard({ userName, userId, role, accessToken, handleLogout, notificationCount = 0 }: DashboardProps) {
  return (
    <>
      <Header userName={userName} role={role} handleLogout={handleLogout} notificationCount={notificationCount} />
      <main>
        <Routes>
          <Route path="/" element={role === "ADMIN" ? (
            <AdminDashboard username={userName} userId={userId} accessToken={accessToken} role={role} />
          ) : role === "PROJECT_MANAGER" ? (
            <ProjectManagerDashboard username={userName} userId={userId} />
          ) : role === "DEVELOPER" ? (
            <DeveloperDashboard username={userName} userId={userId} />
          ) : (
            <p>Invalid role</p>
          )} />
          
          {role === "ADMIN" && <>
            <Route path="/clients" element={<ClientManager accessToken={accessToken} />} />
            <Route path="/projects" element={<Project accessToken={accessToken} />} />
            <Route path="/tasks" element={<Task accessToken={accessToken} role={role} />} />
          </>}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default Dashboard;
