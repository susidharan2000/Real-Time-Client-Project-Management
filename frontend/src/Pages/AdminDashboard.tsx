type AdminDashboardProps = {
  username: string;
  userId: string;
};

function AdminDashboard({ username, userId }: AdminDashboardProps) {
    return (
        <>
        <h1>Admin Dashboard</h1>
        <p>User Name: {username}</p>
        <p>User ID: {userId}</p>
        </>
    )
}
export default AdminDashboard