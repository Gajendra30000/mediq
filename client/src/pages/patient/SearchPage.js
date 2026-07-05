import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { doctorsAPI } from '../../services/api';
import { PageShell, Stars, PageLoader } from '../../components/ui';

const SPECIALTIES = ['Cardiologist','General Physician','Dermatologist','Orthopedic Surgeon',
  'Pediatrician','Gynecologist','Neurologist','Psychiatrist','ENT Specialist','Ophthalmologist'];

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || '');
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { doSearch(); }, [specialty]);

  const doSearch = async () => {
    setLoading(true);
    try {
      const docRes = await doctorsAPI.list({ specialty: specialty, q: query, limit: 20 });
      setDoctors(docRes.data.doctors || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); doSearch(); };

  return (
    <PageShell title="Find doctors" subtitle="Search by specialty, name, or symptom">
      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Search doctors by name or specialty..."
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="btn btn-primary" type="submit">Search</button>
      </form>

      {/* Specialty pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button onClick={() => setSpecialty('')} style={{
          padding: '5px 14px', borderRadius: 'var(--radius-full)', fontSize: 13,
          background: !specialty ? 'var(--primary)' : 'var(--surface)',
          color: !specialty ? '#fff' : 'var(--text-secondary)',
          border: '1px solid ' + (!specialty ? 'var(--primary)' : 'var(--border)'), cursor: 'pointer',
        }}>All</button>
        {SPECIALTIES.map((s) => (
          <button key={s} onClick={() => setSpecialty(s)} style={{
            padding: '5px 14px', borderRadius: 'var(--radius-full)', fontSize: 13,
            background: specialty === s ? 'var(--primary)' : 'var(--surface)',
            color: specialty === s ? '#fff' : 'var(--text-secondary)',
            border: '1px solid ' + (specialty === s ? 'var(--primary)' : 'var(--border)'), cursor: 'pointer',
          }}>{s}</button>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {doctors.length === 0 && <div style={{ color: 'var(--text-secondary)', padding: 20 }}>No doctors found. Try a different search.</div>}
          {doctors.map((doc) => (
            <div key={doc._id} className="card" style={{ display: 'flex', gap: 16, cursor: 'pointer', transition: 'box-shadow .15s' }}
              onClick={() => navigate(`/doctor/${doc._id}`)}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600, color: 'var(--primary-dark)', flexShrink: 0 }}>
                {(doc.userId?.name || 'D')[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{doc.userId?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0' }}>
                  {doc.specialty} · {doc.qualification} · {doc.experience} yrs exp
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>₹{doc.consultationFee}</span>
                  <Stars rating={doc.avgRating} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({doc.totalReviews || 0} reviews)</span>
                  {doc.isAvailableToday && <span className="badge badge-teal">Available today</span>}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" style={{ alignSelf: 'center' }}
                onClick={(e) => { e.stopPropagation(); navigate(`/book/${doc._id}`); }}>
                Book
              </button>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
