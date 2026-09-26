import axios from 'axios'
import { useState, type FormEvent} from 'react'
import Dashboard from './dashboard'


  
function loginpage() {
    const [accessToken, setAccessToken] = useState<string | null>(null)
      const [username, setUsername] = useState('')
      const [userId, setUserId] = useState('')
      const [password, setPassword] = useState('')
      const [role, setRole] = useState('')
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState('')
      const signedIn = Boolean(accessToken)
    
    async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const URL = 'https://real-time-client-project-management-production.up.railway.app'
      const res = await axios.post(`${URL}/auth/login`, 
        { username, password }, 
        { withCredentials: true }
      )
      setAccessToken(res.data.accessToken)
      setRole(res.data.role)
      setUsername(res.data.userName)
      setUserId(res.data.userId)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }
    return(
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <section className="w-full max-w-sm space-y-5 rounded-xl bg-white p-6 shadow" aria-busy={loading}>
        <h1 className="text-2xl font-bold">Project workspace</h1>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

        {signedIn ? (
          <>
            <Dashboard userName={username} userId={userId} role={role} />
          </>
        ) : (
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
        )}
      </section>
    </main>
    )
}

export default loginpage