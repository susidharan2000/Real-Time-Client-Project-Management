import AdminDashboard from "./AdminDashboard";
import ProjectManagerDashboard from "./ProjectManagerDashboard";
import DeveloperDashboard from "./DeveloperDashboard";
import Header from "./Header";
import { Navigate, Route, Routes } from "react-router";
import ClientManager from "../components/ClientManager";
import Project from "../components/Project";
import Task from "../components/Task";
import DeveloperTasks from "../components/DeveloperTasks";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type DashboardProps = {
  userName: string;
  userId: string;
  role: string;
  accessToken: string;
  handleLogout: ()=> Promise<void>;
};

function Dashboard({ userName, userId, role, accessToken, handleLogout }: DashboardProps) {
  const URL = 'http://localhost:3000';

  const [socket,setSocket] = useState<Socket|null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null);

  useEffect(()=>{
    if (!accessToken) return;

    const connection = io(URL,{
      auth:{token: accessToken},
      autoConnect: false,
    });

    const handleConnect = () => {
      setSocket(connection);
    };

    const handleOnlineCount = ({ onlineCount }: { onlineCount: number }) => {
      setOnlineUsers(onlineCount);
    };

    const handleDisconnect = () => {
      setSocket(null);
      setOnlineUsers(null);
    };

    connection.on("connect", handleConnect);
    connection.on("presence:count", handleOnlineCount);
    connection.on("disconnect", handleDisconnect);
    connection.connect();

    return () => {
      connection.off("connect", handleConnect);
      connection.off("presence:count", handleOnlineCount);
      connection.off("disconnect", handleDisconnect);
      connection.disconnect();
    };

  },[accessToken])

  return (
    <>
      <Header userName={userName} role={role} handleLogout={handleLogout} accessToken={accessToken}/>
      <main>
        <Routes>
          <Route path="/" element={role === "ADMIN" ? (
            <AdminDashboard username={userName} userId={userId} accessToken={accessToken} role={role} socket={socket} onlineUsers={onlineUsers} />
          ) : role === "PROJECT_MANAGER" ? (
            <ProjectManagerDashboard username={userName} userId={userId} accessToken={accessToken} role={role} socket={socket}/>
          ) : role === "DEVELOPER" ? (
            <DeveloperDashboard username={userName} userId={userId} accessToken={accessToken} role={role} />
          ) : (
            <p>Invalid role</p>
          )} />
          
          {(role === "ADMIN" || role === "PROJECT_MANAGER") && <>
            <Route path="/clients" element={<ClientManager accessToken={accessToken} socket={socket} />} />
            <Route path="/projects" element={<Project accessToken={accessToken} role={role} userId={userId} userName = {userName} socket={socket} />} />
            <Route path="/tasks" element={<Task accessToken={accessToken} role={role} />} />
          </>}

          {(role === "DEVELOPER") && <>
              <Route path="/DeveloperTasks" element={<DeveloperTasks accessToken={accessToken }/>} />
              <Route path="/tasks" element={<Navigate to="/DeveloperTasks" replace />} />
          </>}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default Dashboard;
