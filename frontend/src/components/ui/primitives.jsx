import { cn } from '../../lib/utils';

/** Neutral container: hairline border, no shadow, no tint. */
export function Card({ as: Tag = 'section', className, children, ...rest }) {
  return (
    <Tag className={cn('rounded-xl border border-line bg-surface', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, aside, id }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4">
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-fg">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

const BUTTON = {
  ink: 'bg-ink text-ink-fg hover:bg-ink/90',
  danger: 'bg-danger text-white hover:bg-danger/90',
  success: 'bg-success text-white hover:bg-success/90',
  secondary: 'border border-line bg-surface text-fg hover:bg-subtle',
  ghost: 'text-muted hover:bg-subtle hover:text-fg',
};

export function Button({ variant = 'secondary', size = 'md', className, children, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'lg' ? 'min-h-[48px] px-4 text-base' : size === 'sm' ? 'h-8 px-2.5 text-xs' : 'min-h-[40px] px-3 text-sm',
        BUTTON[variant],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Two-to-four option switch (radio semantics). */
export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-subtle p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
            value === opt.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Semantic callout: the only place tinted backgrounds are used. */
export function Callout({ tone = 'warning', icon, title, children, role = 'status', className }) {
  const tones = {
    warning: 'border-warning/30 bg-warning/10 [&_.callout-title]:text-warning-fg',
    danger: 'border-danger/30 bg-danger/10 [&_.callout-title]:text-danger-fg',
    priority: 'border-priority/30 bg-priority/10 [&_.callout-title]:text-priority-fg',
    success: 'border-success/30 bg-success/10 [&_.callout-title]:text-success-fg',
  };
  return (
    <div role={role} className={cn('rounded-xl border p-3.5', tones[tone], className)}>
      <div className="flex gap-2.5">
        {icon && <span className="callout-title mt-0.5 shrink-0">{icon}</span>}
        <div className="min-w-0 space-y-1 text-sm">
          {title && <p className="callout-title font-semibold">{title}</p>}
          <div className="text-fg/80">{children}</div>
        </div>
      </div>
    </div>
  );
}

const DOT = {
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
  priority: 'bg-priority',
  neutral: 'bg-faint',
};

/** Status as a coloured dot + plain text instead of a tinted pill. */
export function StatusDot({ tone = 'neutral', children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted', className)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT[tone])} aria-hidden="true" />
      {children}
    </span>
  );
}
