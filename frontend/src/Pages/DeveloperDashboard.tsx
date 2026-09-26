type DeveloperDashboardProps = {
  username: string;
  userId: string;
};

function DeveloperDashboard({ username, userId }: DeveloperDashboardProps) {
    return (
        <>
        <h1>Developer Dashboard</h1>
        <p>User Name: {username}</p>
        <p>User ID: {userId}</p>
        </>
    )
}
export default DeveloperDashboard