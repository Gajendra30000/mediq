import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { slotsAPI, doctorsAPI } from '../../services/api';
import { PageShell, PageLoader, Modal } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const emptySlot = { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotDuration: 15, maxPatients: 20, breaks: [] };

export default function DoctorSchedule() {
  const { doctorProfile, user } = useAuth();
  const toast = useToast();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...emptySlot });
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!doctorProfile?._id) { setLoading(false); return; }
    Promise.all([
      slotsAPI.getByDoctor(doctorProfile._id),
    ]).then(([sRes]) => {
      setSlots(sRes.data);
      setAvailable(doctorProfile.isAvailableToday);
    }).finally(() => setLoading(false));
  }, [doctorProfile]);

  const toggleAvailability = async () => {
    const newVal = !available;
    setAvailable(newVal);
    try {
      await doctorsAPI.update(doctorProfile._id, { isAvailableToday: newVal });
      toast.success(newVal ? 'Marked as available today' : 'Marked as unavailable today');
    } catch { setAvailable(!newVal); }
  };

  const saveSlot = async () => {
    setSaving(true);
    try {
      await slotsAPI.create({ ...form, doctorId: doctorProfile._id, hospitalId: doctorProfile.hospitalId });
      toast.success('Schedule slot added');
      const { data } = await slotsAPI.getByDoctor(doctorProfile._id);
      setSlots(data);
      setModal(false);
      setForm({ ...emptySlot });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const deleteSlot = async (id) => {
    await slotsAPI.delete(id);
    setSlots((prev) => prev.filter((s) => s._id !== id));
    toast.success('Slot removed');
  };

  const toggleDayActive = async (dayIdx, currentActive) => {
    const daySlots = slots.filter((s) => s.dayOfWeek === dayIdx);
    if (!daySlots.length) return;
    try {
      await Promise.all(daySlots.map(s => slotsAPI.update(s._id, { isActive: !currentActive })));
      toast.success(`${DAYS[dayIdx]} schedule updated`);
      const { data } = await slotsAPI.getByDoctor(doctorProfile._id);
      setSlots(data);
    } catch (err) {
      toast.error('Failed to update day availability');
    }
  };

  if (loading) return <PageShell title="My schedule"><PageLoader /></PageShell>;

  return (
    <PageShell
      title="My schedule"
      subtitle="Manage your weekly availability and time slots"
      actions={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Add slot</button>}
    >
      {/* Today's availability toggle */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600 }}>Today's availability</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Patients can book same-day walk-ins</div>
        </div>
        <button onClick={toggleAvailability} style={{
          width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
          background: available ? 'var(--primary)' : 'var(--border-strong)', transition: 'background .2s',
          position: 'relative',
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 3, left: available ? 27 : 3, transition: 'left .2s',
            boxShadow: '0 1px 3px rgba(0,0,0,.3)',
          }} />
        </button>
      </div>

      {/* Weekly schedule */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DAYS.map((day, idx) => {
          const daySlots = slots.filter((s) => s.dayOfWeek === idx);
          const isDayActive = daySlots.length > 0 ? daySlots.every(s => s.isActive) : false;
          return (
            <div key={day} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 100, fontSize: 13, fontWeight: 500, color: daySlots.length ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {day}
              </div>
              
              {/* Day toggle */}
              {daySlots.length > 0 && (
                <button onClick={() => toggleDayActive(idx, isDayActive)} style={{
                  width: 42, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                  background: isDayActive ? 'var(--primary)' : 'var(--border-strong)', transition: 'background .2s',
                  position: 'relative', flexShrink: 0,
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3, left: isDayActive ? 23 : 3, transition: 'left .2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                  }} />
                </button>
              )}

              <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {daySlots.length === 0 ? (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Not scheduled</span>
                ) : daySlots.map((s) => (
                  <div key={s._id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                    background: s.isActive ? 'var(--primary-light)' : 'var(--surface-3)', 
                    color: s.isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    borderRadius: 'var(--radius-full)', fontSize: 13,
                    opacity: s.isActive ? 1 : 0.6,
                    border: s.isActive ? 'none' : '1px solid var(--border)',
                  }}>
                    <span style={{ color: s.isActive ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: 500 }}>
                      {s.startTime} – {s.endTime} {!s.isActive && '(unavailable)'}
                    </span>
                    <button onClick={() => deleteSlot(s._id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add slot modal */}
      <Modal open={modal} title="Add schedule slot" onClose={() => setModal(false)}
        footer={<>
          <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveSlot} disabled={saving}>{saving ? 'Saving...' : 'Save slot'}</button>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Day of week</label>
            <select className="input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Start time</label>
            <input className="input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">End time</label>
            <input className="input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Max patients</label>
            <input className="input" type="number" min={1} max={100} value={form.maxPatients} onChange={(e) => setForm({ ...form, maxPatients: Number(e.target.value) })} />
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
