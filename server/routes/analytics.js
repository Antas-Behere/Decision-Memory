const router = require('express').Router();
const auth = require('../middleware/auth');
const { Decision, Meeting, User, Comment } = require('../models/models');

router.use(auth);

router.get('/', async (req, res) => {
  const [total, meetings, users, comments] = await Promise.all([
    Decision.countDocuments(), Meeting.countDocuments(),
    User.countDocuments(), Comment.countDocuments()
  ]);
  const byStatus = await Decision.aggregate([
    { $group: { _id: '$status', n: { $sum: 1 } } }
  ]);
  const byMonth = await Decision.aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$decidedOn' } }, n: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const byUser = await Decision.aggregate([
    { $group: { _id: '$createdBy', n: { $sum: 1 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $project: { name: { $arrayElemAt: ['$u.name', 0] }, n: 1 } },
    { $sort: { n: -1 } }
  ]);
  res.json({ total, meetings, users, comments, byStatus, byMonth, byUser });
});

module.exports = router;