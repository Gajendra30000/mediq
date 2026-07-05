// DoctorDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { queueAPI, analyticsAPI } from '../../services/api';
import { PageShell, PageLoader } from '../../components/ui';

export default function DoctorDashboard() {
  const { user, doctorProfile } = useAuth();
  const navigate = useNavigate();
  const [queueStats, setQueueStats] = useState(null);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorProfile?._id) { setLoading(false); return; }
    Promise.all([
      queueAPI.today(doctorProfile._id),
      analyticsAPI.summary({ doctorId: doctorProfile._id, days: 7 }),
    ]).then(([qRes, aRes]) => {
      setQueueStats(qRes.data.stats);
      setAnalyticsData(aRes.data);
    }).finally(() => setLoading(false));
  }, [doctorProfile]);

  if (loading) return <PageShell title="Dashboard"><PageLoader /></PageShell>;

  const today = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });

  const doctorName = user?.name?.toLowerCase().startsWith('dr.') ? user.name : `Dr. ${user?.name || ''}`;

  return (
    <PageShell
      title={doctorName}
      subtitle={`${doctorProfile?.specialty || ''} · ${today}`}
      actions={
        <button className="btn btn-primary" onClick={() => navigate('/doctor/queue')}>
          Open queue →
        </button>
      }
    >
      <div className="stat-grid">
        {[
          { val: queueStats?.total || 0, key: "Today's appointments", delta: '', color: '' },
          { val: queueStats?.waiting || 0, key: 'Waiting now', delta: '', color: 'var(--primary)' },
          { val: queueStats?.done || 0, key: 'Completed', delta: '', color: 'var(--success)' },
          { val: queueStats?.skipped || 0, key: 'Skipped / no-show', delta: '', color: 'var(--warning)' },
        ].map((s) => (
          <div key={s.key} className="stat-card">
            <div className="stat-val" style={s.color ? { color: s.color } : {}}>{s.val}</div>
            <div className="stat-key">{s.key}</div>
          </div>
        ))}
      </div>

      {/* 7-day summary */}
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>Last 7 days</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Daily appointment volume</div>
          </div>
          {analyticsData.length > 0 && (
            <span className="badge badge-teal" style={{ padding: '6px 12px', fontSize: 12 }}>
              {analyticsData.slice(-7).reduce((acc, curr) => acc + curr.total, 0)} total
            </span>
          )}
        </div>

        {analyticsData.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: 'var(--text-muted)', fontSize: 14 }}>
            No activity recorded in the last 7 days
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-around', alignItems: 'flex-end', height: 140, paddingBottom: 8 }}>
            {analyticsData.slice(-7).map((d) => {
              const max = Math.max(...analyticsData.map((x) => x.total), 1);
              const barHeight = (d.total / max) * 100;
              return (
                <div key={d._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Count above bar */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {d.total}
                  </div>
                  {/* Bar wrapper */}
                  <div style={{ height: 80, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{
                      width: 28,
                      height: `${Math.max(8, barHeight)}%`,
                      background: 'linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.3s ease',
                      boxShadow: '0 2px 4px rgba(29, 158, 117, 0.15)',
                    }} />
                  </div>
                  {/* Date label */}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontWeight: 500 }}>
                    {d._id ? d._id.slice(5) : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/doctor/queue')}>Today's queue</button>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate('/doctor/schedule')}>My schedule</button>
      </div>
    </PageShell>
  );
}
