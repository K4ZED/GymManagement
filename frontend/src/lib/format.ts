const DAY = 86_400_000

/** Format tanggal lokal ke YYYY-MM-DD (tanpa geser zona waktu seperti toISOString). */
export function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayStr() {
  return toDateStr(new Date())
}

export function addDays(date: string, days: number) {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

/** Senin pada minggu tanggal tersebut */
export function startOfWeek(date: string) {
  const d = new Date(date + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7
  return addDays(date, -dow)
}

/** Sisa hari (dibulatkan ke atas) sampai waktu ISO tertentu; negatif jika sudah lewat */
export function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY)
}

/** Gabungkan tanggal lokal + jam "HH:mm" menjadi ISO UTC untuk dikirim ke API */
export function localToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function isoToLocalTime(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('')
}
