# Decision Memory Platform

A web app that records decisions made in meetings, together with the reasoning
and alternatives behind them, so a team can later find out what was decided,
why, and by whom.

It runs fully offline on a single machine. No hosted services, accounts or API keys.

## Tech stack
- **Frontend:** React (Vite)
- **Backend:** Node.js, Express
- **Database:** MongoDB (local, run from inside the project)
- **Auth:** JWT with two roles (member, approver)

## Requirements
- Node.js 18 or newer
- VS Code (or any terminal)
- Internet is needed only once, on the first run, to download the local MongoDB binary

## How to run (in VS Code)
1. Open the `Decision-memory` folder in VS Code and open a terminal.
2. Install dependencies (first time only):
   ```
   npm install
   npm --prefix server install
   npm --prefix client install
   ```
3. Start the database, server and client together:
   ```
   npm run dev
   ```
   Wait until the terminal shows `Local MongoDB running...` and Vite's local address.
4. In a second terminal, load the demo data (first time, or to reset it):
   ```
   npm run seed
   ```
5. Open **http://localhost:5173** in a browser.

To stop everything, press `Ctrl+C` in the terminal.

## Demo logins
Password for both: `123456`

| User | Email | Role |
|---|---|---|
| Ant | ant@demo.com | Member: can propose, edit own proposals, comment |
| Riya | riya@demo.com | Approver: can also approve or reject (never their own) |

Tip: use one normal window and one private window to try both roles at once.

## Features
- Register and login (JWT), member and approver roles
- Meetings, with a detail view of each meeting's decisions
- Decision recording with rationale, alternatives and file attachments
- Board view (Proposed / Approved / Rejected) and timeline
- Approval workflow (approvers only, no self-approval)
- Edit and delete your own proposals while they are still Proposed
- Comments and in-app notifications
- Search, meeting filter, date range and CSV export
- Analytics dashboard (status, month, team activity)
- Activity feed and reminders for decisions awaiting review
- Similar past decisions and auto-generated summaries
- Keyword Q&A, for example "Who approved the Instagram decision?"
- Knowledge graph linking meetings, decisions and people

## Project structure
```
Decision-memory/
├── client/          React app (Vite)
│   └── src/App.jsx, App.css
├── server/
│   ├── models/      Mongoose models
│   ├── routes/      auth, decisions, meetings, comments,
│   │                notifications, analytics, activity, ask, graph
│   ├── middleware/  JWT auth
│   ├── localdb.js   starts the local MongoDB
│   ├── seed.js      demo data
│   └── uploads/     attached files
└── package.json     root scripts (dev, seed)
```

## Notes
- "Similar decisions", summaries and Q&A use keyword matching and templates.
  They are not an AI model, which is why they work offline.
- Database files are stored in `server/data` and uploads in `server/uploads`.
- `npm run seed` resets the demo meetings, decisions and comments.
- Settings live in `server/.env` (port, database address, JWT secret).

## Troubleshooting
| Problem | Fix |
|---|---|
| `concurrently` or `wait-on` not recognized | Run `npm install` in the root folder |
| Port 27017 already in use | Close any other MongoDB that is running |
| Login fails after reseeding | Log out and log in again |
| Blank page | Press F12, open Console, and check the error |

## Roadmap
AI summarisation, speech-to-text for meetings, a conversational assistant,
email notifications and multi-level approval.