import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hospitalsAPI, aiAPI } from '../../services/api';
import { PageShell, PageLoader } from '../../components/ui';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hospitalId = user?.hospitalId?._id || user?.hospitalId;
  const [stats, setStats] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [aiInsight, setAiInsight] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId) { setLoading(false); return; }
    Promise.all([
      hospitalsAPI.getStats(hospitalId),
      hospitalsAPI.getDoctors(hospitalId),
    ]).then(([sRes, dRes]) => {
      setStats(sRes.data);
      setDoctors(dRes.data);
    }).finally(() => setLoading(false));
  }, [hospitalId]);

  // Load AI insight after stats
  useEffect(() => {
    if (!stats || !doctors.length) return;
    const rawDepts = stats.departmentLoads?.length ? stats.departmentLoads : [
      { name: 'Cardiology', current: 0, capacity: 20 },
      { name: 'General OPD', current: 0, capacity: 20 }
    ];
    const deptLoadsWithStatus = rawDepts.map((d) => {
      const pct = d.capacity ? (d.current / d.capacity) * 100 : 0;
      const status = pct >= 75 ? 'high' : pct >= 40 ? 'medium' : 'low';
      return { ...d, status };
    });
    aiAPI.adminInsight({ hospitalStats: stats, departmentLoads: deptLoadsWithStatus })
      .then((r) => setAiInsight(r.data.insight))
      .catch(() => {});
  }, [stats, doctors]);

  if (loading) return <PageShell title="Hospital dashboard"><PageLoader /></PageShell>;

  const deptLoads = stats?.departmentLoads?.length ? stats.departmentLoads : [
    { name: 'Cardiology', current: 0, capacity: 20 },
    { name: 'General OPD', current: 0, capacity: 20 },
    { name: 'Orthopedics', current: 0, capacity: 20 },
    { name: 'Dermatology', current: 0, capacity: 20 },
    { name: 'Pediatrics', current: 0, capacity: 20 },
    { name: 'Gynecology', current: 0, capacity: 20 },
  ];

  return (
    <PageShell
      title={user?.hospitalId?.name || 'Hospital dashboard'}
      subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => navigate('/hospital/staff')}>Manage staff</button>
          <button className="btn btn-primary" onClick={() => navigate('/hospital/analytics')}>Analytics →</button>
        </div>
      }
    >
      {/* Stats */}
      <div className="stat-grid">
        {[
          { val: stats?.totalToday || 0, key: 'Patients today', delta: '↑ 14% vs yesterday', up: true },
          { val: stats?.waiting || 0, key: 'Currently waiting', delta: '', up: null },
          { val: `${stats?.avgWaitMinutes || 0} min`, key: 'Avg wait time', delta: stats?.avgWaitMinutes > 20 ? '↑ Running high' : '↓ Good', up: !(stats?.avgWaitMinutes > 20) },
          { val: stats?.doctors || 0, key: 'Doctors on duty', delta: '', up: null },
        ].map((s) => (
          <div key={s.key} className="stat-card">
            <div className="stat-val">{s.val}</div>
            <div className="stat-key">{s.key}</div>
            {s.delta && <div className={`stat-delta ${s.up ? 'delta-up' : 'delta-dn'}`}>{s.delta}</div>}
          </div>
        ))}
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(29,158,117,.3)', background: '#f0fdf8' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span>✦</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-dark)' }}>AI operational insight</span>
            <span className="badge badge-teal" style={{ fontSize: 10 }}>Claude</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>{aiInsight}</p>
        </div>
      )}

      {/* Department load */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Department load — live</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {deptLoads.map((d) => {
              const pct = Math.round((d.current / d.capacity) * 100);
              const color = pct >= 75 ? 'var(--danger)' : pct >= 50 ? 'var(--warning)' : 'var(--success)';
              const badgeClass = pct >= 75 ? 'badge-red' : pct >= 50 ? 'badge-amber' : 'badge-green';
              return (
                <div key={d.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.current}/{d.capacity}</span>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: 10 }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: color, borderRadius: 3, width: `${pct}%`, transition: 'width .5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Doctor roster */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Doctor roster</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {doctors.slice(0, 7).map((doc) => (
              <div key={doc._id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 }}>
                  {(doc.userId?.name || 'D')[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.userId?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{doc.specialty}</div>
                </div>
                <span className={`badge ${doc.isAvailableToday ? 'badge-teal' : 'badge-red'}`} style={{ fontSize: 10, flexShrink: 0 }}>
                  {doc.isAvailableToday ? 'Active' : 'Off'}
                </span>
              </div>
            ))}
            {doctors.length > 7 && (
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/hospital/staff')} style={{ marginTop: 4 }}>
                View all {doctors.length} doctors →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[
          { icon: '⊕', label: 'Manage staff', path: '/hospital/staff', color: 'var(--primary-light)', text: 'var(--primary-dark)' },
          { icon: '◈', label: 'Analytics', path: '/hospital/analytics', color: '#EEEDFE', text: '#534AB7' },
        ].map((a) => (
          <button key={a.path} onClick={() => navigate(a.path)} style={{
            background: a.color, border: 'none', borderRadius: 'var(--radius-lg)', padding: '20px 16px',
            cursor: 'pointer', textAlign: 'center', transition: 'transform .15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: a.text }}>{a.label}</div>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
