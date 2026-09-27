import AdminDashboard from "./AdminDashboard";
import ProjectManagerDashboard from "./ProjectManagerDashboard";
import DeveloperDashboard from "./DeveloperDashboard";
import Header from "./Header";

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
        {role === "ADMIN" ? (
          <AdminDashboard username={userName} userId={userId} accessToken={accessToken} />
        ) : role === "PROJECT_MANAGER" ? (
          <ProjectManagerDashboard username={userName} userId={userId} />
        ) : role === "DEVELOPER" ? (
          <DeveloperDashboard username={userName} userId={userId} />
        ) : (
          <p>Invalid role</p>
        )}
      </main>
    </>
  );
}

export default Dashboard;
