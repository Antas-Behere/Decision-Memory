import { useState, useEffect } from 'react';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function api(path, opts = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(API + '/api' + path, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || 'Error');
  return data;
}

const fmt = d => new Date(d).toLocaleDateString();

function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    try {
      const d = await api('/auth/' + mode, { method: 'POST', body: JSON.stringify(f) });
      localStorage.setItem('token', d.token);
      localStorage.setItem('name', d.name);
      onLogin(d.name);
    } catch (x) { setErr(x.message); }
  };

  return (
    <div className="wrap" style={{ maxWidth: 380 }}>
      <h2>Decision Memory</h2>
      <form className="card" onSubmit={submit}>
        <h3>{mode === 'login' ? 'Login' : 'Register'}</h3>
        {mode === 'register' && <input placeholder="Name" onChange={set('name')} required />}
        <input type="email" placeholder="Email" onChange={set('email')} required />
        <input type="password" placeholder="Password" onChange={set('password')} required />
        {err && <p className="err">{err}</p>}
        <button className="go">{mode === 'login' ? 'Login' : 'Create account'}</button>
        <p><small style={{ cursor: 'pointer' }} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'New here? Register' : 'Have an account? Login'}
        </small></p>
      </form>
    </div>
  );
}

function DecisionCard({ d, reload }) {
  const decide = async status => {
    try {
      await api(`/decisions/${d._id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      reload();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className={`card dot st-${d.status}`}>
      <div className="label" />
      <h3>{d.title} <span className="badge">{d.status}</span></h3>
      <small>{fmt(d.decidedOn)} {d.meeting && `• ${d.meeting.title}`} {d.approvedBy && `• ${d.approvedBy}`}</small>
      {d.createdBy && <small>✍️ Recorded by {d.createdBy.name}</small>}
      {d.description && <p>{d.description}</p>}
      {d.rationale && <p><b>Why:</b> {d.rationale}</p>}
      {d.alternatives && <p><b>Alternatives:</b> {d.alternatives}</p>}
      {d.documents?.map(x => <div key={x.url}><a href={API + x.url} target="_blank" rel="noreferrer">📎 {x.name}</a></div>)}
      {d.status === 'Proposed' && reload && (
        <div className="row">
          <button className="go" onClick={() => decide('Approved')}>✔ Approve</button>
          <button className="go" style={{ background: '#eb5a46' }} onClick={() => decide('Rejected')}>✖ Reject</button>
        </div>
      )}
    </div>
  );
}

function Decisions() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');

  const load = () => {
    const p = new URLSearchParams({ ...(q && { q }), ...(from && { from }) });
    api('/decisions?' + p).then(setList).catch(() => {});
  };
  useEffect(() => { load(); }, [q, from]);

  return (
    <>
      <div className="toolbar">
        <input placeholder="🔍 Search decisions..." value={q} onChange={e => setQ(e.target.value)} />
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
      </div>
      <div className="board">
        {['Proposed', 'Approved', 'Rejected'].map(s => {
          const items = list.filter(d => d.status === s);
          return (
            <div className="list" key={s}>
              <div className="list-title">{s} <span>{items.length}</span></div>
              {items.map(d => <DecisionCard key={d._id} d={d} reload={load} />)}
            </div>
          );
        })}
      </div>
    </>
  );
}

function AddDecision({ onDone }) {
  const [meetings, setMeetings] = useState([]);
  const [f, setF] = useState({ title: '', description: '', rationale: '', alternatives: '', meeting: '', decidedOn: '' });
  const [files, setFiles] = useState([]);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  useEffect(() => { api('/meetings').then(setMeetings).catch(() => {}); }, []);

  const submit = async e => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => v && fd.append(k, v));
    [...files].forEach(x => fd.append('files', x));
    await api('/decisions', { method: 'POST', body: fd });
    onDone();
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>Record a Decision</h3>
      <input placeholder="Title" onChange={set('title')} required />
      <textarea placeholder="Description" onChange={set('description')} />
      <textarea placeholder="Rationale (why was this decided?)" onChange={set('rationale')} />
      <textarea placeholder="Alternatives considered" onChange={set('alternatives')} />
      <div className="row">
        <select onChange={set('meeting')}><option value="">Link to meeting</option>
          {meetings.map(m => <option key={m._id} value={m._id}>{m.title}</option>)}
        </select>
        <input type="date" onChange={set('decidedOn')} />
      </div>
      <input type="file" multiple onChange={e => setFiles(e.target.files)} />
      <button className="go">Save Decision</button>
    </form>
  );
}

function Meetings() {
  const [list, setList] = useState([]);
  const [f, setF] = useState({ title: '', date: '', notes: '' });
  const load = () => api('/meetings').then(setList).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async e => {
    e.preventDefault();
    await api('/meetings', { method: 'POST', body: JSON.stringify(f) });
    setF({ title: '', date: '', notes: '' });
    load();
  };

  return (
    <>
      <form className="card" onSubmit={submit}>
        <h3>New Meeting</h3>
        <input placeholder="Title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required />
        <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} required />
        <textarea placeholder="Meeting notes" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} />
        <button className="go">Add Meeting</button>
      </form>
      {list.map(m => (
        <div className="card" key={m._id}><h3>{m.title}</h3><small>{fmt(m.date)}</small><p>{m.notes}</p></div>
      ))}
    </>
  );
}

function Timeline() {
  const [list, setList] = useState([]);
  useEffect(() => { api('/decisions').then(setList).catch(() => {}); }, []);
  return <div className="line">{list.map(d => <DecisionCard key={d._id} d={d} />)}</div>;
}

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('name'));
  const [tab, setTab] = useState('decisions');
  if (!user) return <Auth onLogin={setUser} />;

  return (
    <div className="wrap">
      <header>
        <h2>Decision Memory</h2>
        <nav>
          {['decisions', 'add', 'meetings', 'timeline'].map(t => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
          <button onClick={() => { localStorage.clear(); setUser(null); }}>Logout ({user})</button>
        </nav>
      </header>
      {tab === 'decisions' && <Decisions />}
      {tab === 'add' && <AddDecision onDone={() => setTab('decisions')} />}
      {tab === 'meetings' && <Meetings />}
      {tab === 'timeline' && <Timeline />}
    </div>
  );
}