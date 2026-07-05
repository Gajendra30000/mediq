import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentsAPI, aiAPI } from '../../services/api';
import { PageShell, Stars, PageLoader } from '../../components/ui';

const SYMPTOMS = ['Chest pain','Shortness of breath','Headache','Fever','Joint pain',
  'Stomach pain','Skin rash','Back pain','Eye problem','Ear pain','Fatigue','Cough'];

export default function PatientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    appointmentsAPI.list({ upcoming: 'true', limit: 3 })
      .then((r) => setAppointments(r.data.appointments))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleSymptom = (s) => {
    setAiResult(null);
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const runAI = async () => {
    if (!selectedSymptoms.length) return;
    setAiLoading(true);
    try {
      const { data } = await aiAPI.suggestSpecialty(selectedSymptoms);
      setAiResult(data);
    } catch {
      setAiResult({ primarySpecialty: 'General Physician', reasoning: 'Please consult a general physician first.', urgency: 'routine' });
    } finally {
      setAiLoading(false);
    }
  };

  const urgencyColor = { routine: 'var(--success)', same_day: 'var(--warning)', urgent: 'var(--danger)', emergency: '#c00' };

  if (loading) return <PageShell title="Home"><PageLoader /></PageShell>;

  return (
    <PageShell
      title={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user?.name?.split(' ')[0]} 👋`}
      subtitle="How are you feeling today?"
      actions={
        <button className="btn btn-primary" onClick={() => navigate('/search')}>
          + Book appointment
        </button>
      }
    >
      {/* AI Symptom Checker */}
      <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(29,158,117,.3)', background: 'linear-gradient(135deg, #f0fdf8, #fff)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18 }}>✦</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-dark)' }}>AI symptom helper</span>
          <span className="badge badge-teal" style={{ fontSize: 10 }}>Powered by Claude</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          Select your symptoms and we'll suggest the right specialist.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {SYMPTOMS.map((s) => (
            <button key={s} onClick={() => toggleSymptom(s)} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              border: `1.5px solid ${selectedSymptoms.includes(s) ? 'var(--primary)' : 'var(--border)'}`,
              background: selectedSymptoms.includes(s) ? 'var(--primary-light)' : 'var(--surface)',
              color: selectedSymptoms.includes(s) ? 'var(--primary-dark)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: selectedSymptoms.includes(s) ? 500 : 400,
              cursor: 'pointer', transition: 'all .15s',
            }}>
              {s}
            </button>
          ))}
        </div>
        {selectedSymptoms.length > 0 && !aiResult && (
          <button className="btn btn-primary btn-sm" onClick={runAI} disabled={aiLoading}>
            {aiLoading ? 'Analysing...' : `Analyse ${selectedSymptoms.length} symptom${selectedSymptoms.length > 1 ? 's' : ''}`}
          </button>
        )}
        {aiResult && (
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 14, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Suggested: {aiResult.primarySpecialty}</span>
              <span style={{ fontSize: 12, color: urgencyColor[aiResult.urgency] || 'var(--text-secondary)', fontWeight: 500 }}>
                {aiResult.urgency?.replace('_', ' ')}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{aiResult.reasoning}</p>
            <button className="btn btn-primary btn-sm"
              onClick={() => navigate(`/search?specialty=${encodeURIComponent(aiResult.primarySpecialty)}`)}>
              Find {aiResult.primarySpecialty} →
            </button>
          </div>
        )}
      </div>

      {/* Upcoming Appointments */}
      {appointments.length > 0 && (
        <>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Upcoming appointments</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {appointments.map((appt) => (
              <div key={appt._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}
                onClick={() => navigate(`/appointments/${appt._id}`)} role="button" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  ⊕
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {appt.doctorId?.userId?.name || 'Doctor'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {new Date(appt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {appt.timeSlot} · Token: {appt.tokenNumber}
                  </div>
                </div>
                <span className={`badge badge-${appt.status === 'checked_in' ? 'teal' : 'blue'}`}>
                  {appt.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Quick actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { icon: '⊕', label: 'Book appointment', path: '/search', color: 'var(--primary-light)', textColor: 'var(--primary-dark)' },
          { icon: '◷', label: 'My appointments', path: '/appointments', color: '#EEEDFE', textColor: '#534AB7' },
          { icon: '♥', label: 'Medical history', path: '/records', color: '#FAECE7', textColor: '#993C1D' },
        ].map((a) => (
          <button key={a.path} onClick={() => navigate(a.path)} style={{
            background: a.color, border: 'none', borderRadius: 'var(--radius-lg)', padding: '20px 16px',
            textAlign: 'center', cursor: 'pointer', transition: 'transform .15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: a.textColor }}>{a.label}</div>
          </button>
        ))}
      </div>
    </PageShell>
  );
}
