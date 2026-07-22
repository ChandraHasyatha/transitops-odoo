const TONE = {
  // green = ready/good, amber = in progress, red = blocked, blue = neutral/info
  available: 'green',
  on_trip: 'amber',
  in_shop: 'red',
  retired: 'blue',
  off_duty: 'blue',
  suspended: 'red',
  draft: 'blue',
  dispatched: 'amber',
  completed: 'green',
  cancelled: 'red',
}

const STYLES = {
  green: 'bg-signal-green/10 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  amber: 'bg-signal-amber/10 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  red: 'bg-signal-red/10 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  blue: 'bg-signal-blue/10 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
}

export default function StatusBadge({ status }) {
  if (!status) return null
  const tone = TONE[status] || 'blue'
  const label = status.replace(/_/g, ' ')
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STYLES[tone]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${
        tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'red' ? 'bg-red-500' : 'bg-blue-500'
      }`} />
      {label}
    </span>
  )
}
