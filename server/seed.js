require('dotenv').config();
const mongoose = require('mongoose');
const { User, Meeting, Decision, Comment, Notification } = require('./models/models');

// Use whichever bcrypt package your project has installed
let bcrypt;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = require('bcrypt'); }

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Wipe demo data (users are kept, only ant and riya are reset below)
  await Promise.all([
    Meeting.deleteMany({}), Decision.deleteMany({}),
    Comment.deleteMany({}), Notification.deleteMany({})
  ]);

  const pw = await bcrypt.hash('123456', 10);
  const makeUser = async (name, email, role) => {
    const u = (await User.findOne({ email })) || new User({ email });
    u.name = name; u.password = pw; u.role = role;
    await u.save();
    return u;
  };
  const ant = await makeUser('Ant', 'ant@demo.com', 'member');
  const riya = await makeUser('Riya', 'riya@demo.com', 'approver');

  const mk = (title, date) => Meeting.create({ title, date: new Date(date), createdBy: ant._id });
  const event = await mk('Event Planning Meeting', '2026-08-20');
  const tech = await mk('Tech Stack Meeting', '2026-09-10');
  const recruit = await mk('Recruitment Drive Meeting', '2026-10-05');

  const dec = (o) => Decision.create({ createdBy: ant._id, ...o, decidedOn: new Date(o.decidedOn) });
  const CO = 'Commanding Officer';

  await dec({ title: 'Book the auditorium for the annual day', description: 'Reserve the auditorium for the annual day programme.',
    rationale: 'Large capacity helps recruitment and keeps everyone in one place.', alternatives: 'Open ground, seminar hall.',
    status: 'Approved', approvedBy: CO, meeting: event._id, decidedOn: '2026-08-20' });
  await dec({ title: 'Charge an entry fee for the annual day', description: 'Collect a ticket fee from visitors.',
    rationale: 'Would cover decoration costs.', alternatives: 'Free entry with sponsors.',
    status: 'Rejected', approvedBy: CO, meeting: event._id, decidedOn: '2026-08-20' });

  await dec({ title: 'Use MongoDB as the database', description: 'Store all records in MongoDB.',
    rationale: 'Flexible documents suit meeting notes and attachments.', alternatives: 'MySQL, PostgreSQL.',
    status: 'Approved', approvedBy: CO, meeting: tech._id, decidedOn: '2026-09-10' });
  await dec({ title: 'Build the frontend in React', description: 'Single page application with React and Vite.',
    rationale: 'Reusable components and a fast development cycle.', alternatives: 'Plain HTML, Angular.',
    status: 'Approved', approvedBy: CO, meeting: tech._id, decidedOn: '2026-09-10' });

  await dec({ title: 'Use Instagram as the main recruitment channel', description: 'Promote the next intake through Instagram posts and reels.',
    rationale: 'Most students are active there and it costs nothing.', alternatives: 'Posters, WhatsApp groups.',
    status: 'Approved', approvedBy: CO, meeting: recruit._id, decidedOn: '2026-10-05' });
  await dec({ title: 'Hire an external photographer', description: 'Pay a professional for event photos.',
    rationale: 'Better quality pictures.', alternatives: 'Student volunteers.',
    status: 'Rejected', approvedBy: CO, meeting: recruit._id, decidedOn: '2026-10-05' });

  const sponsor = await dec({ title: 'Approach a local company for sponsorship', description: 'Request funds and goodies for the annual day.',
    rationale: 'Reduces the budget burden.', alternatives: 'Alumni donations.',
    status: 'Proposed', meeting: event._id, decidedOn: '2026-10-20' });
  await dec({ title: 'Move hosting to a paid cloud server', description: 'Shift the platform to a managed server.',
    rationale: 'Better uptime for all users.', alternatives: 'Keep running on a college machine.',
    status: 'Proposed', meeting: tech._id, decidedOn: '2026-11-02' });

  await Comment.create({ decision: sponsor._id, text: 'Can we get two quotes first?', author: riya._id });

  console.log('Seeded: login ant@demo.com / riya@demo.com, password 123456');
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });