import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCssVars } from '@/lib/theme'

interface Datum {
  label: string
  value: number
}

/**
 * Bar chart satu seri. Batang berwarna tinta; satu batang (mis. hari ini) bisa disorot dengan aksen.
 * Grid tipis, nilai langsung di atas batang, tooltip saat hover.
 */
export function SimpleBarChart({ data, format, highlightIndex, height = 220 }: { data: Datum[]; format: (n: number) => string; highlightIndex?: number; height?: number }) {
  const c = useCssVars(['primary', 'border', 'muted', 'ink', 'surface-2', 'text'])
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 4, left: -20, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={c.border} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: c.border }} tick={{ fill: c.muted, fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: c.muted, fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: c['surface-2'] }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="border bg-surface px-3 py-2 text-xs">
                  <p className="text-muted">{label}</p>
                  <p className="font-mono font-semibold text-text">{format(Number(payload[0].value))}</p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === highlightIndex ? c.primary : c.ink} />
            ))}
            <LabelList dataKey="value" position="top" fill={c.muted} fontSize={11} formatter={(v) => format(Number(v))} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
