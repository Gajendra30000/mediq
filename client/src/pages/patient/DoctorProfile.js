import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorsAPI, reviewsAPI, aiAPI } from '../../services/api';
import { PageShell, Stars, PageLoader } from '../../components/ui';

export default function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      doctorsAPI.get(id).catch(err => { console.error(err); return null; }),
      reviewsAPI.byDoctor(id, { limit: 5 }).catch(err => { console.error(err); return { data: { reviews: [] } }; }),
    ]).then(([dRes, rRes]) => {
      if (dRes) setDoctor(dRes.data);
      if (rRes) setReviews(rRes.data.reviews || []);
    }).finally(() => setLoading(false));

    aiAPI.summarizeReviews(id).then((r) => setAiSummary(r.data.summary)).catch(() => {});
  }, [id]);

  if (loading) return <PageShell title="Doctor profile"><PageLoader /></PageShell>;
  if (!doctor) return <PageShell title="Doctor profile"><p>Not found.</p></PageShell>;

  return (
    <PageShell title="Doctor profile"
      actions={<button className="btn btn-primary" onClick={() => navigate(`/book/${id}`)}>Book appointment</button>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, maxWidth: 900 }}>
        <div>
          {/* Doctor card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'var(--primary-dark)' }}>
                {(doctor.userId?.name || 'D')[0]}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{doctor.userId?.name}</div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{doctor.specialty}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{doctor.qualification} · {doctor.experience} years exp</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
                  <Stars rating={doctor.avgRating} />
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>({doctor.totalReviews || 0} reviews)</span>
                </div>
              </div>
            </div>

            {doctor.bio && <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>{doctor.bio}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Consultation fee', `₹${doctor.consultationFee}`],
                ['Follow-up fee', `₹${doctor.followUpFee}`],
                ['Languages', doctor.languages?.join(', ')],
                ['Hospital', doctor.hospitalId?.name],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{k.toUpperCase()}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Review summary */}
          {aiSummary && (
            <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(29,158,117,.3)', background: '#f0fdf8' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>✦</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-dark)' }}>AI review summary</span>
                <span className="badge badge-teal" style={{ fontSize: 10 }}>Claude</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7 }}>{aiSummary}</p>
            </div>
          )}

          {/* Reviews */}
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 14 }}>Patient reviews</div>
            {reviews.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No reviews yet.</p>
            ) : reviews.map((r) => (
              <div key={r._id} style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{r.isAnonymous ? 'Anonymous' : r.patientId?.name}</div>
                  <Stars rating={r.doctorRating} showNumber={false} />
                </div>
                {r.comment && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Booking sidebar */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>₹{doctor.consultationFee}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Per consultation · ~{doctor.avgConsultTime} min avg</div>
            {doctor.isAvailableToday && <div className="badge badge-teal" style={{ marginBottom: 14 }}>Available today</div>}
            <button className="btn btn-primary" style={{ width: '100%', height: 46 }} onClick={() => navigate(`/book/${id}`)}>
              Book appointment
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
