type ProjectManagerDashboardProps = {
  username: string;
  userId: string;
};

function ProjectManagerDashboard({ username, userId }: ProjectManagerDashboardProps) {
    return (
        <>
        <h1>Project Manager Dashboard</h1>
        <p>User Name: {username}</p>
        <p>User ID: {userId}</p>
        </>
    )
}
export default ProjectManagerDashboard