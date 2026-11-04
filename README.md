# MoneyFlow - Financial & Split Tracking PWA

**MoneyFlow** is a Progressive Web App (PWA) built with **MUI (Material-UI)**, **React**, **Node.js/Express**, and **MongoDB Atlas** for tracking personal finances, loans, group expenses, and automatic multi-member splits.

---

## Architecture & Project Structure

As requested, the project is structured with completely separated folders for frontend and backend:

```
moneyFlow/
├── backend/                   # Node.js + Express Backend
│   ├── config/                # MongoDB Atlas connection
│   ├── controllers/           # Member, Entry & Dashboard controllers
│   ├── models/                # Mongoose models (Member, Entry)
│   ├── routes/                # API routes (/api/members, /api/entries, /api/dashboard)
│   ├── utils/                 # Resend Email Integration (sendInviteEmail)
│   ├── .env                   # MongoDB URI & Resend API Key
│   └── server.js              # Express API Server (Port 5050)
│
├── frontend/                  # React + MUI + PWA (Vite)
│   ├── public/                # PWA icons & manifest
│   ├── src/
│   │   ├── components/        # Navigation Sidebar, OnlineDetector banner
│   │   ├── pages/             # Dashboard, Entries, Members views
│   │   ├── modals/            # Add Entry, Filter, Invite Member, Edit, Delete Confirm
│   │   ├── services/          # API client for backend
│   │   ├── theme.js           # Custom MUI theme
│   │   └── App.jsx            # Main app shell
│   ├── vite.config.js         # Vite + PWA plugin + proxy
│   └── package.json
│
└── package.json               # Root scripts to start both apps
```

---

## Wireframe Features Implemented

### 1. Online-Only PWA Enforcer
- Runs as an installable PWA (manifest, service workers, standalone view).
- Features a real-time `OnlineDetector` banner that alerts when internet connection is lost, blocking offline modifications to guarantee MongoDB sync integrity.

### 2. Dashboard View (`Dashboard Active`)
- **Total Balance**: Real-time net balance in ₹.
- **Total Expenses**: Sum of all expenses in ₹.
- **Total Loans**: Sum of all loans in ₹.
- **Total Received**: Sum of all incoming funds in ₹.
- Group Split obligation overview card.

### 3. Entries View (`Entries Active`)
- **Entries Data Table**: Multi-select checkboxes, Member, Date, Time, Type, Status, Amount.
- **Filter Modal**: Filter by status, date range, amount range, and name search.
- **Add Entries Modal with Auto-Split**:
  - Multi-select input dynamically loaded from the Members database + custom names.
  - **Special Business Logic**: When more than 1 member is selected, it calculates the split amount per person, generates separate records in MongoDB for each member, and sets your status to **`Expense`**.
- **Bulk Actions**: Bulk change status and bulk delete entries.

### 4. Members View (`Members Active`)
- **Members Data Table**: Checkbox, Full Name, Phone Number, Join Date, Invite Status, Row Actions.
- **Invite Members Modal**: Full Name, Phone, Email, Username, Password, and checkbox *"Send app invite link directly to e-mail via Resend"*.
- **Edit Member Modal**: Edit existing member details.
- **Delete Confirmation Modal**: Safeguard to confirm deletion before removing.
- **Bulk Actions**: Bulk delete and bulk send invite links.

---

## Running the Application

### Option A: From Root
```bash
# Terminal 1: Start Backend (Port 5050)
npm run dev:backend

# Terminal 2: Start Frontend (Port 3000)
npm run dev:frontend
```

### Option B: From Individual Folders
```bash
# Backend:
cd backend
node server.js

# Frontend:
cd frontend
npm run dev
```

Open your browser at: **`http://localhost:3000`**
