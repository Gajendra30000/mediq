import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import './index.css';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PatientHome from './pages/patient/PatientHome';
import SearchPage from './pages/patient/SearchPage';
import DoctorProfile from './pages/patient/DoctorProfile';
import BookingFlow from './pages/patient/BookingFlow';
import LiveTicket from './pages/patient/LiveTicket';
import { MyAppointments, AppointmentDetail, CheckInPage, MedicalHistory } from './pages/patient/PatientPages';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorQueue from './pages/doctor/DoctorQueue';
import PatientHistoryView from './pages/doctor/PatientHistoryView';
import PrescriptionEditor from './pages/doctor/PrescriptionEditor';
import DoctorSchedule from './pages/doctor/DoctorSchedule';
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import StaffManagement from './pages/hospital/StaffManagement';
import HospitalAnalytics from './pages/hospital/HospitalAnalytics';
import ReceptionDesk from './pages/reception/ReceptionDesk';
import DisplayBoard from './pages/DisplayBoard';
import { PatientChatbot } from './pages/patient/PatientChatbot';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}><div className="spinner" style={{width:36,height:36}} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const destinations = { patient: '/home', doctor: '/doctor', admin: '/hospital', reception: '/reception' };
  return <Navigate to={destinations[user.role] || '/login'} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/checkin/:qrToken" element={<CheckInPage />} />
            <Route path="/" element={<HomeRedirect />} />

            {/* Patient */}
            <Route path="/home" element={<ProtectedRoute roles={['patient']}><PatientHome /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute roles={['patient']}><SearchPage /></ProtectedRoute>} />
            <Route path="/doctor/:id" element={<ProtectedRoute roles={['patient']}><DoctorProfile /></ProtectedRoute>} />
            <Route path="/book/:doctorId" element={<ProtectedRoute roles={['patient']}><BookingFlow /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute roles={['patient']}><MyAppointments /></ProtectedRoute>} />
            <Route path="/appointments/:id" element={<ProtectedRoute roles={['patient']}><AppointmentDetail /></ProtectedRoute>} />
            <Route path="/ticket/:id" element={<ProtectedRoute roles={['patient']}><LiveTicket /></ProtectedRoute>} />
            <Route path="/records" element={<ProtectedRoute roles={['patient']}><MedicalHistory /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute roles={['patient']}><PatientChatbot /></ProtectedRoute>} />

            {/* Doctor */}
            <Route path="/doctor" element={<ProtectedRoute roles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
            <Route path="/doctor/queue" element={<ProtectedRoute roles={['doctor']}><DoctorQueue /></ProtectedRoute>} />
            <Route path="/doctor/patient/:patientId" element={<ProtectedRoute roles={['doctor']}><PatientHistoryView /></ProtectedRoute>} />
            <Route path="/doctor/prescription/:appointmentId" element={<ProtectedRoute roles={['doctor']}><PrescriptionEditor /></ProtectedRoute>} />
            <Route path="/doctor/schedule" element={<ProtectedRoute roles={['doctor']}><DoctorSchedule /></ProtectedRoute>} />

            {/* Hospital Admin */}
            <Route path="/hospital" element={<ProtectedRoute roles={['admin']}><HospitalDashboard /></ProtectedRoute>} />
            <Route path="/hospital/staff" element={<ProtectedRoute roles={['admin']}><StaffManagement /></ProtectedRoute>} />
            <Route path="/hospital/analytics" element={<ProtectedRoute roles={['admin']}><HospitalAnalytics /></ProtectedRoute>} />

            {/* Reception */}
            <Route path="/reception" element={<ProtectedRoute roles={['reception']}><ReceptionDesk /></ProtectedRoute>} />

            {/* Public Display Board */}
            <Route path="/display/:doctorId" element={<DisplayBoard />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
