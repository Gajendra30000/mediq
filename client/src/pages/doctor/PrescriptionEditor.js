import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appointmentsAPI, recordsAPI, aiAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageShell, PageLoader } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

const emptyRx = { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' };

export default function PrescriptionEditor() {
  const { appointmentId } = useParams();
  const { doctorProfile, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [appt, setAppt] = useState(null);
  const [existingRecord, setExistingRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vitals, setVitals] = useState({ bloodPressure: '', pulse: '', temperature: '', weight: '', height: '', spO2: '' });
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState([{ ...emptyRx }]);
  const [labTests, setLabTests] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [interactionResult, setInteractionResult] = useState(null);
  const [checkingInteractions, setCheckingInteractions] = useState(false);

  useEffect(() => {
    Promise.all([
      appointmentsAPI.get(appointmentId),
      recordsAPI.byAppointment(appointmentId).catch(() => ({ data: null })),
    ]).then(([aRes, rRes]) => {
      setAppt(aRes.data);
      if (rRes.data) {
        const r = rRes.data;
        setExistingRecord(r);
        setVitals(r.vitals || {});
        setChiefComplaint(r.chiefComplaint || '');
        setDiagnosis(r.diagnosis || '');
        setNotes(r.notes || '');
        setPrescriptions(r.prescriptions?.length ? r.prescriptions : [{ ...emptyRx }]);
        setLabTests(r.labTests?.join(', ') || '');
        setFollowUpDate(r.followUpDate ? r.followUpDate.split('T')[0] : '');
      }
    }).finally(() => setLoading(false));
  }, [appointmentId]);

  const updateRx = (i, field, val) => {
    setPrescriptions((prev) => prev.map((rx, idx) => idx === i ? { ...rx, [field]: val } : rx));
    setInteractionResult(null);
  };

  const addRx = () => setPrescriptions((prev) => [...prev, { ...emptyRx }]);
  const removeRx = (i) => setPrescriptions((prev) => prev.filter((_, idx) => idx !== i));

  const checkInteractions = async () => {
    const meds = prescriptions.filter((rx) => rx.medicine.trim());
    if (meds.length < 2) return toast.info('Add at least 2 medications to check interactions');
    setCheckingInteractions(true);
    try {
      const { data } = await aiAPI.checkInteractions(meds);
      setInteractionResult(data);
    } catch {
      toast.error('Interaction check unavailable');
    } finally { setCheckingInteractions(false); }
  };

  const save = async () => {
    setSaving(true);
    
    // Clean vitals to avoid CastError for empty strings in Number fields
    const cleanedVitals = {};
    if (vitals.bloodPressure?.trim()) {
      cleanedVitals.bloodPressure = vitals.bloodPressure.trim();
    }
    ['pulse', 'temperature', 'weight', 'height', 'spO2', 'bloodSugar'].forEach((k) => {
      if (vitals[k] !== undefined && vitals[k] !== null && vitals[k].toString().trim() !== '') {
        const val = Number(vitals[k]);
        if (!isNaN(val)) {
          cleanedVitals[k] = val;
        }
      }
    });

    const payload = {
      appointmentId,
      patientId: appt.patientId?._id || appt.patientId,
      doctorId: doctorProfile?._id,
      hospitalId: appt.hospitalId?._id || appt.hospitalId,
      vitals: cleanedVitals,
      chiefComplaint,
      diagnosis,
      notes,
      prescriptions: prescriptions.filter((rx) => rx.medicine.trim()),
      labTests: labTests.split(',').map((t) => t.trim()).filter(Boolean),
      followUpDate: followUpDate || undefined,
      drugInteractionWarnings: interactionResult?.warnings?.map((w) => w.description) || [],
    };
    try {
      if (existingRecord) {
        await recordsAPI.update(existingRecord._id, payload);
      } else {
        await recordsAPI.create(payload);
      }
      toast.success('Prescription saved');
      navigate('/doctor/queue');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  if (loading) return <PageShell title="Prescription"><PageLoader /></PageShell>;

  const patient = appt?.patientId;

  return (
    <PageShell
      title="Consultation & prescription"
      subtitle={`${patient?.name || 'Patient'} · Token #${appt?.tokenNumber}`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => navigate('/doctor/queue')}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save prescription'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, maxWidth: 960 }}>
        <div>
          {/* Vitals */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>Vitals</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                ['Blood pressure', 'bloodPressure', '120/80 mmHg'],
                ['Pulse', 'pulse', 'bpm'],
                ['Temperature', 'temperature', '°C'],
                ['Weight', 'weight', 'kg'],
                ['Height', 'height', 'cm'],
                ['SpO2', 'spO2', '%'],
              ].map(([label, key, placeholder]) => (
                <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{label}</label>
                  <input className="input" placeholder={placeholder}
                    value={vitals[key] || ''} onChange={(e) => setVitals({ ...vitals, [key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          {/* Chief complaint & diagnosis */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Chief complaint</label>
              <input className="input" placeholder="Patient's primary concern..."
                value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Diagnosis</label>
              <input className="input" placeholder="Clinical diagnosis..."
                value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Consultation notes</label>
              <textarea className="input" rows={3} placeholder="Detailed notes..."
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {/* Prescriptions */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 600 }}>Prescriptions</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={checkInteractions} disabled={checkingInteractions}>
                  {checkingInteractions ? 'Checking...' : '✦ Check interactions'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={addRx}>+ Add medicine</button>
              </div>
            </div>

            {/* Drug interaction result */}
            {interactionResult && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 14,
                background: interactionResult.safe ? 'var(--success-light)' : 'var(--danger-light)',
                border: `1px solid ${interactionResult.safe ? '#b7dfad' : '#f5c0bf'}`,
              }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: interactionResult.safe ? 'var(--success)' : 'var(--danger)', marginBottom: 4 }}>
                  {interactionResult.safe ? '✓ No interactions detected' : `⚠ ${interactionResult.warnings?.length} interaction(s) found`}
                </div>
                {interactionResult.warnings?.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>
                    <strong>{w.drugs?.join(' + ')}</strong> ({w.severity}): {w.description}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {prescriptions.map((rx, i) => (
                <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: 14, position: 'relative' }}>
                  <button onClick={() => removeRx(i)} style={{
                    position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
                    color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1,
                  }}>×</button>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10 }}>
                    {[
                      ['Medicine name', 'medicine', 'e.g. Aspirin'],
                      ['Dosage', 'dosage', '75mg'],
                      ['Frequency', 'frequency', '1-0-1'],
                      ['Duration', 'duration', '7 days'],
                    ].map(([label, field, placeholder]) => (
                      <div key={field} className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">{label}</label>
                        <input className="input" placeholder={placeholder}
                          value={rx[field] || ''} onChange={(e) => updateRx(i, field, e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, marginTop: 8 }}>
                    <label className="form-label">Instructions</label>
                    <input className="input" placeholder="e.g. Take after food"
                      value={rx.instructions || ''} onChange={(e) => updateRx(i, 'instructions', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lab & Follow-up */}
          <div className="card">
            <div className="form-group">
              <label className="form-label">Lab tests ordered (comma separated)</label>
              <input className="input" placeholder="CBC, LFT, ECG..."
                value={labTests} onChange={(e) => setLabTests(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Follow-up date (optional)</label>
              <input className="input" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Patient sidebar */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Patient info</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--primary-dark)' }}>
                {(patient?.name || 'P')[0]}
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{patient?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {patient?.patient?.gender} · {patient?.patient?.bloodGroup}
                </div>
              </div>
            </div>
            {patient?.patient?.allergies?.length > 0 && (
              <div style={{ background: 'var(--danger-light)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>
                <strong style={{ color: 'var(--danger)' }}>⚠ Allergies:</strong>{' '}
                {patient.patient.allergies.join(', ')}
              </div>
            )}
            {patient?.patient?.chronicConditions?.length > 0 && (
              <div style={{ background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>
                <strong style={{ color: 'var(--warning)' }}>Conditions:</strong>{' '}
                {patient.patient.chronicConditions.join(', ')}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Symptoms reported</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {appt?.symptoms?.length ? appt.symptoms.map((s) => (
                <span key={s} className="badge badge-blue" style={{ fontSize: 11 }}>{s}</span>
              )) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>None</span>}
            </div>
            {appt?.patientNotes && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <strong>Patient note:</strong> {appt.patientNotes}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
