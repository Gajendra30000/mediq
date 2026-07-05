import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { analyticsAPI } from '../../services/api';
import { PageShell, PageLoader } from '../../components/ui';

export default function HospitalAnalytics() {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId?._id || user?.hospitalId;
  const [data, setData] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId) return;
    setLoading(true);
    Promise.all([
      analyticsAPI.summary({ hospitalId, days }),
      analyticsAPI.specialties({ hospitalId }),
    ]).then(([sRes, spRes]) => {
      setData(sRes.data);
      setSpecialties(spRes.data);
    }).finally(() => setLoading(false));
  }, [hospitalId, days]);

  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  const totalPatients = data.reduce((s, d) => s + d.total, 0);
  const totalDone = data.reduce((s, d) => s + d.done, 0);
  const totalSkipped = data.reduce((s, d) => s + d.skipped, 0);
  const avgPerDay = data.length ? Math.round(totalPatients / data.length) : 0;
  const completionRate = totalPatients ? Math.round((totalDone / totalPatients) * 100) : 0;
  const maxSpec = specialties.length ? Math.max(...specialties.map((s) => s.count)) : 1;

  if (loading) return <PageShell title="Analytics"><PageLoader /></PageShell>;

  return (
    <PageShell title="Hospital analytics" subtitle="Operational performance overview">
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[7, 14, 30].map((d) => (
          <button key={d} onClick={() => setDays(d)} style={{
            padding: '6px 18px', borderRadius: 'var(--radius-full)', fontSize: 13, cursor: 'pointer',
            background: days === d ? 'var(--primary)' : 'var(--surface)',
            color: days === d ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${days === d ? 'var(--primary)' : 'var(--border)'}`,
          }}>Last {d} days</button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { val: totalPatients, key: 'Total patients', delta: `~${avgPerDay}/day avg`, up: true },
          { val: totalDone, key: 'Consultations done', delta: '', up: null },
          { val: `${completionRate}%`, key: 'Completion rate', delta: completionRate >= 80 ? '↑ Good' : '↓ Needs attention', up: completionRate >= 80 },
          { val: totalSkipped, key: 'Skipped / no-show', delta: '', up: null },
        ].map((s) => (
          <div key={s.key} className="stat-card">
            <div className="stat-val">{s.val}</div>
            <div className="stat-key">{s.key}</div>
            {s.delta && <div className={`stat-delta ${s.up === true ? 'delta-up' : s.up === false ? 'delta-dn' : ''}`}>{s.delta}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Daily throughput bar chart */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Daily patient volume</div>
          {data.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>No data available</div>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 160 }}>
              {data.map((d) => {
                const totalH = Math.max(8, (d.total / maxTotal) * 140);
                const doneH = d.total ? (d.done / d.total) * totalH : 0;
                const skippedH = d.total ? (d.skipped / d.total) * totalH : 0;
                const label = d._id?.slice(5);
                return (
                  <div key={d._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{d.total}</div>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ width: '100%', height: Math.max(2, doneH), background: 'var(--primary)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} title={`Done: ${d.done}`} />
                      <div style={{ width: '100%', height: Math.max(0, skippedH), background: 'var(--warning)', opacity: 0.7 }} title={`Skipped: ${d.skipped}`} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {[['var(--primary)', 'Completed'], ['var(--warning)', 'Skipped']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Specialty breakdown */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Today by specialty</div>
          {specialties.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No data yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {specialties.slice(0, 8).map((s) => {
                const pct = Math.round((s.count / maxSpec) * 100);
                return (
                  <div key={s._id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>{s._id}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{s.count}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 3, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tabular data */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 14 }}>Daily breakdown</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {['Date', 'Total', 'Done', 'Skipped', 'No-show', 'Completion', 'Avg duration'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', letterSpacing: '.04em', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => {
              const comp = d.total ? Math.round((d.done / d.total) * 100) : 0;
              return (
                <tr key={d._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{d._id}</td>
                  <td style={{ padding: '10px 12px' }}>{d.total}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--success)' }}>{d.done}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--warning)' }}>{d.skipped}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--danger)' }}>{d.noshow || 0}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`badge ${comp >= 80 ? 'badge-green' : comp >= 60 ? 'badge-amber' : 'badge-red'}`}>{comp}%</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                    {d.avgDuration ? `${Math.round(d.avgDuration)} min` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
