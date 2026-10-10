const router = require('express').Router();
const auth = require('../middleware/auth');
const { Meeting } = require('../models/models');

router.use(auth);

router.get('/', async (req, res) => res.json(await Meeting.find().sort({ date: -1 })));

router.post('/', async (req, res) =>
  res.json(await Meeting.create({ ...req.body, createdBy: req.user.id })));

module.exports = router;