import type { ReactNode } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { homeFor, useAuth } from '@/lib/auth'
import { useI18n } from '@/i18n'
import type { Role } from '@/types'
import { Spinner } from '@/components/ui'
import AdminLayout from '@/layouts/AdminLayout'
import PortalLayout from '@/layouts/PortalLayout'
import LoginPage from '@/pages/Login'
import DashboardPage from '@/pages/admin/Dashboard'
import CheckInPage from '@/pages/admin/CheckIn'
import MembersPage from '@/pages/admin/Members'
import MemberDetailPage from '@/pages/admin/MemberDetail'
import ClassesPage from '@/pages/admin/Classes'
import PlansPage from '@/pages/admin/Plans'
import TrainersPage from '@/pages/admin/Trainers'
import UsersPage from '@/pages/admin/Users'
import MemberHomePage from '@/pages/member/Home'
import MemberSchedulePage from '@/pages/member/Schedule'
import MemberHistoryPage from '@/pages/member/History'
import ProfilePage from '@/pages/Profile'
import TrainerClassesPage from '@/pages/trainer/Classes'

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner className="min-h-screen" />
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}

function NotFound() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <p className="display text-8xl">404</p>
      <p className="text-muted">{t('errors.notFoundPage')}</p>
      <Link to="/" className="text-sm font-semibold underline decoration-primary decoration-2 underline-offset-4">
        {t('common.back')}
      </Link>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  return (
    <Routes>
      <Route path="/" element={loading ? <Spinner className="min-h-screen" /> : <Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <LoginPage />} />

      <Route
        path="/admin"
        element={
          <RequireRole roles={['ADMIN', 'STAFF']}>
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="checkin" element={<CheckInPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/:id" element={<MemberDetailPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="trainers" element={<TrainersPage />} />
        <Route
          path="users"
          element={
            <RequireRole roles={['ADMIN']}>
              <UsersPage />
            </RequireRole>
          }
        />
      </Route>

      <Route
        path="/app"
        element={
          <RequireRole roles={['MEMBER']}>
            <PortalLayout />
          </RequireRole>
        }
      >
        <Route index element={<MemberHomePage />} />
        <Route path="schedule" element={<MemberSchedulePage />} />
        <Route path="history" element={<MemberHistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route
        path="/trainer"
        element={
          <RequireRole roles={['TRAINER']}>
            <PortalLayout />
          </RequireRole>
        }
      >
        <Route index element={<TrainerClassesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
