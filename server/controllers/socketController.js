module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Patient subscribes to their personal room
    socket.on('subscribe:patient', ({ userId }) => {
      socket.join(`patient:${userId}`);
      console.log(`Patient ${userId} joined room`);
    });

    // Doctor subscribes to their queue room
    socket.on('subscribe:doctor', ({ doctorId }) => {
      socket.join(`doctor:${doctorId}`);
      console.log(`Doctor ${doctorId} joined room`);
    });

    // Hospital admin/reception subscribes to hospital room
    socket.on('subscribe:hospital', ({ hospitalId }) => {
      socket.join(`hospital:${hospitalId}`);
      console.log(`Hospital ${hospitalId} room joined`);
    });

    // Patient joins to track a specific appointment token
    socket.on('subscribe:appointment', ({ appointmentId }) => {
      socket.join(`appointment:${appointmentId}`);
    });

    // Doctor toggles availability
    socket.on('doctor:availability', async ({ doctorId, isAvailable }) => {
      const Doctor = require('../models/Doctor');
      const doc = await Doctor.findByIdAndUpdate(doctorId, { isAvailableToday: isAvailable }, { new: true });
      if (doc) {
        io.to(`hospital:${doc.hospitalId}`).emit('doctor:availability_changed', {
          doctorId,
          isAvailable,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
