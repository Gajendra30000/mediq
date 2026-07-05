import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { queueAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { PageShell, PageLoader, Modal } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const STATUS_COLOR = {
  serving: 'green', checked_in: 'teal', confirmed: 'blue',
  booked: 'amber', done: 'blue', skipped: 'amber', no_show: 'red',
};

export default function DoctorQueue() {
  const { doctorProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const loadQueue = useCallback(async () => {
    if (!doctorProfile?._id) return;
    try {
      const { data } = await api.get(`/queue/today/${doctorProfile._id}?date=${selectedDate}`);
      setQueue(data.queue);
      setStats(data.stats);
    } catch {}
    finally { setLoading(false); }
  }, [doctorProfile, selectedDate]);

  useEffect(() => {
    loadQueue();
    const socket = getSocket();
    if (socket) {
      socket.on('queueUpdated', ({ queue: newQueue, date }) => {
        if (selectedDate === date || (!date && selectedDate === new Date().toISOString().split('T')[0])) {
          setQueue(newQueue);
        }
      });
    }
    return () => { if (socket) socket.off('queueUpdated'); };
  }, [loadQueue, selectedDate]);

  const action = async (fn, successMsg) => {
    try {
      await fn();
      toast.success(successMsg);
      await loadQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const callNext = () => action(() => queueAPI.callNext(doctorProfile._id), 'Next patient called');
  const callSpecific = (id) => action(() => queueAPI.call(id), 'Patient called');
  const complete = (id, a) => action(() => queueAPI.complete(id, a), a === 'done' ? 'Consultation done' : 'Skipped');

  const serving = queue.find((a) => a.status === 'in_consultation');
  const waiting = queue.filter((a) => a.status === 'waiting');
  const upcoming = [];
  const done = queue.filter((a) => ['completed', 'skipped'].includes(a.status));

  const displayDateStr = new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) return <PageShell title={`Queue for ${displayDateStr}`}><PageLoader /></PageShell>;

  return (
    <PageShell
      title={`Queue for ${displayDateStr}`}
      subtitle={`${stats.done || 0} done · ${stats.waiting || 0} waiting · ${stats.total || 0} total`}
      actions={
        isToday && waiting.length > 0 && (
          <button className="btn btn-primary" onClick={callNext}>
            Call next →
          </button>
        )
      }
    >
      {/* Date selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>VIEW QUEUE FOR DATE:</label>
        <input type="date" className="input" style={{ width: 160, padding: '6px 12px' }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
      </div>

      {/* Currently serving */}
      {serving && (
        <div className="card" style={{ marginBottom: 20, border: '2px solid var(--primary)', background: '#f0fdf8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', letterSpacing: '.06em', marginBottom: 4 }}>NOW SERVING</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Token: {serving.tokenNumber} (Queue: #{serving.queuePosition || 1}) — {serving.patientId?.name}
                {serving.verificationCode && (
                  <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 700, background: 'var(--surface-2)', padding: '4px 8px', borderRadius: 6 }}>
                    Code: {serving.verificationCode}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                {serving.patientId?.patient?.gender} · {serving.type} · {serving.symptoms?.join(', ') || 'No symptoms noted'}
              </div>
              {serving.calledAt && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Called at {new Date(serving.calledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => navigate(`/doctor/patient/${serving.patientId?._id}`)}>History</button>
              {isToday && (
                <>
                  <button className="btn btn-outline btn-sm" onClick={() => navigate(`/doctor/prescription/${serving._id}`)}>Rx</button>
                  <button className="btn btn-primary btn-sm" onClick={() => complete(serving._id, 'done')}>Done ✓</button>
                  <button className="btn btn-sm" style={{ border: '1px solid var(--warning)', color: 'var(--warning)' }} onClick={() => complete(serving._id, 'skip')}>Skip</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiting queue */}
      {waiting.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
            WAITING ({waiting.length})
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {['#', 'Patient', 'Type', 'Est. Time', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waiting.map((a, i) => (
                  <tr key={a._id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      <div>{a.tokenNumber}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>Q: #{a.queuePosition}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500 }}>{a.patientId?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.symptoms?.join(', ') || a.timeSlot}</div>
                      {a.verificationCode && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Code: <strong>{a.verificationCode}</strong></div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge badge-${STATUS_COLOR[a.status] || 'blue'}`} style={{ textTransform: 'capitalize' }}>
                        {a.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {a.estimatedTime ?? a.timeSlot ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isToday && <button className="btn btn-primary btn-sm" onClick={() => callSpecific(a._id)}>Call</button>}
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/doctor/patient/${a.patientId?._id}`)}>Profile</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming booked (not yet checked in) */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
            UPCOMING — NOT YET CHECKED IN ({upcoming.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((a) => (
              <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                  <span style={{ fontWeight: 600 }}>Token: {a.tokenNumber}</span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>Q: #{a.queueNumber}</span>
                  <span style={{ marginLeft: 10 }}>{a.patientId?.name}</span>
                  <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-secondary)' }}>{a.timeSlot}</span>
                  {a.verificationCode && <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--text-secondary)' }}>Code: <strong>{a.verificationCode}</strong></span>}
                </div>
                <span className="badge badge-amber">Not checked in</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, padding: '8px 0' }}>
            COMPLETED TODAY ({done.length})
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {done.map((a) => (
              <div key={a._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                <span>Token: {a.tokenNumber} · {a.patientId?.name}</span>
                <span className={`badge badge-${STATUS_COLOR[a.status]}`} style={{ textTransform: 'capitalize' }}>{a.status}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {queue.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>◷</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Queue is empty</div>
          <div style={{ fontSize: 14 }}>No appointments for today yet</div>
        </div>
      )}

    </PageShell>
  );
}
