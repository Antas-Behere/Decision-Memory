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

const myId = () => {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1])).id; } catch { return null; }
};

const myRole = () => {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1])).role || 'member'; } catch { return 'member'; }
};

const summarize = d => {
  const verb = d.status === 'Approved' ? 'approved' : d.status === 'Rejected' ? 'rejected' : 'proposed';
  const parts = [
    `On ${fmt(d.decidedOn)}${d.meeting ? `, in the "${d.meeting.title}" meeting,` : ''} the team ${verb}: "${d.title}".`
  ];
  if (d.rationale) parts.push(`Reason: ${d.rationale.replace(/\.$/, '')}.`);
  if (d.alternatives) parts.push(`Alternatives considered: ${d.alternatives.replace(/\.$/, '')}.`);
  parts.push(d.status === 'Proposed' ? 'Awaiting review.' : `${d.status} by ${d.approvedBy || 'a reviewer'}.`);
  return parts.join(' ');
};

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

function Comments({ id }) {
  const [list, setList] = useState([]);
  const [text, setText] = useState('');
  const load = () => api('/comments/' + id).then(setList).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    try { await api('/comments/' + id, { method: 'POST', body: JSON.stringify({ text }) }); setText(''); load(); }
    catch (x) { alert(x.message); }
  };

  return (
    <div style={{ marginTop: 8 }}>
      {list.map(c => <p key={c._id}><b>{c.author?.name}:</b> {c.text} <small>{fmt(c.createdAt)}</small></p>)}
      <form className="row" onSubmit={add}>
        <input placeholder="Add a comment..." value={text} onChange={e => setText(e.target.value)} />
        <button className="go">Post</button>
      </form>
    </div>
  );
}

function Similar({ id }) {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    api(`/decisions/${id}/similar`).then(setList).catch(() => setList([]));
  }, [id]);
  if (!list) return <small>Searching...</small>;
  if (!list.length) return <small>No similar past decisions found.</small>;
  return (
    <div style={{ marginTop: 6 }}>
      {list.map(s => (
        <p key={s._id}>🔗 <b>{s.title}</b> <span className="badge">{s.status}</span><br />
          <small>{fmt(s.decidedOn)} • matches: {s.shared.join(', ')}</small></p>
      ))}
    </div>
  );
}

function DecisionCard({ d, reload }) {
  const [showC, setShowC] = useState(false);
  const [showS, setShowS] = useState(false);
  const [showSum, setShowSum] = useState(false);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ title: d.title, description: d.description || '', rationale: d.rationale || '', alternatives: d.alternatives || '' });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const mine = reload && d.status === 'Proposed' && d.createdBy?._id === myId();
  

  const decide = async status => {
    try { await api(`/decisions/${d._id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); reload(); }
    catch (e) { alert(e.message); }
  };
  const save = async () => {
    try { await api(`/decisions/${d._id}`, { method: 'PUT', body: JSON.stringify(f) }); setEdit(false); reload(); }
    catch (e) { alert(e.message); }
  };
  const remove = async () => {
    if (!confirm('Delete this decision?')) return;
    try { await api(`/decisions/${d._id}`, { method: 'DELETE' }); reload(); }
    catch (e) { alert(e.message); }
  };

  if (edit) return (
    <div className="card">
      <input value={f.title} onChange={set('title')} />
      <textarea value={f.description} onChange={set('description')} placeholder="Description" />
      <textarea value={f.rationale} onChange={set('rationale')} placeholder="Rationale" />
      <textarea value={f.alternatives} onChange={set('alternatives')} placeholder="Alternatives" />
      <div className="row">
        <button className="go" onClick={save}>Save</button>
        <button className="go" style={{ background: '#6b778c' }} onClick={() => setEdit(false)}>Cancel</button>
      </div>
    </div>
  );

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
      {d.status === 'Proposed' && reload && myRole() === 'approver' && (
        <div className="row">
          <button className="go" onClick={() => decide('Approved')}>✔ Approve</button>
          <button className="go" style={{ background: '#eb5a46' }} onClick={() => decide('Rejected')}>✖ Reject</button>
        </div>
      )}
      {mine && (
        <div className="row">
          <button className="go" style={{ background: '#6b778c' }} onClick={() => setEdit(true)}>✎ Edit</button>
          <button className="go" style={{ background: '#6b778c' }} onClick={remove}>🗑 Delete</button>
        </div>
      )}
       <small style={{ cursor: 'pointer', color: '#0079bf' }} onClick={() => setShowC(!showC)}>💬 {showC ? 'Hide comments' : 'Comments'}</small>
      {showC && <Comments id={d._id} />}
      <small style={{ cursor: 'pointer', color: '#0079bf', display: 'block', marginTop: 4 }} onClick={() => setShowS(!showS)}>🔗 {showS ? 'Hide similar' : 'Similar past decisions'}</small>
{showS && <Similar id={d._id} />}
<small style={{ cursor: 'pointer', color: '#0079bf', display: 'block', marginTop: 4 }} onClick={() => setShowSum(!showSum)}>📝 {showSum ? 'Hide summary' : 'Summarize'}</small>
{showSum && <p style={{ background: '#eef6fc', padding: 8, borderRadius: 6 }}>{summarize(d)}</p>}
    </div>
  );
}

function Decisions() {
  const [list, setList] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [meeting, setMeeting] = useState('');

  const load = () => {
    const p = new URLSearchParams({
      ...(q && { q }), ...(from && { from }), ...(to && { to }), ...(meeting && { meeting })
    });
    api('/decisions?' + p).then(setList).catch(() => {});
  };
  useEffect(() => { load(); }, [q, from, to, meeting]);
  useEffect(() => { api('/meetings').then(setMeetings).catch(() => {}); }, []);

  const exportCsv = () => {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Title', 'Status', 'Date', 'Meeting', 'Recorded by', 'Approved by', 'Rationale', 'Alternatives'],
      ...list.map(d => [d.title, d.status, fmt(d.decidedOn), d.meeting?.title, d.createdBy?.name, d.approvedBy, d.rationale, d.alternatives])
    ];
    const blob = new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'decisions.csv';
    a.click();
  };

  return (
    <>
      <div className="toolbar">
        <input placeholder="🔍 Search decisions..." value={q} onChange={e => setQ(e.target.value)} />
        <select value={meeting} onChange={e => setMeeting(e.target.value)}
          style={{ width: 200, margin: 0, background: 'rgba(255,255,255,.9)' }}>
          <option value="">All meetings</option>
          {meetings.map(m => <option key={m._id} value={m._id}>{m.title}</option>)}
        </select>
        <input type="date" title="From" value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" title="To" value={to} onChange={e => setTo(e.target.value)} />
        <button className="go" style={{ margin: 0 }} onClick={exportCsv}>⬇ CSV</button>
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

function MeetingDetail({ m, onBack }) {
  const [list, setList] = useState([]);
  const load = () => api('/decisions?meeting=' + m._id).then(setList).catch(() => {});
  useEffect(() => { load(); }, [m._id]);

  return (
    <div>
      <button onClick={onBack}>← Back to meetings</button>
      <div className="card">
        <h3>{m.title}</h3>
        <small>{fmt(m.date)} • {list.length} decisions</small>
        {m.notes && <p>{m.notes}</p>}
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
    </div>
  );
}

function Meetings() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(null);
  const [f, setF] = useState({ title: '', date: '', notes: '' });
  const load = () => api('/meetings').then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  if (open) return <MeetingDetail m={open} onBack={() => setOpen(null)} />;
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
        <div className="card" key={m._id} style={{ cursor: 'pointer' }} onClick={() => setOpen(m)}><h3>{m.title}</h3><small>{fmt(m.date)}</small><p>{m.notes}</p></div>
      ))}
    </>
  );
}

function Timeline() {
  const [list, setList] = useState([]);
  useEffect(() => { api('/decisions').then(setList).catch(() => {}); }, []);
  return <div className="line">{list.map(d => <DecisionCard key={d._id} d={d} />)}</div>;
}

function Bell() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const load = () => api('/notifications').then(setList).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  const unread = list.filter(n => !n.read).length;

  const toggle = async () => {
    if (!open) { setOpen(true); await api('/notifications/read', { method: 'PATCH' }).catch(() => {}); }
    else { setOpen(false); load(); }
  };

  return (
    <span style={{ position: 'relative' }}>
      <button onClick={toggle}>🔔{unread > 0 && ` ${unread}`}</button>
      {open && (
        <div className="card" style={{ position: 'absolute', right: 0, top: 44, width: 320, zIndex: 10, maxHeight: 360, overflowY: 'auto', color: '#172b4d' }}>
          {list.length === 0 && <small>No notifications</small>}
          {list.map(n => (
            <p key={n._id} style={{ margin: '8px 0', fontWeight: n.read ? 400 : 700 }}>
              {n.text}<br /><small>{fmt(n.createdAt)}</small>
            </p>
          ))}
        </div>
      )}
    </span>
  );
}

function Bar({ label, n, max, color }) {
  return (
    <div style={{ margin: '8px 0' }}>
      <small>{label}: {n}</small>
      <div style={{ background: '#dfe1e6', borderRadius: 4, height: 14 }}>
        <div style={{ width: `${(n / max) * 100}%`, background: color, height: 14, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function Analytics() {
  const [a, setA] = useState(null);
  useEffect(() => { api('/analytics').then(setA).catch(() => {}); }, []);
  if (!a) return <p style={{ color: '#fff' }}>Loading...</p>;

  const colors = { Proposed: '#f2d600', Approved: '#61bd4f', Rejected: '#eb5a46' };
  const maxS = Math.max(1, ...a.byStatus.map(x => x.n));
  const maxM = Math.max(1, ...a.byMonth.map(x => x.n));
  const maxU = Math.max(1, ...a.byUser.map(x => x.n));
  const tiles = [['Decisions', a.total], ['Meetings', a.meetings], ['Users', a.users], ['Comments', a.comments]];

  return (
    <div>
      <div className="row">
        {tiles.map(([l, v]) => (
          <div className="card" key={l} style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: 28, margin: 0 }}>{v}</h3><small>{l}</small>
          </div>
        ))}
      </div>
      <div className="row">
        <div className="card">
          <h3>By status</h3>
          {a.byStatus.map(x => <Bar key={x._id} label={x._id} n={x.n} max={maxS} color={colors[x._id]} />)}
        </div>
        <div className="card">
          <h3>By month</h3>
          {a.byMonth.map(x => <Bar key={x._id} label={x._id} n={x.n} max={maxM} color="#0079bf" />)}
        </div>
        <div className="card">
          <h3>Team activity</h3>
          {a.byUser.map(x => <Bar key={x._id} label={x.name || 'Unknown'} n={x.n} max={maxU} color="#8b5fbf" />)}
        </div>
      </div>
    </div>
  );
}

function Activity() {
  const [a, setA] = useState(null);
  useEffect(() => { api('/activity').then(setA).catch(() => {}); }, []);
  if (!a) return <p style={{ color: '#fff' }}>Loading...</p>;

  return (
    <div className="row">
      <div className="card">
        <h3>⏰ Reminders</h3>
        {!a.pending.length && <small>Nothing waiting for review.</small>}
        {a.pending.map(p => (
          <p key={p._id}><b>{p.title}</b><br />
            <small>Awaiting review for {p.days} days</small></p>
        ))}
      </div>
      <div className="card">
        <h3>Recent activity</h3>
        {!a.feed.length && <small>No activity yet.</small>}
        {a.feed.map((x, i) => (
          <p key={i}>{x.text}<br />
            <small>{new Date(x.when).toLocaleString()}</small></p>
        ))}
      </div>
    </div>
  );
}

function Ask() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const go = async () => {
    if (!q.trim()) return;
    try {
      setRes(await api('/ask', { method: 'POST', body: JSON.stringify({ question: q }) }));
    } catch (e) { alert(e.message); }
  };
  return (
    <div>
      <div className="toolbar">
        <input placeholder="Ask: Who approved the Instagram decision?" value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
        <button className="go" style={{ margin: 0 }} onClick={go}>Ask</button>
      </div>
      {res && !res.results.length && <div className="card"><small>No matching decisions found. Try different keywords.</small></div>}
      {res && res.results.map(r => (
        <div className="card" key={r._id}>
          <b>{r.title}</b> <span className="badge">{r.status}</span><br />
          <p style={{ margin: '6px 0' }}>{r.answer}</p>
          <small>{fmt(r.decidedOn)}{r.meeting ? ' • ' + r.meeting : ''} • matched: {r.shared.join(', ')}</small>
        </div>
      ))}
    </div>
  );
}

function Graph() {
  const [g, setG] = useState(null);
  const [sel, setSel] = useState(null);
  useEffect(() => { api('/graph').then(setG).catch(() => {}); }, []);
  if (!g) return <p style={{ color: '#fff' }}>Loading...</p>;

  const H = Math.max(g.meetings.length, g.decisions.length, g.users.length, 2) * 56 + 60;
  const place = (arr, x) => {
    const out = {};
    arr.forEach((n, i) => {
      out[n._id] = { x, y: 60 + (arr.length > 1 ? (i * (H - 100)) / (arr.length - 1) : 0) };
    });
    return out;
  };
  const M = place(g.meetings, 40), D = place(g.decisions, 400), U = place(g.users, 760);
  const W = 240;

  const edges = [];
  g.decisions.forEach(d => {
    if (d.meeting && M[d.meeting]) edges.push({ a: d.meeting, b: d._id, x1: M[d.meeting].x + W, y1: M[d.meeting].y, x2: D[d._id].x, y2: D[d._id].y });
    if (d.createdBy && U[d.createdBy]) edges.push({ a: d._id, b: d.createdBy, x1: D[d._id].x + W, y1: D[d._id].y, x2: U[d.createdBy].x, y2: U[d.createdBy].y });
  });

  const on = new Set();
  if (sel) {
    on.add(sel);
    edges.forEach(e => { if (e.a === sel || e.b === sel) { on.add(e.a); on.add(e.b); } });
  }

  const colors = { Proposed: '#f2d600', Approved: '#61bd4f', Rejected: '#eb5a46' };
  const cut = s => (s.length > 30 ? s.slice(0, 29) + '…' : s);
  const node = (n, p, label, fill) => (
    <g key={n._id} transform={`translate(${p.x},${p.y - 17})`} style={{ cursor: 'pointer' }}
       opacity={!sel || on.has(n._id) ? 1 : 0.25}
       onClick={() => setSel(sel === n._id ? null : n._id)}>
      <rect width={W} height="34" rx="8" fill={fill} stroke={sel === n._id ? '#172b4d' : 'none'} strokeWidth="3" />
      <text x="12" y="22" fontSize="13" fill="#172b4d">{cut(label)}</text>
    </g>
  );

  return (
    <div className="card">
      <h3>Knowledge graph</h3>
      <small>Click any node to see what it connects to. Click it again to clear.</small>
      <svg viewBox={`0 0 1040 ${H}`} style={{ width: '100%', marginTop: 8 }}>
        <text x="40" y="24" fontSize="14" fontWeight="700" fill="#5e6c84">MEETINGS</text>
        <text x="400" y="24" fontSize="14" fontWeight="700" fill="#5e6c84">DECISIONS</text>
        <text x="760" y="24" fontSize="14" fontWeight="700" fill="#5e6c84">PEOPLE</text>
        {edges.map((e, i) => {
          const mid = (e.x1 + e.x2) / 2;
          const active = !sel || e.a === sel || e.b === sel;
          return <path key={i} d={`M${e.x1},${e.y1} C${mid},${e.y1} ${mid},${e.y2} ${e.x2},${e.y2}`}
            fill="none" stroke="#7a869a" strokeWidth={sel && active ? 2.5 : 1.5} opacity={active ? 0.8 : 0.1} />;
        })}
        {g.meetings.map(m => node(m, M[m._id], m.title, '#c7e1f5'))}
        {g.decisions.map(d => node(d, D[d._id], d.title, colors[d.status] || '#dfe1e6'))}
        {g.users.map(u => node(u, U[u._id], `${u.name} (${u.role || 'member'})`, '#e4d6f5'))}
      </svg>
      <small>Decision colour: yellow = Proposed, green = Approved, red = Rejected</small>
    </div>
  );
}

function Stats({ refresh }) {
  const [a, setA] = useState(null);
  useEffect(() => { api('/analytics').then(setA).catch(() => {}); }, [refresh]);
  if (!a) return null;
  const n = s => a.byStatus.find(x => x._id === s)?.n || 0;
  const items = [[a.total, 'Decisions'], [n('Approved'), 'Approved'], [n('Proposed'), 'Awaiting review'], [a.meetings, 'Meetings']];
  return (
    <div className="stats">
      {items.map(([v, l]) => <div className="stat" key={l}><b>{v}</b><small>{l}</small></div>)}
    </div>
  );
}

const ICONS = { decisions: '📋', add: '➕', meetings: '📅', timeline: '🕒', analytics: '📊', activity: '⏰', ask: '💬', graph: '🕸️' };

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('name'));
  const [tab, setTab] = useState('decisions');
  if (!user) return <Auth onLogin={setUser} />;

  return (
    <div className="wrap">
      <header>
        <span className="eyebrow">DECISION MEMORY PLATFORM</span>
        <h2>Decision Memory<span>.</span></h2>
        <p className="tagline">Record every decision with the reasoning behind it. Find it, trust it, build on it.</p>
        <Stats refresh={tab} />
        <nav>
          {['decisions', 'add', 'meetings', 'timeline', 'analytics', 'activity', 'ask', 'graph'].map(t => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{ICONS[t]} {t}</button>
          ))}
          <Bell />
          <button onClick={() => { localStorage.clear(); setUser(null); }}>Logout ({user} · {myRole()})</button>
        </nav>
      </header>
      {tab === 'decisions' && <Decisions />}
      {tab === 'add' && <AddDecision onDone={() => setTab('decisions')} />}
      {tab === 'meetings' && <Meetings />}
      {tab === 'timeline' && <Timeline />}
      {tab === 'analytics' && <Analytics />}
      {tab === 'activity' && <Activity />}
      {tab === 'ask' && <Ask />}
      {tab === 'graph' && <Graph />}
    </div>
  );
}