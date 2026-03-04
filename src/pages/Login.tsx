import React, { useState, useEffect } from 'react';
import { Mail, Eye, EyeOff, ArrowRight, Sparkles, WalletCards } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const brands = [
  'Prashanti Sarees',
  'Maatshi Fashions',
  'Wedtree Lifestyles',
  'Manmandir Silks',
];

export const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeBrand, setActiveBrand] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBrand(prev => (prev + 1) % brands.length);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email.trim(), password.trim());
    if (!ok) setError('Invalid email address or mobile number.');
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy: #0a1628;
          --navy-mid: #0f2044;
          --navy-light: #162a55;
          --gold: #c9a84c;
          --gold-light: #e2c06e;
          --gold-pale: #f5e9c8;
          --blue: #1d6fd8;
          --blue-bright: #2b82f2;
          --white: #ffffff;
          --white-90: rgba(255,255,255,0.9);
          --white-60: rgba(255,255,255,0.6);
          --white-20: rgba(255,255,255,0.2);
          --white-10: rgba(255,255,255,0.1);
          --white-05: rgba(255,255,255,0.05);
          --error: #ff6b6b;
        }

        .vel-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: 'Outfit', sans-serif;
          background: var(--navy);
          overflow: hidden;
        }

        /* LEFT PANEL */
        .vel-left {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px;
          overflow: hidden;
        }

        .vel-left-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 80% at 30% 20%, rgba(29,111,216,0.22) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 80% 80%, rgba(201,168,76,0.12) 0%, transparent 50%),
            linear-gradient(160deg, #0a1628 0%, #0c1e40 50%, #0a1628 100%);
        }

        /* Geometric grid lines */
        .vel-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* Decorative diagonal stripe */
        .vel-stripe {
          position: absolute;
          top: -20%;
          right: -10%;
          width: 2px;
          height: 140%;
          background: linear-gradient(to bottom, transparent, rgba(201,168,76,0.4), transparent);
          transform: rotate(15deg);
        }
        .vel-stripe-2 {
          position: absolute;
          top: -20%;
          right: 6%;
          width: 1px;
          height: 140%;
          background: linear-gradient(to bottom, transparent, rgba(201,168,76,0.15), transparent);
          transform: rotate(15deg);
        }

        /* Glowing orb */
        .vel-orb {
          position: absolute;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(29,111,216,0.25) 0%, transparent 70%);
          bottom: -80px;
          left: -60px;
          pointer-events: none;
        }

        .vel-left-content {
          position: relative;
          z-index: 2;
        }

        .vel-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(201,168,76,0.12);
          border: 1px solid rgba(201,168,76,0.3);
          border-radius: 100px;
          padding: 6px 14px;
          margin-bottom: 36px;
        }

        .vel-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold);
          animation: pulse 2s ease infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }

        .vel-eyebrow-text {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--gold-light);
        }

        .vel-logo-row {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          margin-bottom: 20px;
        }

        .vel-logo-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 80px;
          font-weight: 600;
          line-height: 0.9;
          color: var(--white);
          letter-spacing: -0.02em;
        }

        .vel-logo-v {
          color: var(--gold-light);
        }

        .vel-tagline {
          font-size: 14px;
          font-weight: 400;
          color: var(--white-60);
          letter-spacing: 0.06em;
          margin-bottom: 52px;
          font-family: 'Outfit', sans-serif;
        }

        /* Animated brand ticker */
        .vel-brands-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--white-60);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .vel-brands-track {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .vel-brand-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid transparent;
          transition: all 0.4s ease;
          cursor: default;
        }

        .vel-brand-item.active {
          background: rgba(201,168,76,0.08);
          border-color: rgba(201,168,76,0.25);
        }

        .vel-brand-tick {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          flex-shrink: 0;
          transition: background 0.4s;
        }

        .vel-brand-item.active .vel-brand-tick {
          background: var(--gold);
        }

        .vel-brand-name {
          font-size: 13px;
          font-weight: 400;
          color: var(--white-60);
          transition: color 0.4s;
        }

        .vel-brand-item.active .vel-brand-name {
          color: var(--gold-pale);
          font-weight: 500;
        }

        /* Divider line at bottom of left */
        .vel-left-footer {
          position: absolute;
          bottom: 32px;
          left: 64px;
          right: 64px;
          border-top: 1px solid var(--white-10);
          padding-top: 20px;
        }

        .vel-left-footer p {
          font-size: 11px;
          color: var(--white-20);
          letter-spacing: 0.04em;
        }

        /* RIGHT PANEL */
        .vel-right {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 64px;
          background: var(--white);
          overflow: hidden;
        }

        .vel-right-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 80% 10%, rgba(29,111,216,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 10% 90%, rgba(201,168,76,0.04) 0%, transparent 60%);
          pointer-events: none;
        }

        /* Subtle geometric corner accent */
        .vel-corner-accent {
          position: absolute;
          top: 0;
          right: 0;
          width: 160px;
          height: 160px;
          border-bottom-left-radius: 100%;
          background: linear-gradient(135deg, rgba(29,111,216,0.06), transparent);
        }

        .vel-form-container {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 400px;
          opacity: 0;
          transform: translateY(20px);
          animation: slideUp 0.6s ease 0.1s forwards;
        }

        @keyframes slideUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .vel-form-header {
          margin-bottom: 44px;
        }

        .vel-form-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--blue);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vel-form-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(29,111,216,0.15);
        }

        .vel-form-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 38px;
          font-weight: 600;
          color: var(--navy);
          line-height: 1.1;
          letter-spacing: -0.01em;
          margin-bottom: 8px;
        }

        .vel-form-subtitle {
          font-size: 13px;
          color: #64748b;
          font-weight: 400;
        }

        /* Input group */
        .vel-input-group {
          margin-bottom: 20px;
        }

        .vel-input-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .vel-input-wrap {
          position: relative;
        }

        .vel-input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .vel-input-wrap:focus-within .vel-input-icon {
          color: var(--blue);
        }

        .vel-input {
          width: 100%;
          padding: 15px 16px 15px 46px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: var(--navy);
          background: #f8fafc;
          outline: none;
          transition: all 0.2s ease;
        }

        .vel-input:focus {
          border-color: var(--blue);
          background: #fff;
          box-shadow: 0 0 0 3px rgba(29,111,216,0.1);
        }

        .vel-input::placeholder {
          color: #cbd5e1;
          font-weight: 300;
        }

        .vel-eye-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        }
        .vel-eye-btn:hover { color: var(--navy); }

        /* Error */
        .vel-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,107,107,0.07);
          border: 1px solid rgba(255,107,107,0.25);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 20px;
          font-size: 12.5px;
          color: #dc2626;
          font-weight: 500;
        }

        .vel-error-icon {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #dc2626;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Submit button */
        .vel-submit {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #1a5fc7 0%, #1d6fd8 50%, #2b82f2 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(29,111,216,0.3), 0 2px 6px rgba(29,111,216,0.2);
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.02em;
        }

        .vel-submit::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent 60%);
          pointer-events: none;
        }

        .vel-submit:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(29,111,216,0.4), 0 4px 10px rgba(29,111,216,0.25);
        }

        .vel-submit:disabled {
          cursor: not-allowed;
          opacity: 0.75;
        }

        .vel-submit-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Divider */
        .vel-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 28px 0 0;
        }

        .vel-divider-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .vel-divider-text {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }

        /* Footer note */
        .vel-form-footer {
          margin-top: 24px;
          text-align: center;
        }

        .vel-form-footer p {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.6;
        }

        .vel-form-footer strong {
          color: var(--blue);
          font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .vel-root { grid-template-columns: 1fr; }
          .vel-left { display: none; }
          .vel-right { padding: 40px 28px; }
        }
      `}</style>

      <div className="vel-root">

        {/* ── LEFT PANEL ── */}
        <div className="vel-left">
          <div className="vel-left-bg" />
          <div className="vel-grid" />
          <div className="vel-stripe" />
          <div className="vel-stripe-2" />
          <div className="vel-orb" />

          <div className="vel-left-content">
            <div className="vel-eyebrow">
              <div className="vel-eyebrow-dot" />
              <span className="vel-eyebrow-text">Prashanti Group</span>
            </div>

            <div className="vel-logo-row">
              <div className="vel-logo-text">
                <span className="vel-logo-v">V</span>elocity
              </div>
            </div>

            <p className="vel-tagline">Appraisal Review Submission Platform</p>

            <div className="vel-brands-label">Serving our brands</div>
            <div className="vel-brands-track">
              {brands.map((brand, i) => (
                <div key={brand} className={`vel-brand-item${activeBrand === i ? ' active' : ''}`}>
                  <div className="vel-brand-tick" />
                  <span className="vel-brand-name">{brand}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vel-left-footer">
            <p>© {new Date().getFullYear()} Prashanti Group · All rights reserved</p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="vel-right">
          <div className="vel-right-bg" />
          <div className="vel-corner-accent" />

          <div className="vel-form-container">
            <div className="vel-form-header">
              <div className="vel-form-label">
                <Sparkles size={12} style={{ color: 'var(--gold)' }} />
                Secure Access
              </div>
              <h1 className="vel-form-title">Welcome<br />back.</h1>
              <p className="vel-form-subtitle">Sign in to your workspace to continue.</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="vel-input-group">
                <label className="vel-input-label">Email Address</label>
                <div className="vel-input-wrap">
                  <span className="vel-input-icon">
                    <Mail size={16} />
                  </span>
                  <input
                    className="vel-input"
                    type="email"
                    placeholder="you@prashanti.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="vel-input-group" style={{ marginBottom: '28px' }}>
                <label className="vel-input-label">Employee ID</label>  {/* Changed from "Mobile Number" */}
                <div className="vel-input-wrap">
                  <span className="vel-input-icon">
                    <WalletCards size={16} />  {/* You might want to change this icon to something like <ID Card> icon */}
                  </span>
                  <input
                    className="vel-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Your employee ID"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: '46px' }}
                  />
                  <button
                    type="button"
                    className="vel-eye-btn"
                    onClick={() => setShowPass(s => !s)}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="vel-error">
                  <div className="vel-error-icon">!</div>
                  {error}
                </div>
              )}

              <button type="submit" className="vel-submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="vel-submit-spinner" />
                    Authenticating…
                  </>
                ) : (
                  <>
                    Access Workspace
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="vel-divider">
              <div className="vel-divider-line" />
              <span className="vel-divider-text">Velocity · Prashanti Group</span>
              <div className="vel-divider-line" />
            </div>

            <div className="vel-form-footer">
              <p>
                Contact your team admin for access issues.
              </p>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};