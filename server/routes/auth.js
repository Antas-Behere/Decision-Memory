const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/models');

const sign = u => jwt.sign({ id: u._id, name: u.name, role: u.role || 'member' },
  process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ msg: 'Email already exists' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.json({ token: sign(user), name: user.name });
  } catch (e) {
    res.status(500).json({ msg: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(400).json({ msg: 'Invalid credentials' });
  res.json({ token: sign(user), name: user.name });
});

module.exports = router;