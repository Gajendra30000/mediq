import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Logo } from '../components/ui';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    dob: '', gender: '', bloodGroup: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    // Clear error for this field when user starts typing
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Gmail validation
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!form.email || !gmailRegex.test(form.email)) {
      newErrors.email = 'Please use format name@gmail.com';
    }
    
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (form.password && form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await authAPI.register({
        name: form.name, email: form.email, phone: form.phone, password: form.password,
        role: 'patient',
        patientData: { dob: form.dob, gender: form.gender, bloodGroup: form.bloodGroup },
      });
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #e8f8f2 0%, #f0f4ff 100%)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Logo size="lg" />
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: 14 }}>Create your patient account</p>
        </div>
        <div className="card" style={{ borderRadius: 'var(--radius-xl)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Full name</label>
                <input className="input" placeholder="Rahul Sharma" value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="input" type="email" value={form.email} onChange={set('email')} required 
                  style={{ borderColor: errors.email ? '#ff4757' : undefined }} />
                {errors.email && <p style={{ color: '#ff4757', fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="input" type="tel" value={form.phone} onChange={set('phone')} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of birth</label>
                <input className="input" type="date" value={form.dob} onChange={set('dob')} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="input" value={form.gender} onChange={set('gender')}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Blood group</label>
                <select className="input" value={form.bloodGroup} onChange={set('bloodGroup')}>
                  <option value="">Select</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="input" type="password" value={form.password} onChange={set('password')} required minLength={6}
                  style={{ borderColor: errors.password ? '#ff4757' : undefined }} />
                {errors.password && <p style={{ color: '#ff4757', fontSize: 12, marginTop: 4 }}>{errors.password}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input className="input" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required
                  style={{ borderColor: errors.confirmPassword ? '#ff4757' : undefined }} />
                {errors.confirmPassword && <p style={{ color: '#ff4757', fontSize: 12, marginTop: 4 }}>{errors.confirmPassword}</p>}
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', height: 44, fontSize: 15 }}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
