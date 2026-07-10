# FINORA — Personal Finance Tracker

[![Live Demo](https://img.shields.io/badge/Live-Demo-00C853?style=for-the-badge&logo=vercel&logoColor=white)](https://finora-two-theta.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/GoodBoy20/Finora)

A full-stack personal finance management application built with the MERN stack. Features JWT + Security Key (2FA) authentication, transaction tracking, budgets, reports, recurring transactions, and automation rules.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Recharts, React Router v6
- **Backend**: Node.js, Express.js, REST API
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT + 2FA Security Key (bcryptjs, crypto)

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

### 1. Clone and Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

Edit `server/.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/finora
JWT_SECRET=your_secure_jwt_secret_here
CLIENT_URL=http://localhost:5173
```

### 3. Start MongoDB
```bash
mongod
```

### 4. Run the App

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

Visit **http://localhost:5173**

### 5. Default Categories

Default categories (Food, Transport, Housing, etc.) are seeded automatically on first run.

## Features

- **2FA Security Key** — Generated at registration, required for every login
- **Dashboard** — Summary cards, income/expense charts, budget progress
- **Transactions** — CRUD, filters, pagination, CSV import
- **Accounts** — Bank/wallet/cash accounts with transfer support
- **Budgets** — Spending limits with progress bars and overspent alerts
- **Reports** — Bar, pie, and line charts with date range selector
- **Recurring** — Automated transactions (daily/weekly/monthly/yearly)
- **Automation** — IF-THEN rules for auto-tagging and categorization
- **Settings** — Profile, password change, category management, data export

## Security

- Passwords hashed with bcryptjs (12 rounds)
- Security keys hashed the same way — never stored in plaintext
- JWT tokens expire in 7 days
- All API routes (except register/login) require valid JWT
- Login errors never reveal which field failed

## Running Tests

The test suite uses **Jest**, **Supertest**, and **mongodb-memory-server** to test all critical backend modules against an in-memory MongoDB instance — no real database required.

### Install test dependencies

```bash
cd server && npm install
```

### Run all tests

```bash
npm test
```

### Run with coverage report

```bash
npm run test:coverage
```

### Run a specific test file

```bash
npx jest tests/auth.test.js
npx jest tests/transactions.test.js
npx jest tests/accounts.test.js
npx jest tests/budgets.test.js
npx jest tests/balanceProtection.test.js
npx jest tests/csvImport.test.js
npx jest tests/csvExport.test.js
```

### Run a specific test by name

```bash
npx jest --testNamePattern="should block transaction"
```

### Test Coverage Targets

| Module                       | Target |
|------------------------------|--------|
| Auth controller              | > 90%  |
| Transaction controller       | > 85%  |
| Account controller           | > 80%  |
| Balance protection controller| > 85%  |
| Import/Export logic          | > 80%  |

> **Note:** The first test run downloads the MongoDB binary (~509MB). Subsequent runs use the cached binary and are much faster.
