import { useState, useRef, useEffect } from 'react';
import { Home, FileText, Users, LogOut, TrendingUp, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type Tab = 'home' | 'submissions' | 'employees';

interface NavbarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS = [
  { id: 'home' as Tab, label: 'Home', icon: Home },
  { id: 'submissions' as Tab, label: 'Submissions', icon: FileText },
  { id: 'employees' as Tab, label: 'Employees', icon: Users },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function getRoleLabel(role: string, teamName?: string) {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'team_lead') return `${teamName ?? ''} Lead`;
  return teamName ?? 'Employee';
}

export const Navbar = ({ activeTab, onTabChange }: NavbarProps) => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleTabClick = (id: Tab) => {
    onTabChange(id);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setUserMenuOpen(false);
    // Small delay for visual feedback before clearing state
    await new Promise(r => setTimeout(r, 300));
    logout();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Outfit:wght@400;500;600;700&display=swap');

        .nav-root {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 68px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(15,23,42,0.07);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 28px;
          font-family: 'Outfit', sans-serif;
        }

        /* subtle top accent line */
        .nav-root::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2.5px;
          background: linear-gradient(90deg, #1a5fc7 0%, #2b82f2 50%, #1a5fc7 100%);
        }

        /* ── LOGO ── */
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }

        .nav-logo-icon {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #1a5fc7 0%, #2b82f2 100%);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(29,111,216,0.3);
          flex-shrink: 0;
        }

        .nav-logo-wordmark {
          font-family: 'Cormorant Garamond', serif;
          font-size: 26px; font-weight: 600;
          background: linear-gradient(135deg, #0f2044 30%, #1d6fd8 100%);
          -webkit-background-clip: text; background-clip: text;
          color: transparent; -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em; line-height: 1;
        }

        .nav-logo-sub {
          font-size: 9.5px; font-weight: 600; letter-spacing: 0.1em;
          text-transform: uppercase; color: #94a3b8; line-height: 1.2;
          margin-top: 1px;
        }

        /* ── TABS ── */
        .nav-tabs {
          display: flex; align-items: center;
          background: #f1f5f9;
          border: 1px solid rgba(15,23,42,0.07);
          border-radius: 12px;
          padding: 4px; gap: 2px;
        }

        .nav-tab {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 18px;
          border-radius: 9px; border: none;
          background: transparent;
          color: #64748b;
          font-family: 'Outfit', sans-serif;
          font-size: 13.5px; font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
          position: relative;
        }

        .nav-tab:hover:not(.nav-tab--active) {
          background: rgba(255,255,255,0.7);
          color: #0f172a;
        }

        .nav-tab--active {
          background: #ffffff;
          color: #1d6fd8;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04);
        }

        .nav-tab--active svg {
          color: #1d6fd8;
        }

        /* ── USER AREA ── */
        .nav-user-area {
          display: flex; align-items: center; gap: 12px;
          flex-shrink: 0;
        }

        .nav-user-btn {
          display: flex; align-items: center; gap: 10px;
          background: #f8fafc;
          border: 1px solid rgba(15,23,42,0.09);
          border-radius: 10px;
          padding: 6px 12px 6px 6px;
          cursor: pointer;
          transition: all 0.18s ease;
          position: relative;
        }

        .nav-user-btn:hover {
          background: #f1f5f9;
          border-color: rgba(29,111,216,0.2);
          box-shadow: 0 2px 8px rgba(29,111,216,0.08);
        }

        .nav-avatar {
          width: 32px; height: 32px; border-radius: 8px;
          background: linear-gradient(135deg, #1a5fc7, #2b82f2);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: #fff;
          letter-spacing: 0.02em; flex-shrink: 0;
        }

        .nav-user-info { text-align: left; }

        .nav-user-name {
          font-size: 13px; font-weight: 600; color: #0f172a;
          line-height: 1.2; white-space: nowrap;
        }

        .nav-user-role {
          font-size: 10.5px; font-weight: 500; color: #94a3b8;
          line-height: 1.2; white-space: nowrap;
        }

        .nav-chevron {
          color: #94a3b8; transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .nav-chevron--open { transform: rotate(180deg); }

        /* ── DROPDOWN ── */
        .nav-dropdown {
          position: absolute;
          top: calc(100% + 8px); right: 0;
          min-width: 200px;
          background: #ffffff;
          border: 1px solid rgba(15,23,42,0.09);
          border-radius: 12px;
          box-shadow: 0 16px 40px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06);
          overflow: hidden;
          animation: dropIn 0.18s ease;
          z-index: 200;
        }

        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .nav-dropdown-header {
          padding: 14px 16px 12px;
          border-bottom: 1px solid #f1f5f9;
        }

        .nav-dropdown-name {
          font-size: 14px; font-weight: 600; color: #0f172a;
        }

        .nav-dropdown-meta {
          font-size: 11.5px; color: #94a3b8; margin-top: 2px; font-weight: 500;
        }

        .nav-dropdown-body { padding: 6px; }

        .nav-dropdown-item {
          width: 100%;
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px;
          border-radius: 8px; border: none;
          background: transparent;
          font-family: 'Outfit', sans-serif;
          font-size: 13.5px; font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .nav-dropdown-item--danger {
          color: #dc2626;
        }

        .nav-dropdown-item--danger:hover {
          background: rgba(220,38,38,0.07);
          color: #b91c1c;
        }

        .nav-dropdown-item--loading {
          opacity: 0.65; cursor: not-allowed;
        }

        .nav-logout-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(220,38,38,0.25);
          border-top-color: #dc2626;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── MOBILE TOGGLE ── */
        .nav-mobile-toggle {
          display: none;
          background: #f1f5f9; border: 1px solid rgba(15,23,42,0.08);
          border-radius: 8px; padding: 8px;
          color: #334155; cursor: pointer;
          align-items: center; justify-content: center;
          transition: background 0.15s;
        }

        .nav-mobile-toggle:hover { background: #e2e8f0; }

        /* ── MOBILE MENU ── */
        .nav-mobile-menu {
          position: fixed;
          top: 68px; left: 0; right: 0; z-index: 99;
          background: #ffffff;
          border-bottom: 1px solid rgba(15,23,42,0.07);
          padding: 16px 20px 20px;
          box-shadow: 0 16px 40px rgba(15,23,42,0.1);
          animation: slideDown 0.2s ease;
          display: flex; flex-direction: column; gap: 6px;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .nav-mobile-tab {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          border-radius: 10px; border: none;
          background: transparent;
          font-family: 'Outfit', sans-serif;
          font-size: 15px; font-weight: 500;
          color: #475569; cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }

        .nav-mobile-tab:hover { background: #f8fafc; color: #0f172a; }
        .nav-mobile-tab--active { background: #eff6ff; color: #1d6fd8; font-weight: 600; }

        .nav-mobile-divider {
          height: 1px; background: #f1f5f9; margin: 6px 0;
        }

        .nav-mobile-user {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px;
        }

        .nav-mobile-user-info { display: flex; align-items: center; gap: 10px; }

        .nav-mobile-logout {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 14px;
          border-radius: 8px; border: 1px solid rgba(220,38,38,0.2);
          background: rgba(220,38,38,0.06);
          color: #dc2626;
          font-family: 'Outfit', sans-serif;
          font-size: 13.5px; font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .nav-mobile-logout:hover { background: rgba(220,38,38,0.12); }
        .nav-mobile-logout:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── RESPONSIVE ── */
        @media (max-width: 820px) {
          .nav-tabs { display: none; }
          .nav-user-area { display: none; }
          .nav-mobile-toggle { display: flex; }
        }
      `}</style>

      <header className="nav-root">
        {/* Logo */}
        <div className="nav-logo">
          <div className="nav-logo-icon">
            <TrendingUp size={20} color="#fff" />
          </div>
          <div>
            <div className="nav-logo-wordmark">Velocity</div>
            <div className="nav-logo-sub">Appraisal Platform</div>
          </div>
        </div>

        {/* Desktop Tabs */}
        <nav className="nav-tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              className={`nav-tab${activeTab === id ? ' nav-tab--active' : ''}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        {/* Desktop User Menu */}
        <div className="nav-user-area">
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            <button
              className="nav-user-btn"
              onClick={() => setUserMenuOpen(o => !o)}
            >
              <div className="nav-avatar">
                {user?.displayName ? getInitials(user.displayName) : 'U'}
              </div>
              <div className="nav-user-info">
                <div className="nav-user-name">{user?.displayName}</div>
                <div className="nav-user-role">
                  {getRoleLabel(user?.role ?? '', user?.teamName)}
                </div>
              </div>
              <ChevronDown size={14} className={`nav-chevron${userMenuOpen ? ' nav-chevron--open' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="nav-dropdown">
                <div className="nav-dropdown-header">
                  <div className="nav-dropdown-name">{user?.displayName}</div>
                  <div className="nav-dropdown-meta">
                    {getRoleLabel(user?.role ?? '', user?.teamName)}
                    {user?.teamName && user.role !== 'super_admin' && ` · ${user.teamName}`}
                  </div>
                </div>
                <div className="nav-dropdown-body">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className={`nav-dropdown-item nav-dropdown-item--danger${loggingOut ? ' nav-dropdown-item--loading' : ''}`}
                  >
                    {loggingOut
                      ? <><div className="nav-logout-spinner" /> Signing out…</>
                      : <><LogOut size={15} /> Sign Out</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="nav-mobile-menu">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              className={`nav-mobile-tab${activeTab === id ? ' nav-mobile-tab--active' : ''}`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}

          <div className="nav-mobile-divider" />

          <div className="nav-mobile-user">
            <div className="nav-mobile-user-info">
              <div className="nav-avatar" style={{ width: 36, height: 36, borderRadius: 9, fontSize: 13 }}>
                {user?.displayName ? getInitials(user.displayName) : 'U'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{user?.displayName}</div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 500 }}>
                  {getRoleLabel(user?.role ?? '', user?.teamName)}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="nav-mobile-logout"
            >
              {loggingOut
                ? <><div className="nav-logout-spinner" style={{ borderColor: 'rgba(220,38,38,0.25)', borderTopColor: '#dc2626' }} /> Signing out…</>
                : <><LogOut size={15} /> Sign Out</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div style={{ height: '68px' }} />
    </>
  );
};