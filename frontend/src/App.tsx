import { useEffect, useState } from 'react'
import './index.css'
import Login from './Pages/loginpage'
import axios from 'axios'
function App() {
  const [accessToken,setAccessToken] = useState('');
  const [username, setUsername] = useState('')
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('')
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(()=>{
    try{
      const URL = 'http://localhost:3000';
      //const URL = 'https://real-time-client-project-management-production.up.railway.app';

      axios.post(`${URL}/auth/checksession`,{}, {withCredentials:true})
      .then((res)=>{
        setAccessToken(res.data.accessToken)
        setUsername(res.data.userName)
        setUserId(res.data.userId)
        setRole(res.data.role)
      })
      .catch((err)=>{
        console.error(err)
      })
      .finally(()=>{
        setCheckingSession(false);
      })
    }
    catch(err){
      console.error(err)
    }
  },[])

  return (
    <>
    {checkingSession ? (
      <div>Loading...</div>
    ) : (
      <Login initialSession={accessToken ? { accessToken, username, userId, role } : undefined} />
    )}
    </>
  )
}

export default App
