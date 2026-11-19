const router = require('express').Router();
const auth = require('../middleware/auth');
const { Notification } = require('../models/models');

router.use(auth);

router.get('/', async (req, res) =>
  res.json(await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(20)));

router.patch('/read', async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  res.json({ msg: 'ok' });
});

module.exports = router;