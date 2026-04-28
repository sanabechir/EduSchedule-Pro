import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EmploiTempsPage from './pages/EmploiTempsPage'
import PointagePage from './pages/PointagePage'
import CahiersPage from './pages/CahiersPage'
import VacationsPage from './pages/VacationsPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Route publique */}
          <Route path="/login" element={<LoginPage />} />

          {/* Routes protégées */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } />
          <Route path="/emploi-temps" element={
            <PrivateRoute>
              <EmploiTempsPage />
            </PrivateRoute>
          } />
          <Route path="/pointage" element={
            <PrivateRoute roles={['enseignant']}>
              <PointagePage />
            </PrivateRoute>
          } />
          <Route path="/cahiers" element={
            <PrivateRoute roles={['admin', 'delegue', 'surveillant']}>
              <CahiersPage />
            </PrivateRoute>
          } />
          <Route path="/vacations" element={
            <PrivateRoute roles={['admin', 'enseignant', 'surveillant', 'comptable']}>
              <VacationsPage />
            </PrivateRoute>
          } />

          {/* Redirection par défaut */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App