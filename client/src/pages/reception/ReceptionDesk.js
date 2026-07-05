import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentsAPI, doctorsAPI, queueAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { PageShell, PageLoader, Modal } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import QRCode from 'qrcode.react';

export default function ReceptionDesk() {
  const { user } = useAuth();
  const toast = useToast();
  const hospitalId = user?.hospitalId?._id || user?.hospitalId;

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [queue, setQueue] = useState([]);
  const [queueStats, setQueueStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [walkInModal, setWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ patientName: '', phone: '', symptoms: '' });
  const [newAppt, setNewAppt] = useState(null); // result after walk-in
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    doctorsAPI.list({ hospitalId, available: 'true' })
      .then((r) => {
        setDoctors(r.data.doctors || []);
        if (r.data.doctors?.length) setSelectedDoctor(r.data.doctors[0]._id);
      })
      .finally(() => setLoading(false));
  }, [hospitalId]);

  const loadQueue = useCallback(async () => {
    if (!selectedDoctor) return;
    try {
      const { data } = await queueAPI.today(selectedDoctor);
      setQueue(data.queue);
      setQueueStats(data.stats);
    } catch {}
  }, [selectedDoctor]);

  useEffect(() => {
    loadQueue();
    const socket = getSocket();
    if (socket) {
      socket.on('queueUpdated', ({ queue: newQueue, doctorId: docId }) => {
        if (docId === selectedDoctor) {
          setQueue(newQueue);
        }
      });
    }
    return () => { if (socket) socket.off('queueUpdated'); };
  }, [loadQueue, selectedDoctor]);

  const createWalkIn = async () => {
    if (!selectedDoctor) return toast.error('Select a doctor first');
    setProcessing(true);
    try {
      // For walk-ins without existing account, reception creates entry directly
      // In a real system you'd look up or create the patient — simplified here
      const mockPatientId = user._id; // placeholder; in prod: lookup/create patient

      const { data } = await appointmentsAPI.walkIn({
        doctorId: selectedDoctor,
        hospitalId,
        patientId: mockPatientId,
        symptoms: walkInForm.symptoms.split(',').map((s) => s.trim()).filter(Boolean),
      });

      setWalkInModal(false);
      setWalkInForm({ patientName: '', phone: '', symptoms: '' });
      toast.success(`Walk-in token ${data.tokenNumber} (Queue #${data.queuePosition}) issued`);
      await loadQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create walk-in');
    } finally { setProcessing(false); }
  };

  const callNext = async () => {
    try {
      await queueAPI.callNext(selectedDoctor);
      toast.success('Next patient called');
      await loadQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const serving = queue.find((a) => a.status === 'in_consultation');
  const waiting = queue.filter((a) => a.status === 'waiting');
  const upcoming = [];
  const selectedDoc = doctors.find((d) => d._id === selectedDoctor);

  if (loading) return <PageShell title="Reception desk"><PageLoader /></PageShell>;

  return (
    <PageShell
      title="Reception desk"
      subtitle="Manage walk-ins, check-ins and live queue"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setWalkInModal(true)}>+ Walk-in</button>
          <button className="btn btn-primary" onClick={callNext} disabled={!waiting.length}>Call next →</button>
        </div>
      }
    >
      {/* Doctor selector */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap' }}>Active doctor:</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          {doctors.map((doc) => (
            <button key={doc._id} onClick={() => setSelectedDoctor(doc._id)} style={{
              padding: '7px 14px', borderRadius: 'var(--radius-full)', fontSize: 13, cursor: 'pointer',
              background: selectedDoctor === doc._id ? 'var(--primary)' : 'var(--surface)',
              color: selectedDoctor === doc._id ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${selectedDoctor === doc._id ? 'var(--primary)' : 'var(--border)'}`,
            }}>
              {doc.userId?.name?.split(' ').slice(-1)[0]} — {doc.specialty}
            </button>
          ))}
        </div>
      </div>

      {/* Queue stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { val: queueStats.total || 0, key: 'Total', color: '' },
          { val: queueStats.serving || 0, key: 'Serving', color: 'var(--primary)' },
          { val: queueStats.waiting || 0, key: 'Waiting', color: 'var(--info)' },
          { val: queueStats.done || 0, key: 'Done', color: 'var(--success)' },
          { val: queueStats.skipped || 0, key: 'Skipped', color: 'var(--warning)' },
        ].map((s) => (
          <div key={s.key} className="stat-card" style={{ textAlign: 'center', padding: '14px 10px' }}>
            <div className="stat-val" style={s.color ? { color: s.color } : {}}>{s.val}</div>
            <div className="stat-key">{s.key}</div>
          </div>
        ))}
      </div>

      {/* Serving now */}
      {serving && (
        <div className="card" style={{ marginBottom: 16, border: '2px solid var(--primary)', background: '#f0fdf8' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', letterSpacing: '.06em', marginBottom: 4 }}>NOW SERVING</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Token {serving.tokenNumber} (Queue: #{serving.queuePosition || 1}) — {serving.patientId?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{serving.type} · {serving.timeSlot}</div>
        </div>
      )}

      {/* Waiting list table */}
      {waiting.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>
            Waiting ({waiting.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {['Token', 'Patient', 'Type', 'Est. Time', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', letterSpacing: '.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waiting.map((a) => (
                <tr key={a._id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                    <div>{a.tokenNumber}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>Q: #{a.queuePosition}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{a.patientId?.name || 'Patient'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${a.type === 'walkin' ? 'badge-amber' : 'badge-blue'}`}>{a.type}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {a.estimatedTime ?? a.timeSlot ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button className="btn btn-primary btn-sm"
                      onClick={async () => { await queueAPI.call(a._id); await loadQueue(); }}>
                      Call
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upcoming booked */}
      {upcoming.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>
            Upcoming booked — not checked in ({upcoming.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {['Token', 'Patient', 'Slot', 'Status', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', letterSpacing: '.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((a) => (
                <tr key={a._id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    <div>{a.tokenNumber}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>Q: #{a.queueNumber}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{a.patientId?.name || 'Patient'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{a.timeSlot}</td>
                  <td style={{ padding: '12px 16px' }}><span className="badge badge-amber">Not checked in</span></td>
                  <td style={{ padding: '12px 16px' }}>
                    <button className="btn btn-outline btn-sm"
                      onClick={async () => {
                        // Manual check-in by reception
                        try {
                          await appointmentsAPI.checkinQR(a.qrToken);
                          await loadQueue();
                          toast.success(`Token #${a.tokenNumber} checked in`);
                        } catch { toast.error('Check-in failed'); }
                      }}>
                      Check in
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Walk-in modal */}
      <Modal open={walkInModal} title="New walk-in patient" onClose={() => setWalkInModal(false)}
        footer={<>
          <button className="btn btn-outline" onClick={() => setWalkInModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={createWalkIn} disabled={processing}>
            {processing ? 'Issuing token...' : 'Issue token'}
          </button>
        </>}>
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
          <strong>Doctor:</strong> {selectedDoc?.userId?.name} — {selectedDoc?.specialty}
        </div>
        <div className="form-group">
          <label className="form-label">Patient name</label>
          <input className="input" placeholder="Full name"
            value={walkInForm.patientName} onChange={(e) => setWalkInForm({ ...walkInForm, patientName: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Phone number</label>
          <input className="input" type="tel" placeholder="98765 XXXXX"
            value={walkInForm.phone} onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Symptoms (optional)</label>
          <input className="input" placeholder="fever, headache..."
            value={walkInForm.symptoms} onChange={(e) => setWalkInForm({ ...walkInForm, symptoms: e.target.value })} />
        </div>
      </Modal>

      {/* Walk-in patient confirms directly with toast */}
    </PageShell>
  );
}
