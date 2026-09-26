import AdminDashboard from "../Pages/AdminDashboard";
import  ProjectManagerDashboard from "../Pages/ProjectManagerDashboard";
import DeveloperDashboard from "../Pages/DeveloperDashboard";

type DashboardProps ={
  userName: string;
  userId: string;
  role: string;
};

function dashboard({ userName, userId, role }: DashboardProps) {
    return(
        (role === "ADMIN") ? < AdminDashboard username={userName} userId={userId} /> : role === "PROJECT_MANAGER" ? < ProjectManagerDashboard username={userName} userId={userId}/> : role === "DEVELOPER" ? < DeveloperDashboard username={userName} userId={userId}/> : <p>Invalid role</p>
    )
}

export default dashboard