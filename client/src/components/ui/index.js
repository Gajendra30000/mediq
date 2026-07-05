import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';

// ── Logo ─────────────────────────────────────────────────────────────────────
export const Logo = ({ size = 'md' }) => (
  <span style={{ fontSize: size === 'lg' ? 22 : 17, fontWeight: 600, letterSpacing: '-0.3px' }}>
    Medi<span style={{ color: 'var(--primary)' }}>Queue</span>
  </span>
);

// ── Avatar ────────────────────────────────────────────────────────────────────
export const Avatar = ({ name = '', size = 36, color = 'var(--primary)' }) => {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--primary-light)', color: 'var(--primary-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 600, flexShrink: 0,
    }}>
      {initials || '?'}
    </div>
  );
};

// ── Stars ─────────────────────────────────────────────────────────────────────
export const Stars = ({ rating = 0, showNumber = true }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span className="stars" style={{ fontSize: 13 }}>
        {'★'.repeat(full)}{'☆'.repeat(5 - full - (half ? 1 : 0))}{half ? '½' : ''}
      </span>
      {showNumber && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{Number(rating).toFixed(1)}</span>}
    </span>
  );
};

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 20 }) => (
  <div className="spinner" style={{ width: size, height: size }} />
);

export const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <Spinner size={36} />
  </div>
);

// ── Patient Sidebar ───────────────────────────────────────────────────────────
const patientNav = [
  { label: 'Home', path: '/home', icon: '⌂' },
  { label: 'Find doctors', path: '/search', icon: '⊕' },
  { label: 'My appointments', path: '/appointments', icon: '◷' },
  { label: 'Medical history', path: '/records', icon: '♥' },
  { label: 'AI Assistant', path: '/chat', icon: '💬' },
];

const doctorNav = [
  { label: 'Dashboard', path: '/doctor', icon: '⊞' },
  { label: 'Today\'s queue', path: '/doctor/queue', icon: '◷' },
  { label: 'My schedule', path: '/doctor/schedule', icon: '⊕' },
];

const adminNav = [
  { label: 'Dashboard', path: '/hospital', icon: '⊞' },
  { label: 'Staff', path: '/hospital/staff', icon: '⊕' },
  { label: 'Analytics', path: '/hospital/analytics', icon: '◈' },
];

const receptionNav = [
  { label: 'Reception desk', path: '/reception', icon: '⊞' },
];

const navByRole = { patient: patientNav, doctor: doctorNav, admin: adminNav, reception: receptionNav };

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const nav = navByRole[user?.role] || [];

  return (
    <aside className="sidebar">
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <Logo />
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={user?.name} size={32} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
      </div>

      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {nav.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 'var(--radius-md)', marginBottom: 2,
              background: active ? 'var(--primary-light)' : 'transparent',
              color: active ? 'var(--primary-dark)' : 'var(--text-secondary)',
              fontWeight: active ? 500 : 400, fontSize: 14, transition: 'all .15s',
            }}>
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <button onClick={() => { logout(); navigate('/login'); }} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
          borderRadius: 'var(--radius-md)', width: '100%', border: 'none',
          background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer',
        }}>
          <span>↩</span> Sign out
        </button>
      </div>
    </aside>
  );
};

// ── Page Shell ────────────────────────────────────────────────────────────────
export const PageShell = ({ title, subtitle, actions, children }) => (
  <div className="app-shell">
    <Sidebar />
    <div className="main-content">
      <div className="page-header">
        <div>
          <div className="page-title">{title}</div>
          {subtitle && <div className="page-subtitle">{subtitle}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
      </div>
      <div className="page-body">{children}</div>
    </div>
  </div>
);

// ── Empty State ───────────────────────────────────────────────────────────────
export const EmptyState = ({ icon = '◷', title, message, action }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
    <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
    {message && <div style={{ fontSize: 14, marginBottom: 20 }}>{message}</div>}
    {action}
  </div>
);

// ── Confirm Modal ─────────────────────────────────────────────────────────────
export const Modal = ({ open, title, children, onClose, footer }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: 24,
        maxWidth: 500, width: '100%', boxShadow: 'var(--shadow-lg)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
        </div>
        {children}
        {footer && <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
};
