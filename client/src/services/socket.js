import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (!socket) {
    socket = io(process.env.REACT_APP_SERVER_URL || 'https://mediqserver.onrender.com', {
      autoConnect: false,
    });
  }
  return socket;
};

export const getSocket = () => socket;

export const connectSocket = (user) => {
  if (!socket) initSocket();
  socket.connect();

  socket.on('connect', () => {
    if (user?.role === 'patient') {
      socket.emit('subscribe:patient', { userId: user._id });
    } else if (user?.role === 'doctor') {
      // doctorId comes from the doctor profile
      if (user.doctorProfile?._id) {
        socket.emit('subscribe:doctor', { doctorId: user.doctorProfile._id });
      }
    }
    if (user?.hospitalId) {
      socket.emit('subscribe:hospital', { hospitalId: user.hospitalId?._id || user.hospitalId });
    }
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
