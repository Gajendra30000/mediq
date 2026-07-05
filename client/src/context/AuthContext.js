import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, doctorsAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [doctorProfile, setDoctorProfile] = useState(null);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('mq_token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await authAPI.me();
      setUser(data);
      let myDoc = null;
      if (data.role === 'doctor') {
        // Load the doctor profile linked to this user
        const { data: docs } = await doctorsAPI.list({ hospitalId: data.hospitalId?._id });
        myDoc = docs.doctors?.find((d) => d.userId?._id === data._id || d.userId === data._id);
        if (myDoc) setDoctorProfile(myDoc);
      }
      connectSocket({ ...data, doctorProfile: myDoc });
    } catch {
      localStorage.removeItem('mq_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const { data } = await authAPI.login({ email: normalizedEmail, password });
    localStorage.setItem('mq_token', data.token);
    setUser(data.user);
    if (data.user.role === 'doctor') {
      const { data: docs } = await doctorsAPI.list({ hospitalId: data.user.hospitalId });
      const myDoc = docs.doctors?.find((d) => d.userId?._id === data.user._id || d.userId === data.user._id);
      if (myDoc) setDoctorProfile(myDoc);
    }
    connectSocket(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('mq_token');
    setUser(null);
    setDoctorProfile(null);
    disconnectSocket();
  };

  const updateUser = (updates) => setUser((prev) => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, doctorProfile, login, logout, updateUser, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
