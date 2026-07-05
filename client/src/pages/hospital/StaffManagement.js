// StaffManagement.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hospitalsAPI, doctorsAPI, authAPI } from '../../services/api';
import { PageShell, PageLoader, Stars, EmptyState } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

export default function StaffManagement() {
  const { user } = useAuth();
  const toast = useToast();
  const hospitalId = user?.hospitalId?._id || user?.hospitalId;
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showAddReceptionist, setShowAddReceptionist] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [doctorForm, setDoctorForm] = useState({
    name: '', email: '', phone: '', password: '', specialty: '', qualification: '', experience: 5, consultationFee: 500,
  });
  const [receptionistForm, setReceptionistForm] = useState({
    name: '', email: '', phone: '', password: '',
  });

  useEffect(() => {
    if (!hospitalId) return;
    hospitalsAPI.getDoctors(hospitalId)
      .then((r) => setDoctors(r.data))
      .finally(() => setLoading(false));
  }, [hospitalId]);

  const toggleAvailability = async (doc) => {
    const newVal = !doc.isAvailableToday;
    setDoctors((prev) => prev.map((d) => d._id === doc._id ? { ...d, isAvailableToday: newVal } : d));
    try {
      await doctorsAPI.update(doc._id, { isAvailableToday: newVal });
      toast.success(`${doc.userId?.name} marked as ${newVal ? 'available' : 'unavailable'}`);
    } catch {
      setDoctors((prev) => prev.map((d) => d._id === doc._id ? { ...d, isAvailableToday: !newVal } : d));
    }
  };

  const handleDeleteDoctor = async (doc) => {
    if (window.confirm(`Are you sure you want to delete ${doc.userId?.name || 'this doctor'}? This will remove them from the system.`)) {
      try {
        await doctorsAPI.delete(doc._id);
        setDoctors((prev) => prev.filter((d) => d._id !== doc._id));
        toast.success(`Doctor ${doc.userId?.name || ''} deleted successfully`);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete doctor');
      }
    }
  };

  const addDoctor = async (e) => {
    e.preventDefault();
    if (!doctorForm.name || !doctorForm.email || !doctorForm.specialty || !doctorForm.qualification) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await authAPI.register({
        ...doctorForm,
        role: 'doctor',
        hospitalId,
        doctorData: {
          specialty: doctorForm.specialty,
          qualification: doctorForm.qualification,
          experience: parseInt(doctorForm.experience),
          consultationFee: parseInt(doctorForm.consultationFee),
        },
      });
      
      setDoctors((prev) => [...prev, response.data.user]);
      toast.success(`✅ Dr. ${doctorForm.name} added successfully!`);
      setShowAddDoctor(false);
      setDoctorForm({ name: '', email: '', phone: '', password: '', specialty: '', qualification: '', experience: 5, consultationFee: 500 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add doctor');
    } finally {
      setSubmitting(false);
    }
  };

  const addReceptionist = async (e) => {
    e.preventDefault();
    if (!receptionistForm.name || !receptionistForm.email) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      await authAPI.register({
        ...receptionistForm,
        role: 'reception',
        hospitalId,
      });
      
      toast.success(`✅ Receptionist ${receptionistForm.name} added successfully!`);
      setShowAddReceptionist(false);
      setReceptionistForm({ name: '', email: '', phone: '', password: '' });
      
      // Reload doctors list
      const { data } = await hospitalsAPI.getDoctors(hospitalId);
      setDoctors(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add receptionist');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = filter === 'all' ? doctors : filter === 'active' ? doctors.filter((d) => d.isAvailableToday) : doctors.filter((d) => !d.isAvailableToday);
  const specialties = [...new Set(doctors.map((d) => d.specialty))].sort();

  if (loading) return <PageShell title="Staff management"><PageLoader /></PageShell>;

  return (
    <PageShell
      title="Staff management"
      subtitle={`${doctors.length} doctors registered · ${doctors.filter((d) => d.isAvailableToday).length} available today`}
    >
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setShowAddDoctor(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⊕</span> Add Doctor
        </button>
        <button onClick={() => setShowAddReceptionist(true)} className="btn" style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <span>⊕</span> Add Receptionist
        </button>
      </div>

      {/* Summary row */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        {[
          { val: doctors.length, key: 'Total doctors' },
          { val: doctors.filter((d) => d.isAvailableToday).length, key: 'Available today' },
          { val: [...new Set(doctors.map((d) => d.specialty))].length, key: 'Specialties' },
          { val: (doctors.reduce((s, d) => s + (d.avgRating || 0), 0) / doctors.length || 0).toFixed(1), key: 'Avg rating' },
        ].map((s) => (
          <div key={s.key} className="stat-card">
            <div className="stat-val">{s.val}</div>
            <div className="stat-key">{s.key}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'active', 'unavailable'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: 13, cursor: 'pointer',
            background: filter === f ? 'var(--primary)' : 'var(--surface)',
            color: filter === f ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}`,
            textTransform: 'capitalize',
          }}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? <EmptyState icon="⊕" title="No doctors found" /> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {['Doctor', 'Specialty', 'Experience', 'Fee', 'Rating', 'Status', 'Today', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', letterSpacing: '.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc._id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--primary-dark)', flexShrink: 0 }}>
                        {(doc.userId?.name || 'D')[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{doc.userId?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{doc.qualification}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{doc.specialty}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{doc.experience} yrs</td>
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--primary)' }}>₹{doc.consultationFee}</td>
                  <td style={{ padding: '14px 16px' }}><Stars rating={doc.avgRating} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge ${doc.isAvailableToday ? 'badge-teal' : 'badge-red'}`}>
                      {doc.isAvailableToday ? 'Available' : 'Off today'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => toggleAvailability(doc)} style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: doc.isAvailableToday ? 'var(--primary)' : 'var(--border-strong)',
                      position: 'relative', transition: 'background .2s',
                    }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3, left: doc.isAvailableToday ? 23 : 3,
                        transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.3)',
                      }} />
                    </button>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button onClick={() => handleDeleteDoctor(doc)} className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, padding: '0 10px' }}>
                      <span>🗑</span> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Doctor Modal */}
      {showAddDoctor && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '90%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>⊕ Add Doctor</h3>
              <button onClick={() => setShowAddDoctor(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
            </div>

            <form onSubmit={addDoctor} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name *</label>
                <input type="text" placeholder="Dr. Name" value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Email (Gmail) *</label>
                <input type="email" placeholder="doctor@gmail.com" value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Phone</label>
                <input type="tel" placeholder="98765...." value={doctorForm.phone}
                  onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Password *</label>
                <input type="password" placeholder="Strong password" value={doctorForm.password}
                  onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Specialty *</label>
                <input type="text" placeholder="e.g., Cardiologist" value={doctorForm.specialty}
                  onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Qualification *</label>
                <input type="text" placeholder="e.g., MBBS, MD" value={doctorForm.qualification}
                  onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Experience (years)</label>
                  <input type="number" min="0" value={doctorForm.experience}
                    onChange={(e) => setDoctorForm({ ...doctorForm, experience: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Consultation Fee (₹)</label>
                  <input type="number" min="100" value={doctorForm.consultationFee}
                    onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                  {submitting ? 'Adding...' : '✅ Add Doctor'}
                </button>
                <button type="button" onClick={() => setShowAddDoctor(false)} className="btn" style={{ flex: 1, border: '1px solid var(--border)' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Receptionist Modal */}
      {showAddReceptionist && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '90%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>⊕ Add Receptionist</h3>
              <button onClick={() => setShowAddReceptionist(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 0 }}>✕</button>
            </div>

            <form onSubmit={addReceptionist} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name *</label>
                <input type="text" placeholder="Receptionist name" value={receptionistForm.name}
                  onChange={(e) => setReceptionistForm({ ...receptionistForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Email (Gmail) *</label>
                <input type="email" placeholder="receptionist@gmail.com" value={receptionistForm.email}
                  onChange={(e) => setReceptionistForm({ ...receptionistForm, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Phone</label>
                <input type="tel" placeholder="98765...." value={receptionistForm.phone}
                  onChange={(e) => setReceptionistForm({ ...receptionistForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Password *</label>
                <input type="password" placeholder="Strong password" value={receptionistForm.password}
                  onChange={(e) => setReceptionistForm({ ...receptionistForm, password: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginTop: 4 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                  {submitting ? 'Adding...' : '✅ Add Receptionist'}
                </button>
                <button type="button" onClick={() => setShowAddReceptionist(false)} className="btn" style={{ flex: 1, border: '1px solid var(--border)' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
