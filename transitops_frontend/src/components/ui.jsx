export function PageHeader({ eyebrow, title, action }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mono text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold text-console-bg dark:text-white">{title}</h1>
      </div>
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ label, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-800/60">
      <p className="font-medium text-slate-600 dark:text-slate-300">{label}</p>
      {hint && <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label className="mb-3 block text-sm">
      <span className="mb-1 block font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-signal-blue focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white'

export function Banner({ tone = 'red', children }) {
  const styles = {
    red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  }
  return (
    <div className={`mb-4 rounded-md border px-4 py-2.5 text-sm ${styles[tone]}`}>{children}</div>
  )
}
