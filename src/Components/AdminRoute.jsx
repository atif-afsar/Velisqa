import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-offset-nav flex min-h-[40vh] items-center justify-center bg-[#f9f5f0] text-[#514347]">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/admin" replace />
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
