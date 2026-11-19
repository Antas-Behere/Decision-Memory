const router = require('express').Router();
const auth = require('../middleware/auth');
const { Decision, Comment } = require('../models/models');

router.use(auth);

router.get('/', async (req, res) => {
  const decisions = await Decision.find().populate('createdBy', 'name').sort({ createdAt: -1 }).limit(15);
  const comments = await Comment.find().populate('author', 'name').populate('decision', 'title').sort({ createdAt: -1 }).limit(15);

  const feed = [
    ...decisions.map(d => ({
      when: d.createdAt,
      text: d.status === 'Proposed'
        ? `${d.createdBy?.name || 'Someone'} proposed "${d.title}"`
        : `${d.createdBy?.name || 'Someone'} recorded "${d.title}" (${d.status}${d.approvedBy ? ' by ' + d.approvedBy : ''})`
    })),
    ...comments.map(c => ({
      when: c.createdAt,
      text: `${c.author?.name || 'Someone'} commented on "${c.decision?.title || 'a decision'}"`
    }))
  ].sort((a, b) => new Date(b.when) - new Date(a.when)).slice(0, 20);

  const pending = (await Decision.find({ status: 'Proposed' }))
    .map(d => ({
      _id: d._id,
      title: d.title,
      days: Math.floor((Date.now() - new Date(d.decidedOn)) / 86400000)
    }))
    .filter(p => p.days >= 3)
    .sort((a, b) => b.days - a.days);

  res.json({ feed, pending });
});

module.exports = router;