import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  accentColor?: string;
  trend?: { value: string; positive: boolean };
  size?: 'normal' | 'small';
}

export const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  accentColor = '#2563EB', 
  trend,
  size = 'normal'
}: StatCardProps) => {
  const rgb = hexToRgb(accentColor);
  const softGlow = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.04)` : 'rgba(37,99,235,0.04)';
  const hoverShadow = rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)` : 'rgba(37,99,235,0.15)';

  const isSmall = size === 'small';

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: isSmall ? '12px' : '14px',
        padding: isSmall ? 'clamp(12px, 3vw, 16px)' : 'clamp(16px, 4vw, 20px)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
        transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 10px 24px ${hoverShadow}, 0 0 0 1px ${accentColor}`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.02)';
      }}
    >
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: '80px', height: '80px', 
        background: `radial-gradient(circle, ${softGlow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isSmall ? '10px' : '14px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{
          background: `linear-gradient(135deg, ${accentColor} 0%, ${lighten(accentColor)} 100%)`,
          borderRadius: isSmall ? '8px' : '10px',
          padding: isSmall ? '6px' : '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          boxShadow: `0 4px 10px ${hoverShadow}`,
          flexShrink: 0,
        }}>
          {icon}
        </div>
        {trend && (
          <span style={{
            fontSize: isSmall ? '10px' : '11px',
            fontWeight: 700, 
            color: trend.positive ? 'var(--success-dark)' : 'var(--danger)',
            background: trend.positive ? 'var(--success-bg)' : 'rgba(220,38,38,0.1)',
            padding: isSmall ? '3px 6px' : '4px 8px',
            borderRadius: '999px',
            border: `1px solid ${trend.positive ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
            whiteSpace: 'nowrap'
          }}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      <div style={{
        fontSize: isSmall ? 'clamp(20px, 5vw, 28px)' : 'clamp(24px, 6vw, 36px)',
        fontWeight: 700,
        color: '#0f172a',
        fontFamily: 'Space Grotesk, sans-serif',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: isSmall ? 'clamp(11px, 3vw, 12px)' : 'clamp(12px, 3.5vw, 13px)',
        color: '#475569',
        marginTop: isSmall ? '6px' : '8px',
        fontWeight: 500,
        lineHeight: 1.3
      }}>
        {title}
      </div>
      {subtitle && (
        <div style={{
          fontSize: isSmall ? 'clamp(9px, 2.5vw, 10px)' : 'clamp(10px, 3vw, 11px)',
          color: '#94a3b8',
          marginTop: '2px', 
          lineHeight: 1.3
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

// --- Color Utils ---
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

function lighten(hex: string): string {
  const map: Record<string, string> = {
    '#2563EB': '#06B6D4', 
    '#16A34A': '#22C55E', 
    '#D97706': '#F59E0B', 
    '#7C3AED': '#8B5CF6', 
    '#DC2626': '#EF4444', 
    '#0284C7': '#0EA5E9', 
    '#475569': '#64748b'  
  };
  return map[hex] || hex;
}