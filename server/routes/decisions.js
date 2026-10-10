const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { Decision } = require('../models/models');

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
  const d = await Decision.create({ ...req.body, documents, createdBy: req.user.id });
  res.json(d);
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ msg: 'Invalid status' });
  const d = await Decision.findById(req.params.id);
  if (!d) return res.status(404).json({ msg: 'Not found' });
  if (String(d.createdBy) === req.user.id) return res.status(403).json({ msg: 'You cannot approve your own decision' });
  d.status = status;
  d.approvedBy = req.user.name;
  await d.save();
  res.json(d);
});

module.exports = router;