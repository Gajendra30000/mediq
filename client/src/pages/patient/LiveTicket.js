// ── LiveTicket.js ─────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { appointmentsAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { PageShell, Spinner } from '../../components/ui';

export default function LiveTicket() {
  const { id } = useParams();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appointmentsAPI.get(id)
      .then((r) => setAppt(r.data))
      .finally(() => setLoading(false));

    const socket = getSocket();
    if (socket) {
      socket.on('appointmentUpdated', ({ appointmentId, queuePosition, estimatedTime, status }) => {
        if (String(appointmentId) === id) {
          setAppt((prev) => prev ? { ...prev, queuePosition, estimatedTime, status } : prev);
        }
      });
    }
    return () => {
      if (socket) { socket.off('appointmentUpdated'); }
    };
  }, [id]);

  if (loading) return <PageShell title="Live ticket"><div style={{ padding: 40, textAlign: 'center' }}><Spinner size={32} /></div></PageShell>;
  if (!appt) return <PageShell title="Live ticket"><p>Appointment not found.</p></PageShell>;

  const isCalled = appt.status === 'in_consultation';
  const isDone = appt.status === 'completed';
  const progress = appt.queuePosition ? Math.max(10, 100 - (appt.queuePosition / 20) * 100) : 50;

  return (
    <PageShell title="Live queue status" subtitle={`${appt.doctorId?.userId?.name || 'Doctor'} · ${appt.hospitalId?.name}`}>
      <div style={{ maxWidth: 400, margin: '0 auto' }}>
        {isCalled && (
          <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-xl)', padding: '16px 24px', textAlign: 'center', marginBottom: 20, animation: 'pulse 1s infinite' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>🔔 Your turn — please proceed!</div>
          </div>
        )}

        <div className="card" style={{ textAlign: 'center', padding: '32px 24px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Your token number</div>
          <div style={{ fontSize: 72, fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>{appt.tokenNumber}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
            {isDone ? 'Consultation complete' : isCalled ? 'You are being served' : `Position ${appt.queuePosition ?? '...'} in queue`}
          </div>
          {appt.verificationCode && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Verification code</div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.14em' }}>{appt.verificationCode}</div>
            </div>
          )}

          {!isDone && !isCalled && (
            <>
              <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4, margin: '20px 0 8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--primary)', borderRadius: 4, width: `${progress}%`, transition: 'width .5s' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '14px 8px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{appt.queuePosition != null ? Math.max(0, appt.queuePosition - 1) : '...'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>Ahead of you</div>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '14px 8px' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{appt.estimatedTime ?? '?'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>Est. time</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          Queue updates in real-time · No need to refresh
        </div>
      </div>
    </PageShell>
  );
}
