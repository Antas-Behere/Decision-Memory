const router = require('express').Router();
const auth = require('../middleware/auth');
const { Decision } = require('../models/models');

router.use(auth);

const STOP = new Set(('the and for with are was were this that from our use using has have will not but all can ' +
  'who why what when how did does which decision decisions made taken take approved approve alternatives alternative ' +
  'considered similar before been').split(' '));
const words = s => (String(s || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => w.length > 2 && !STOP.has(w));

router.post('/', async (req, res) => {
  const q = (req.body.question || '').trim();
  if (!q) return res.status(400).json({ msg: 'Type a question' });

  const ql = q.toLowerCase();
  const intent = /who.*(approv|reject|decid)/.test(ql) ? 'who'
    : /alternativ|instead|other option/.test(ql) ? 'alt'
    : /why|reason|rationale/.test(ql) ? 'why' : 'general';

  const base = new Set(words(q));
  const all = await Decision.find().populate('meeting', 'title');

  const hits = all.map(d => {
    const shared = [...new Set(words(`${d.title} ${d.description} ${d.rationale} ${d.alternatives}`))].filter(w => base.has(w));
    const titleHits = words(d.title).filter(w => base.has(w)).length;
    return { d, shared, score: shared.length + titleHits };
  }).filter(h => h.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  const answerFor = d => {
    if (intent === 'who') return d.status === 'Proposed' ? 'Still awaiting review.' : `${d.status} by ${d.approvedBy || 'a reviewer'}.`;
    if (intent === 'alt') return d.alternatives || 'No alternatives were recorded.';
    if (intent === 'why') return d.rationale || 'No rationale was recorded.';
    return `${d.status}${d.approvedBy ? ' by ' + d.approvedBy : ''}. Reason: ${d.rationale || 'none recorded'}.`;
  };

  res.json({
    intent,
    results: hits.map(h => ({
      _id: h.d._id,
      title: h.d.title,
      status: h.d.status,
      decidedOn: h.d.decidedOn,
      meeting: h.d.meeting?.title,
      answer: answerFor(h.d),
      shared: h.shared
    }))
  });
});

module.exports = router;