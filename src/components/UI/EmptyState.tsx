import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 'clamp(32px, 5vw, 64px) clamp(16px, 4vw, 32px)',
    border: '1.5px dashed var(--border)',
    borderRadius: '16px',
    background: 'linear-gradient(145deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box'
  }}>
    {icon && (
      <div style={{
        width: 'clamp(48px, 8vw, 64px)', 
        height: 'clamp(48px, 8vw, 64px)',
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 'clamp(16px, 3vw, 20px)',
        color: 'var(--text-disabled)',
      }}>
        {icon}
      </div>
    )}
    <div style={{ 
      fontSize: 'clamp(14px, 3vw, 15px)', 
      fontWeight: 600, 
      color: 'var(--text-primary)', 
      marginBottom: '6px', 
      fontFamily: 'Space Grotesk, sans-serif' 
    }}>
      {title}
    </div>
    {description && (
      <div style={{ 
        fontSize: 'clamp(12px, 2.5vw, 13px)', 
        color: 'var(--text-muted)', 
        maxWidth: '320px', 
        lineHeight: 1.6 
      }}>
        {description}
      </div>
    )}
    {action && <div style={{ marginTop: 'clamp(16px, 3vw, 20px)' }}>{action}</div>}
  </div>
);