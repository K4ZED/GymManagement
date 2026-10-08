import { useI18n } from '@/i18n'
import { daysUntil } from '@/lib/format'
import type { BookingStatus, ClassStatus, Member, MembershipStatus } from '@/types'
import { Tag, type Tone } from './ui'

const membershipTone: Record<MembershipStatus, Tone> = { ACTIVE: 'success', UPCOMING: 'info', EXPIRED: 'neutral', CANCELLED: 'danger' }
const classTone: Record<ClassStatus, Tone> = { SCHEDULED: 'info', ONGOING: 'primary', FINISHED: 'neutral', CANCELLED: 'danger' }
const bookingTone: Record<BookingStatus, Tone> = { BOOKED: 'info', ATTENDED: 'success', CANCELLED: 'neutral' }

export function MembershipTag({ status }: { status: MembershipStatus }) {
  const { t } = useI18n()
  return <Tag tone={membershipTone[status]}>{t(`membership.${status}`)}</Tag>
}

export function ClassTag({ status }: { status: ClassStatus }) {
  const { t } = useI18n()
  return <Tag tone={classTone[status]}>{t(`class.status.${status}`)}</Tag>
}

export function BookingTag({ status }: { status: BookingStatus }) {
  const { t } = useI18n()
  return <Tag tone={bookingTone[status]}>{t(`booking.${status}`)}</Tag>
}

/** Status member dari sudut pandang meja depan: akun nonaktif > membership aktif (sisa hari) > tidak aktif */
export function MemberTag({ member }: { member: Pick<Member, 'isActive' | 'activeMembership'> }) {
  const { t } = useI18n()
  if (!member.isActive) return <Tag tone="danger">{t('member.accountInactive')}</Tag>
  const m = member.activeMembership
  if (!m) return <Tag tone="neutral">{t('member.filter.INACTIVE')}</Tag>
  const d = daysUntil(m.endDate)
  return <Tag tone={d <= 7 ? 'warning' : 'success'}>{t('member.daysLeft', { n: d })}</Tag>
}
