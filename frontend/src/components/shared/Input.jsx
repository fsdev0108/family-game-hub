export default function Input({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-400 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full bg-dark-600/60 border rounded-xl px-4 py-2.5 text-slate-100
          placeholder-slate-600 outline-none transition-all duration-200
          ${error
            ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
            : 'border-border focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
          }
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
