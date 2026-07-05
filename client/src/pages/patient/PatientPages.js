// MyAppointments
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { appointmentsAPI, recordsAPI } from '../../services/api';
import { PageShell, Stars, PageLoader, EmptyState, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function MyAppointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');

  useEffect(() => {
    const params = filter === 'upcoming' ? { upcoming: 'true' } : {};
    appointmentsAPI.list(params)
      .then((r) => setAppointments(r.data.appointments))
      .finally(() => setLoading(false));
  }, [filter]);

  const statusColor = { waiting: 'blue', in_consultation: 'green', completed: 'teal', skipped: 'red' };

  return (
    <PageShell title="My appointments">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['upcoming','all'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 18px', borderRadius: 'var(--radius-full)', fontSize: 13,
            background: filter === f ? 'var(--primary)' : 'var(--surface)',
            color: filter === f ? '#fff' : 'var(--text-secondary)',
            border: '1px solid ' + (filter === f ? 'var(--primary)' : 'var(--border)'), cursor: 'pointer',
            textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {loading ? <PageLoader /> : appointments.length === 0 ? (
        <EmptyState icon="◷" title="No appointments" message="Book your first appointment to get started."
          action={<button className="btn btn-primary" onClick={() => navigate('/search')}>Find a doctor</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {appointments.map((a) => (
            <div key={a._id} className="card" style={{ display: 'flex', gap: 14, cursor: 'pointer' }}
              onClick={() => navigate(`/appointments/${a._id}`)}>
              <div style={{ width: 50, height: 50, borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                ⊕
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.doctorId?.userId?.name || 'Doctor'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.doctorId?.specialty}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {new Date(a.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {a.timeSlot}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span className={`badge badge-${statusColor[a.status] || 'blue'}`} style={{ textTransform: 'capitalize' }}>
                  {a.status.replace('_', ' ')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Token: {a.tokenNumber}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

// AppointmentDetail
export function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    appointmentsAPI.get(id)
      .then((r) => {
        setAppt(r.data);
        if (r.data.status === 'completed') {
          return recordsAPI.byAppointment(id)
            .then((recRes) => setRecord(recRes.data))
            .catch(() => setRecord(null));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageShell title="Appointment"><PageLoader /></PageShell>;
  if (!appt) return <PageShell title="Appointment"><p>Not found.</p></PageShell>;

  return (
    <PageShell title="Appointment details"
      actions={
        appt.status === 'waiting' && (
          <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
            onClick={async () => {
              await appointmentsAPI.cancel(appt._id, { reason: 'Cancelled by patient' });
              setAppt({ ...appt, status: 'cancelled' });
            }}>Cancel</button>
        )
      }>
      <div style={{ maxWidth: 560 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)' }}>
              {(appt.doctorId?.userId?.name || 'D')[0]}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{appt.doctorId?.userId?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{appt.doctorId?.specialty}</div>
            </div>
          </div>
          <div className="divider" />
          {[
            ['Hospital', appt.hospitalId?.name],
            ['Date', new Date(appt.date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })],
            ['Time', appt.timeSlot],
            ['Token', appt.tokenNumber],
            ['Type', appt.type],
            ['Status', appt.status.replace('_', ' ')],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{v}</span>
            </div>
          ))}
        </div>

        {appt.status === 'waiting' || appt.status === 'in_consultation' ? (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/ticket/${appt._id}`)}>
            View live queue position
          </button>
        ) : null}

        {record && (
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>✦ Consultation prescription</div>
              <span className="badge badge-teal">Completed</span>
            </div>

            {record.diagnosis && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Diagnosis</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{record.diagnosis}</div>
              </div>
            )}

            {record.chiefComplaint && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Chief Complaint</div>
                <div style={{ fontSize: 13 }}>{record.chiefComplaint}</div>
              </div>
            )}

            {/* Vitals Table */}
            {record.vitals && Object.values(record.vitals).some(Boolean) && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>Vitals</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, background: 'var(--surface-2)', padding: 10, borderRadius: 'var(--radius-md)' }}>
                  {record.vitals.bloodPressure && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>BP</div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{record.vitals.bloodPressure}</div>
                    </div>
                  )}
                  {record.vitals.pulse && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Pulse</div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{record.vitals.pulse} bpm</div>
                    </div>
                  )}
                  {record.vitals.temperature && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Temp</div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{record.vitals.temperature} °C</div>
                    </div>
                  )}
                  {record.vitals.weight && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Weight</div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{record.vitals.weight} kg</div>
                    </div>
                  )}
                  {record.vitals.height && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Height</div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{record.vitals.height} cm</div>
                    </div>
                  )}
                  {record.vitals.spO2 && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>SpO2</div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{record.vitals.spO2} %</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Prescriptions */}
            {record.prescriptions?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Prescribed Medicines</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {record.prescriptions.map((rx, idx) => (
                    <div key={idx} style={{ background: 'var(--surface-2)', padding: 10, borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13 }}>
                        <span>{rx.medicine} {rx.dosage ? `(${rx.dosage})` : ''}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{rx.frequency} · {rx.duration}</span>
                      </div>
                      {rx.instructions && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                          Instructions: {rx.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {record.notes && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Consultation Notes</div>
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{record.notes}</div>
              </div>
            )}

            {record.labTests?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Lab Tests Ordered</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {record.labTests.map((test, idx) => (
                    <span key={idx} className="badge badge-blue" style={{ fontSize: 11 }}>{test}</span>
                  ))}
                </div>
              </div>
            )}

            {record.followUpDate && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                📅 <strong>Follow-up date:</strong> {new Date(record.followUpDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// CheckInPage - standalone QR landing
export function CheckInPage() {
  const { qrToken } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!qrToken) return;
    appointmentsAPI.checkinQR(qrToken)
      .then((r) => setResult(r.data))
      .catch((err) => setResult({ error: err.response?.data?.message || 'Check-in failed' }))
      .finally(() => setLoading(false));
  }, [qrToken]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--surface-3)' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: 32 }}>
        {loading ? <><Spinner size={40} /><div style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Checking you in...</div></>
          : result?.error ? (
            <><div style={{ fontSize: 40, marginBottom: 12 }}>✗</div><div style={{ fontSize: 16, fontWeight: 600, color: 'var(--danger)' }}>{result.error}</div></>
          ) : (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>Checked in!</div>
              <div style={{ fontSize: 32, fontWeight: 700, margin: '12px 0' }}>Token: {result?.appointment?.tokenNumber}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Queue position: {result?.appointment?.queuePosition ?? 'Calculating...'}</div>
            </>
          )
        }
      </div>
    </div>
  );
}

// MedicalHistory
export function MedicalHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?._id) return;
    recordsAPI.byPatient(user._id)
      .then((r) => setRecords(r.data.records || r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <PageShell title="Medical history" subtitle="Your past consultations and prescriptions">
      {loading ? <PageLoader /> : records.length === 0 ? (
        <EmptyState icon="♥" title="No records yet" message="Your medical records will appear here after consultations." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {records.map((r) => (
            <div key={r._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{r.doctorId?.userId?.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.doctorId?.specialty} · {r.hospitalId?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</div>
                </div>
                <span className="badge badge-blue">{r.diagnosis || 'Consultation'}</span>
              </div>
              {r.prescriptions?.length > 0 && (
                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>PRESCRIPTION</div>
                  {r.prescriptions.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: i < r.prescriptions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontWeight: 500 }}>{p.medicine} {p.dosage}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{p.frequency} · {p.duration}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
