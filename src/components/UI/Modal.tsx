import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export const Modal = ({ open, onClose, title, children, width = 600 }: ModalProps) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15, 23, 42, 0.4)', 
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(12px, 3vw, 24px)', /* Shrinks overlay padding on mobile */
      animation: 'fadeIn 0.15s ease',
      boxSizing: 'border-box'
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-primary)', 
        border: '1px solid var(--border)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: width,
        maxHeight: 'min(90vh, 800px)', /* Prevents modal from getting too tall */
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)', 
        animation: 'slideUp 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'clamp(16px, 4vw, 20px) clamp(16px, 4vw, 24px)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h3 style={{ 
            fontSize: 'clamp(15px, 3.5vw, 17px)', 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            margin: 0,
            paddingRight: '12px'
          }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '6px', color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
            flexShrink: 0
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Body */}
        <div style={{ 
          padding: 'clamp(16px, 4vw, 24px)', 
          overflowY: 'auto', 
          flex: 1,
          WebkitOverflowScrolling: 'touch' /* Enables smooth momentum scrolling on iOS */
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};