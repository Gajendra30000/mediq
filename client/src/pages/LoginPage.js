import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/ui';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const demos = [
    { label: 'Patient', email: 'patient@mediqueue.com', password: 'Patient@123', color: 'var(--primary)' },
    { label: 'Doctor', email: 'rajiv@wockhardt.com', password: 'Doctor@123', color: '#534AB7' },
    { label: 'Admin', email: 'admin@wockhardt.com', password: 'Admin@123', color: '#993C1D' },
    { label: 'Reception', email: 'reception@wockhardt.com', password: 'Reception@123', color: '#854F0B' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const dest = { patient: '/home', doctor: '/doctor', admin: '/hospital', reception: '/reception' };
      navigate(dest[user.role] || '/home');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #e8f8f2 0%, #f0f4ff 100%)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Logo size="lg" />
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14 }}>
            Smart hospital queue & appointment management
          </p>
        </div>

        <div className="card" style={{ borderRadius: 'var(--radius-xl)' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="input" type="password" placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', height: 44, fontSize: 15 }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{ margin: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            — Demo accounts —
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {demos.map((d) => (
              <button key={d.label} onClick={() => setForm({ email: d.email, password: d.password })}
                style={{
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  background: 'var(--surface-2)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: d.color, transition: 'all .15s',
                }}>
                {d.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            New patient?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 500 }}>Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
