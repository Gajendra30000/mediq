const {
  analyticsRouter,
  recordsRouter,
  doctorsRouter,
  slotsRouter,
  reviewsRouter,
} = require('./combined');

module.exports = {
  analytics: analyticsRouter,
  records: recordsRouter,
  doctors: doctorsRouter,
  slots: slotsRouter,
  reviews: reviewsRouter,
};
