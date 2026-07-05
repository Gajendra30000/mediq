// PatientHistoryView.js — doctors view a patient's full medical history
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { recordsAPI } from '../../services/api';
import { PageShell, PageLoader, EmptyState } from '../../components/ui';

export default function PatientHistoryView() {
  const { patientId } = useParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    recordsAPI.byPatient(patientId).then((r) => {
      setRecords(r.data);
      if (r.data.length) setSelected(r.data[0]);
    }).finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <PageShell title="Patient history"><PageLoader /></PageShell>;

  return (
    <PageShell title="Patient history" subtitle={`${records.length} past visits`}>
      {records.length === 0 ? (
        <EmptyState icon="♥" title="No records" message="This patient has no past records in the system." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          {/* Visit list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {records.map((r) => (
              <div key={r._id}
                onClick={() => setSelected(r)}
                style={{
                  padding: '12px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  background: selected?._id === r._id ? 'var(--primary-light)' : 'var(--surface)',
                  border: `1px solid ${selected?._id === r._id ? 'var(--primary)' : 'var(--border)'}`,
                  transition: 'all .15s',
                }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: selected?._id === r._id ? 'var(--primary-dark)' : 'var(--text-primary)' }}>
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{r.diagnosis || 'Consultation'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{r.doctorId?.userId?.name}</div>
              </div>
            ))}
          </div>

          {/* Record detail */}
          {selected && (
            <div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>
                  {new Date(selected.createdAt).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                  {Object.entries(selected.vitals || {}).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{k.replace(/([A-Z])/g, ' $1')}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {selected.chiefComplaint && <div style={{ marginBottom: 6 }}><strong>Complaint:</strong> {selected.chiefComplaint}</div>}
                {selected.diagnosis && <div style={{ marginBottom: 6 }}><strong>Diagnosis:</strong> {selected.diagnosis}</div>}
                {selected.notes && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.7 }}>{selected.notes}</div>}
              </div>

              {selected.prescriptions?.length > 0 && (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>Prescriptions</div>
                  {selected.prescriptions.map((rx, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < selected.prescriptions.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 14 }}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{rx.medicine}</span>
                        {rx.dosage && <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{rx.dosage}</span>}
                        {rx.instructions && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{rx.instructions}</div>}
                      </div>
                      <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                        <div>{rx.frequency}</div>
                        <div style={{ fontSize: 12 }}>{rx.duration}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selected.labTests?.length > 0 && (
                <div className="card">
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Lab tests ordered</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selected.labTests.map((t) => <span key={t} className="badge badge-blue">{t}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
