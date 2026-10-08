// Semua pemanggilan endpoint backend (lihat API_CONTRACT.md)
import type {
  Booking,
  BookingStatus,
  CheckIn,
  ClassDetail,
  ClassSession,
  DashboardSummary,
  ExpiringMembership,
  Gender,
  Me,
  Member,
  Membership,
  Plan,
  Role,
  Trainer,
  User,
} from '@/types'
import { http } from './http'

export { ApiError, tokenStore, setUnauthorizedHandler } from './http'

export interface PageParams {
  page?: number
  limit?: number
}

export interface MemberInput {
  name: string
  email: string
  password?: string
  phone?: string | null
  gender?: Gender | null
  birthDate?: string | null
  address?: string | null
  emergencyContact?: string | null
  planId?: string
  startDate?: string
}

export interface PlanInput {
  name: string
  description?: string | null
  durationDays: number
  price: number
  isActive?: boolean
}

export interface TrainerInput {
  name: string
  email: string
  password: string
  phone?: string | null
  specialization?: string | null
  bio?: string | null
}

export interface ClassInput {
  name: string
  description?: string | null
  trainerId: string
  startAt: string
  endAt: string
  capacity: number
  room?: string | null
}

export const api = {
  auth: {
    login: (email: string, password: string) => http.post<{ token: string; user: User }>('/auth/login', { email, password }),
    me: () => http.get<Me>('/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) => http.patch<{ success: true }>('/auth/me/password', { currentPassword, newPassword }),
  },

  users: {
    list: (p?: PageParams & { role?: Role; q?: string }) => http.page<User>('/users', { ...p }),
    create: (body: { name: string; email: string; password: string; phone?: string; role: 'ADMIN' | 'STAFF' }) => http.post<User>('/users', body),
    update: (id: string, body: Partial<{ name: string; phone: string; isActive: boolean; password: string }>) => http.patch<User>(`/users/${id}`, body),
  },

  plans: {
    list: (includeInactive = false) => http.get<Plan[]>('/plans', { includeInactive: includeInactive || undefined }),
    create: (body: PlanInput) => http.post<Plan>('/plans', body),
    update: (id: string, body: Partial<PlanInput>) => http.patch<Plan>(`/plans/${id}`, body),
    deactivate: (id: string) => http.del<Plan>(`/plans/${id}`),
  },

  members: {
    list: (p?: PageParams & { q?: string; status?: 'ACTIVE' | 'INACTIVE' }) => http.page<Member>('/members', { ...p }),
    get: (id: string) => http.get<Member>(`/members/${id}`),
    create: (body: MemberInput) => http.post<Member>('/members', body),
    update: (id: string, body: Partial<MemberInput & { isActive: boolean }>) => http.patch<Member>(`/members/${id}`, body),
    deactivate: (id: string) => http.del<Member>(`/members/${id}`),
    memberships: (id: string) => http.get<Membership[]>(`/members/${id}/memberships`),
    /** Daftar / perpanjang membership */
    addMembership: (id: string, body: { planId: string; startDate?: string; notes?: string }) => http.post<Membership>(`/members/${id}/memberships`, body),
  },

  memberships: {
    cancel: (id: string) => http.post<Membership>(`/memberships/${id}/cancel`),
  },

  trainers: {
    list: (includeInactive = false) => http.get<Trainer[]>('/trainers', { includeInactive: includeInactive || undefined }),
    get: (id: string) => http.get<Trainer>(`/trainers/${id}`),
    create: (body: TrainerInput) => http.post<Trainer>('/trainers', body),
    update: (id: string, body: Partial<Omit<TrainerInput, 'email' | 'password'> & { isActive: boolean }>) => http.patch<Trainer>(`/trainers/${id}`, body),
  },

  classes: {
    list: (p?: { from?: string; to?: string; trainerId?: string; includeCancelled?: boolean }) => http.get<ClassSession[]>('/classes', { ...p }),
    get: (id: string) => http.get<ClassDetail>(`/classes/${id}`),
    create: (body: ClassInput) => http.post<ClassSession>('/classes', body),
    update: (id: string, body: Partial<ClassInput>) => http.patch<ClassSession>(`/classes/${id}`, body),
    cancel: (id: string) => http.post<ClassSession>(`/classes/${id}/cancel`),
    /** Hapus permanen; ditolak CLASS_HAS_BOOKINGS jika pernah ada booking (pakai cancel) */
    remove: (id: string) => http.del<{ id: string; deleted: true }>(`/classes/${id}`),
    /** MEMBER: tanpa memberId. ADMIN/STAFF: isi memberId */
    book: (id: string, memberId?: string) => http.post<{ id: string; status: BookingStatus }>(`/classes/${id}/bookings`, memberId ? { memberId } : {}),
  },

  bookings: {
    list: (p?: PageParams & { memberId?: string; sessionId?: string; status?: BookingStatus; upcoming?: boolean }) => http.page<Booking>('/bookings', { ...p }),
    cancel: (id: string) => http.post<Booking>(`/bookings/${id}/cancel`),
    attend: (id: string) => http.post<Booking>(`/bookings/${id}/attend`),
  },

  checkins: {
    create: (body: { memberCode: string } | { memberId: string }) => http.post<CheckIn & { activeMembership: Membership }>('/checkins', body),
    list: (p?: PageParams & { memberId?: string; date?: string; from?: string; to?: string }) => http.page<CheckIn>('/checkins', { ...p }),
  },

  dashboard: {
    summary: () => http.get<DashboardSummary>('/dashboard/summary'),
    expiring: (days = 7) => http.get<ExpiringMembership[]>('/dashboard/expiring', { days }),
  },
}
