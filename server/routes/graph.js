const router = require('express').Router();
const auth = require('../middleware/auth');
const { Decision, Meeting, User } = require('../models/models');

router.use(auth);

router.get('/', async (req, res) => {
  const [meetings, decisions, users] = await Promise.all([
    Meeting.find({}, 'title date').sort({ date: 1 }).lean(),
    Decision.find({}, 'title status meeting createdBy').sort({ decidedOn: 1 }).lean(),
    User.find({}, 'name role').lean()
  ]);
  res.json({ meetings, decisions, users });
});

module.exports = router;
