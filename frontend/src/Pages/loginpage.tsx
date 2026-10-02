import axios from 'axios'
import { useState, type FormEvent} from 'react'
import Dashboard from './dashboard'
import { useNavigate } from 'react-router'

type LoginPageProps = {
  initialSession?: {
    accessToken: string;
    username: string;
    userId: string;
    role: string;
  };
};

const URL = 'http://localhost:3000';
//const URL = 'https://real-time-client-project-management-production.up.railway.app';

function LoginPage({ initialSession }: LoginPageProps) {
    const navigate = useNavigate();
    const [accessToken, setAccessToken] = useState<string | null>(initialSession?.accessToken ?? null)
      const [username, setUsername] = useState(initialSession?.username ?? '')
      const [userId, setUserId] = useState(initialSession?.userId ?? '')
      const [password, setPassword] = useState('')
      const [role, setRole] = useState(initialSession?.role ?? '')
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState('')
      const signedIn = Boolean(accessToken)

    //login
    async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {

      const res = await axios.post(`${URL}/auth/login`, 
        { username, password }, 
        { withCredentials: true }
      )
      setAccessToken(res.data.accessToken)
      setRole(res.data.role)
      setUsername(res.data.userName)
      setUserId(res.data.userId)
      setPassword('')
      navigate('/', { replace: true });
    } catch (err) {
      if (axios.isAxiosError<{ message: string }>(err)) {
        setError(err.response?.data?.message ?? 'Could not reach the server');
      } else {
        setError('Sign-in failed');
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
  try {
    const res = await axios.post(
      `${URL}/auth/logout`,
      {},
      { withCredentials: true }
    );

    if (res.status === 200) {
      setUsername("");
      setUserId("");
      setAccessToken("");
      navigate('/', { replace: true });
    }
  } catch (err) {
    console.error("Logout failed:", err);
  }
 }

    if (signedIn) {
      return <Dashboard userName={username} userId={userId} role={role} accessToken={accessToken ?? ''} handleLogout={handleLogout}/>
    }

    return(
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <section className="w-full max-w-sm space-y-5 rounded-xl bg-white p-6 shadow" aria-busy={loading}>
        <h1 className="text-2xl font-bold">Project workspace</h1>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

          <form className="space-y-4" onSubmit={login}>
            <label className="block">
              Username
              <input
                className="mt-1 w-full rounded border border-slate-300 p-2"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required disabled={loading}
              />
            </label>
            <label className="block">
              Password
              <input
                className="mt-1 w-full rounded border border-slate-300 p-2"
                type="password" autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required disabled={loading}
              />
            </label>
            <button className="w-full rounded bg-slate-800 p-3 text-white disabled:opacity-50" disabled={loading || !username.trim() || !password}>
              {loading ? 'Please wait…' : 'Sign in'}
            </button>
          </form>
      </section>
    </main>
    )
}

export default LoginPage
