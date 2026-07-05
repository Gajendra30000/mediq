# MediQueue 🏥

> Smart hospital appointment & queue management system — built on MERN stack with Socket.io real-time updates, JWT auth, and Claude AI integration.

## Portals

| Portal | Role | Access |
|--------|------|--------|
| Patient portal | Book appointments, track live queue, view prescriptions | `/home` |
| Doctor dashboard | Manage queue, write prescriptions, view patient history | `/doctor` |
| Hospital admin | Staff, analytics, department load | `/hospital` |
| Reception desk | Walk-ins, check-ins, queue control | `/reception` |

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6 |
| Backend | Node.js, Express 4 |
| Database | MongoDB + Mongoose |
| Real-time | Socket.io (WebSockets) |
| Auth | JWT + bcryptjs |
| AI | Anthropic Claude API |
| QR codes | qrcode (server), qrcode.react (client) |

## Quick start

### Prerequisites
- Node.js 18+
- MongoDB running locally or MongoDB Atlas URI
- Anthropic API key (for AI features)

### 1. Clone & install

```bash
git clone <repo-url>
cd mediqueue
npm run install-all
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mediqueue
JWT_SECRET=your_strong_secret_here
CLIENT_URL=http://localhost:3000
OPENROUTER_API_KEY=your_openrouter_key_here
JWT_EXPIRES=7d
NODE_ENV=development
```

For Render production:

```env
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_strong_production_secret
JWT_EXPIRES=7d
CLIENT_URL=https://your-frontend.onrender.com
OPENROUTER_API_KEY=your_openrouter_key_here
NODE_ENV=production
```

For the client on Render, set these in the Static Site environment variables:

```env
REACT_APP_API_URL=https://mediqserver.onrender.com/api
REACT_APP_SERVER_URL=https://mediqserver.onrender.com
```

### 3. Seed demo data

```bash
cd server
npm run seed
```

This creates:
- **Admin**: `admin@wockhardt.com` / `Admin@123`
- **Doctor**: `rajiv@wockhardt.com` / `Doctor@123`
- **Reception**: `reception@wockhardt.com` / `Reception@123`
- **Patient**: `patient@mediqueue.com` / `Patient@123`

### 4. Run development servers

```bash
# From root directory — starts both client & server
npm run dev
```

- **Client**: http://localhost:3000
- **Server API**: http://localhost:5000/api

---

## Features

### Patient
- AI symptom → specialty suggester (Claude-powered)
- Browse hospitals by city, rating, specialty
- View doctor profiles with qualifications, fees, ratings
- AI-generated review summaries per doctor
- Book time-slot appointments
- QR code check-in (scan at hospital or self-kiosk)
- Live queue position + smart ETA (auto-adjusts for delays)
- Real-time delay alerts via Socket.io
- Medical history & prescription downloads
- Post-visit reviews (locked to completed appointments)

### Doctor
- Today's queue overview with live stats
- Call next / call specific / skip / mark done
- Send delay alerts to all waiting patients (notifies in real-time)
- Prescription editor with drug interaction checker (Claude AI)
- Full patient history across visits
- Weekly schedule management (days, time slots, durations, breaks)
- Toggle today's availability

### Hospital admin
- Live department load heatmap
- AI operational insights (Claude-powered)
- Staff management with per-doctor availability toggle
- 7/14/30-day analytics with charts
- Doctor roster with ratings

### Reception desk
- Walk-in token issuance with QR code printout
- Manual check-in for upcoming appointments
- Live queue view per doctor
- Call next / call specific token

---

## API reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user |
| PATCH | `/api/auth/me` | JWT | Update profile |

### Hospitals
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/hospitals` | — | Search hospitals |
| GET | `/api/hospitals/:id` | — | Hospital detail |
| GET | `/api/hospitals/:id/doctors` | — | Doctors at hospital |
| GET | `/api/hospitals/:id/stats` | JWT | Today's stats |

### Appointments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/appointments` | JWT | Patient's appointments |
| GET | `/api/appointments/available-slots` | — | Available time slots |
| POST | `/api/appointments` | JWT (patient) | Book appointment |
| POST | `/api/appointments/walkin` | JWT (reception) | Walk-in token |
| POST | `/api/appointments/checkin/:qrToken` | — | QR check-in |
| PATCH | `/api/appointments/:id/cancel` | JWT | Cancel |

### Queue
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/queue/today/:doctorId` | JWT | Today's full queue |
| PATCH | `/api/queue/call-next` | JWT | Call next patient |
| PATCH | `/api/queue/call/:id` | JWT | Call specific |
| PATCH | `/api/queue/complete` | JWT | Done / skip / no-show |
| PATCH | `/api/queue/delay` | JWT | Send delay alert |

### AI
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/suggest-specialty` | — | Symptom → specialty |
| POST | `/api/ai/drug-interactions` | JWT | Check drug interactions |
| POST | `/api/ai/summarize-reviews` | — | AI review summary |
| POST | `/api/ai/admin-insight` | JWT | Operational AI insight |

## Socket.io events

| Event | Direction | Description |
|-------|-----------|-------------|
| `subscribe:patient` | Client → Server | Patient joins personal room |
| `subscribe:doctor` | Client → Server | Doctor joins queue room |
| `subscribe:hospital` | Client → Server | Admin/reception joins hospital room |
| `queue:update` | Server → Client | Full queue state broadcast |
| `queue:position_update` | Server → Patient | Patient's position & ETA |
| `queue:called` | Server → Patient | Patient called to room |
| `queue:delay` | Server → Patient | Doctor running late |
| `appointment:new` | Server → Hospital | New booking notification |

## Production deployment

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<strong-random-64-char>
CLIENT_URL=https://your-domain.com
OPENROUTER_API_KEY=your_openrouter_key_here
```

```bash
npm run build        # builds React app
# serve client/build with Express static or CDN
```

Add to `server/index.js` for production:
```js
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));
```
