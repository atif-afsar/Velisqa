import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-offset-nav flex min-h-[40vh] items-center justify-center bg-mist text-body">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
