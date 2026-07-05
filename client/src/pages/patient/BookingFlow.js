// BookingFlow.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorsAPI, appointmentsAPI } from '../../services/api';
import { PageShell, Stars, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function BookingFlow() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [queueInfo, setQueueInfo] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  // Generate next 14 available dates
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    doctorsAPI.get(doctorId).then((r) => { setDoctor(r.data); setLoading(false); });
  }, [doctorId]);

  // Fetch queue info when date is selected
  useEffect(() => {
    if (selectedDate && doctorId) {
      api.get(`/appointments/next-queue/${doctorId}/${selectedDate}`)
        .then((r) => setQueueInfo(r.data))
        .catch((err) => {
          toast.error(err.response?.data?.message || 'Could not fetch queue info');
          setQueueInfo(null);
        });
    }
  }, [selectedDate, doctorId]);

  const book = async () => {
    if (!selectedDate || !doctor) return toast.error('Please select a date');
    setBooking(true);
    try {
      const { data } = await appointmentsAPI.book({
        doctorId,
        hospitalId: doctor.hospitalId?._id || doctor.hospitalId,
        date: selectedDate,
        // Don't send timeSlot - server will auto-calculate based on queue
        type: 'scheduled',
        symptoms: symptoms.split(',').map((s) => s.trim()).filter(Boolean),
        patientNotes: notes,
      });
      toast.success('Appointment booked! Token #' + data.appointment.tokenNumber);
      navigate(`/appointments/${data.appointment._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally { setBooking(false); }
  };

  if (loading) return <PageShell title="Book appointment"><div style={{padding:40,textAlign:'center'}}><Spinner size={32}/></div></PageShell>;

  return (
    <PageShell title="Book appointment" subtitle={`with ${doctor?.userId?.name || 'Doctor'}`}>
      <div style={{ maxWidth: 600 }}>
        {/* Doctor summary card */}
        <div className="card" style={{ display: 'flex', gap: 14, marginBottom: 24, alignItems: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)' }}>
            {(doctor?.userId?.name || 'D')[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{doctor?.userId?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{doctor?.specialty} · {doctor?.qualification}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <Stars rating={doctor?.avgRating} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>₹{doctor?.consultationFee}</span>
            </div>
          </div>
        </div>

        {/* Date picker */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Select date</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {dates.map((d) => {
              const iso = d.toISOString().split('T')[0];
              const isSelected = selectedDate === iso;
              const day = d.toLocaleDateString('en-IN', { weekday: 'short' });
              const date = d.getDate();
              const month = d.toLocaleDateString('en-IN', { month: 'short' });
              return (
                <button key={iso} onClick={() => { setSelectedDate(iso); }} style={{
                  minWidth: 60, padding: '10px 8px', borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--primary)' : 'var(--surface)',
                  color: isSelected ? '#fff' : 'var(--text-primary)', cursor: 'pointer', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11 }}>{day}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>{date}</div>
                  <div style={{ fontSize: 11 }}>{month}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Queue info card */}
        {selectedDate && queueInfo && (
          <div className="card" style={{ marginBottom: 24, padding: 16, background: 'var(--primary-light)', border: '1.5px solid var(--primary)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Your estimated queue position</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>Queue Position #{queueInfo.queueNumber}</div>
            <div style={{ fontSize: 13 }}>
              <strong>Estimated time:</strong> {queueInfo.estimatedTime}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Each consultation takes ~{queueInfo.avgDurationMinutes} min
            </div>
          </div>
        )}

        {/* Additional info */}
        <div className="form-group">
          <label className="form-label">Symptoms (comma separated)</label>
          <input className="input" placeholder="e.g. chest pain, shortness of breath"
            value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Notes for doctor (optional)</label>
          <textarea className="input" rows={3} placeholder="Any additional information..."
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', height: 46, fontSize: 15 }}
          onClick={book} disabled={booking || !selectedDate}>
          {booking ? 'Booking...' : `Confirm booking — ₹${doctor?.consultationFee || 500}`}
        </button>
      </div>
    </PageShell>
  );
}
