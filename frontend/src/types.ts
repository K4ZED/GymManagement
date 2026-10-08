// Tipe data sesuai API_CONTRACT.md v0.1 (@backend)

export type Role = 'ADMIN' | 'STAFF' | 'TRAINER' | 'MEMBER'

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Me extends User {
  member: Member | null
  trainer: Trainer | null
}

export interface Plan {
  id: string
  name: string
  description: string | null
  durationDays: number
  price: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type MembershipStatus = 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'CANCELLED'

export interface Membership {
  id: string
  memberId: string
  planId: string
  startDate: string
  endDate: string
  price: number
  notes: string | null
  cancelledAt: string | null
  createdAt: string
  status: MembershipStatus
  plan: Plan
}

export type Gender = 'MALE' | 'FEMALE'

export interface Member {
  id: string
  userId: string
  memberCode: string
  name: string
  email: string
  phone: string | null
  isActive: boolean
  gender: Gender | null
  birthDate: string | null
  address: string | null
  emergencyContact: string | null
  joinedAt: string
  activeMembership: Membership | null
}

export interface Trainer {
  id: string
  userId: string
  name: string
  email: string
  phone: string | null
  isActive: boolean
  specialization: string | null
  bio: string | null
}

export type ClassStatus = 'SCHEDULED' | 'ONGOING' | 'FINISHED' | 'CANCELLED'
export type BookingStatus = 'BOOKED' | 'CANCELLED' | 'ATTENDED'

export interface ClassSession {
  id: string
  name: string
  description: string | null
  startAt: string
  endAt: string
  capacity: number
  room: string | null
  cancelledAt: string | null
  status: ClassStatus
  trainer: { id: string; name: string }
  bookedCount: number
  availableSlots: number
  myBooking?: { id: string; status: BookingStatus } | null
}

export interface MemberRef {
  id: string
  memberCode: string
  name: string
}

export interface ClassDetail extends ClassSession {
  bookings?: { id: string; status: BookingStatus; createdAt: string; member: MemberRef }[]
}

export interface Booking {
  id: string
  status: BookingStatus
  createdAt: string
  member: MemberRef
  session: {
    id: string
    name: string
    startAt: string
    endAt: string
    room: string | null
    cancelledAt: string | null
    trainer: { id: string; name: string }
  }
}

export interface CheckIn {
  id: string
  checkedInAt: string
  member: MemberRef
  checkedInBy: { id: string; name: string } | null
}

export interface DashboardSummary {
  totalMembers: number
  activeMembers: number
  expiringIn7Days: number
  newMembersThisMonth: number
  checkInsToday: number
  classesToday: number
  membershipRevenueThisMonth: number
  checkInsLast7Days: { date: string; count: number }[]
}

export type ExpiringMembership = Membership & { member: MemberRef & { phone: string | null } }

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Paged<T> {
  data: T[]
  meta: PageMeta
}
