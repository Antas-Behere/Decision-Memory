const router = require('express').Router();
const auth = require('../middleware/auth');
const { Comment, Decision, Notification } = require('../models/models');

router.use(auth);

router.get('/:decisionId', async (req, res) =>
  res.json(await Comment.find({ decision: req.params.decisionId }).populate('author', 'name').sort({ createdAt: 1 })));

router.post('/:decisionId', async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ msg: 'Comment is empty' });
  const c = await Comment.create({ decision: req.params.decisionId, text, author: req.user.id });
  const dec = await Decision.findById(req.params.decisionId);
  if (dec && String(dec.createdBy) !== req.user.id)
    await Notification.create({ user: dec.createdBy, text: `${req.user.name} commented on "${dec.title}"` });
  res.json(await c.populate('author', 'name'));
});

module.exports = router;