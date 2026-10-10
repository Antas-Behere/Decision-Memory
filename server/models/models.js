const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const User = model('User', new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
}));

const Meeting = model('Meeting', new Schema({
  title: String,
  date: Date,
  notes: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true }));

const Decision = model('Decision', new Schema({
  title: String,
  description: String,
  rationale: String,
  alternatives: String,
  approvedBy: String,
  status: { type: String, enum: ['Proposed', 'Approved', 'Rejected'], default: 'Approved' },
  meeting: { type: Schema.Types.ObjectId, ref: 'Meeting' },
  decidedOn: { type: Date, default: Date.now },
  documents: [{ name: String, url: String }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true }));

module.exports = { User, Meeting, Decision };