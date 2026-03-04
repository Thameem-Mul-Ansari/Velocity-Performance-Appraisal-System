import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';
type BadgeSize = 'normal' | 'small';

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: { background: 'var(--success-bg)', color: 'var(--success-dark)', border: '1px solid rgba(22,163,74,0.2)' },
  warning: { background: 'rgba(217,119,6,0.1)', color: 'var(--warning)', border: '1px solid rgba(217,119,6,0.2)' },
  danger: { background: 'rgba(220,38,38,0.1)', color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.2)' },
  info: { background: 'rgba(2,132,199,0.1)', color: 'var(--info)', border: '1px solid rgba(2,132,199,0.2)' },
  default: { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export const Badge = ({ label, variant = 'default', size = 'normal' }: BadgeProps) => {
  const isSmall = size === 'small';

  return (
    <span style={{
      ...variantStyles[variant],
      padding: isSmall ? '2px 8px' : '4px 12px',
      borderRadius: '999px',
      fontSize: isSmall ? '10px' : '11px',
      fontWeight: 600,
      letterSpacing: isSmall ? '0.02em' : '0.04em',
      display: 'inline-block',
      whiteSpace: 'nowrap',
      lineHeight: isSmall ? '1.4' : '1.5',
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      verticalAlign: 'middle'
    }}>
      {label}
    </span>
  );
};