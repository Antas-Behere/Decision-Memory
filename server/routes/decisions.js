const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { Decision, User, Notification } = require('../models/models');

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  })
});

router.use(auth);

// List + search + filter. The timeline is this same endpoint, sorted by date.
router.get('/', async (req, res) => {
  const { q, status, meeting, from, to } = req.query;
  const f = {};
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    f.$or = ['title', 'description', 'rationale', 'alternatives'].map(k => ({ [k]: rx }));
  }
  if (status) f.status = status;
  if (meeting) f.meeting = meeting;
  if (from || to) f.decidedOn = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) };
 res.json(await Decision.find(f).populate('meeting', 'title').populate('createdBy', 'name').sort({ decidedOn: -1 }));
});

router.get('/:id', async (req, res) =>
  res.json(await Decision.findById(req.params.id).populate('meeting', 'title')));

router.post('/', upload.array('files'), async (req, res) => {
  const documents = (req.files || []).map(f => ({ name: f.originalname, url: `/uploads/${f.filename}` }));
  const d = await Decision.create({ ...req.body, status: 'Proposed', documents, createdBy: req.user.id });
  const others = await User.find({ _id: { $ne: req.user.id }, role: 'approver' }, '_id');
  await Notification.insertMany(others.map(u => ({ user: u._id, text: `${req.user.name} proposed "${d.title}", awaiting review` })));
  res.json(d);
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ msg: 'Invalid status' });
  const me = await User.findById(req.user.id);
  if (!me || me.role !== 'approver') return res.status(403).json({ msg: 'Only approvers can approve or reject' });
  const d = await Decision.findById(req.params.id);
  if (!d) return res.status(404).json({ msg: 'Not found' });
  if (String(d.createdBy) === req.user.id) return res.status(403).json({ msg: 'You cannot approve your own decision' });
  d.status = status;
  d.approvedBy = req.user.name;
  await d.save();
  await Notification.create({ user: d.createdBy, text: `${req.user.name} ${status.toLowerCase()} your decision "${d.title}"` });
  res.json(d);
});

router.put('/:id', async (req, res) => {
  const d = await Decision.findById(req.params.id);
  if (!d) return res.status(404).json({ msg: 'Not found' });
  if (String(d.createdBy) !== req.user.id) return res.status(403).json({ msg: 'Only the creator can edit' });
  if (d.status !== 'Proposed') return res.status(400).json({ msg: 'Only Proposed decisions can be edited' });
  for (const k of ['title', 'description', 'rationale', 'alternatives'])
    if (k in req.body) d[k] = req.body[k];
  await d.save();
  res.json(d);
});

router.delete('/:id', async (req, res) => {
  const d = await Decision.findById(req.params.id);
  if (!d) return res.status(404).json({ msg: 'Not found' });
  if (String(d.createdBy) !== req.user.id) return res.status(403).json({ msg: 'Only the creator can delete' });
  if (d.status !== 'Proposed') return res.status(400).json({ msg: 'Only Proposed decisions can be deleted' });
  await d.deleteOne();
  res.json({ msg: 'Deleted' });
});

const STOP = new Set(['the','and','for','with','are','was','this','that','from','our','use','using','has','have','will','not','but','all','can']);
const words = s => new Set(
  ((s || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 2 && !STOP.has(w))
);

router.get('/:id/similar', async (req, res) => {
  const d = await Decision.findById(req.params.id);
  if (!d) return res.status(404).json({ msg: 'Not found' });
  const base = words(`${d.title} ${d.description} ${d.rationale}`);
  const others = await Decision.find({ _id: { $ne: d._id } });
  const scored = others.map(o => {
    const shared = [...words(`${o.title} ${o.description} ${o.rationale}`)].filter(w => base.has(w));
    return { _id: o._id, title: o.title, status: o.status, decidedOn: o.decidedOn, score: shared.length, shared };
  }).filter(x => x.score >= 1).sort((a, b) => b.score - a.score).slice(0, 3);
  res.json(scored);
});

module.exports = router;