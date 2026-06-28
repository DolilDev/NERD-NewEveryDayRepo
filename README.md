# NERD - New Every Day Repo

🔗 **My NERD profile:** [https://newrepoeveryday.vercel.app/profile/DolilDev](https://newrepoeveryday.vercel.app/profile/DolilDev)

A collection of daily quests from the NERD app — one quest per day, each in its own subfolder with a `QUEST.md` file (the brief) and your solution.

| Status | Quest | Description | Stack | Folder |
| :----: | ----- | ----------- | ----- | ------ |
| ⏳ | Personal Finance Tracker App | Create a Personal Finance Tracker App that allows users to manage their income and expenses. | — | [NERD-personal-finance-tracker](./NERD-personal-finance-tracker) |
| ⏳ | Personal Finance Tracker with Data Visualization | Create a personal finance tracker that allows users to input expenses and income, categorize them, and visualize their financial data. | — | [NERD-personal-finance-viz](./NERD-personal-finance-viz) |
| ✅ | Personal Finance Tracker with Budgeting Features | Create a Personal Finance Tracker application that allows users to input their income and expenses, set budgets for categories, and visualize their financial health over time. | Node.js, Python, TypeScript, HTML | [NERD-budgeting-tools](./NERD-budgeting-tools) |
| ✅ | Real-Time Collaborative Markdown Editor | Build a real-time collaborative Markdown editor using TypeScript for the frontend and Python for a lightweight backend. | Node.js, Python, TypeScript, JavaScript | [NERD-realtime-markdown-editor](./NERD-realtime-markdown-editor) |
| ✅ | Event Scheduler API with Notification System | 1. **Set Up the Project**: Initialize a Node. js project and install Express. Create a basic server setup with endpoints for adding, retrieving, updating, and deleting events. | Express, Node.js, JavaScript | [NERD-event-scheduler-api](./NERD-event-scheduler-api) |
| ✅ | Personal Finance Tracker Web App | Build a personal finance tracker web application that allows users to manage their expenses and incomes. | Express, Node.js, TypeScript, HTML, CSS | [NERD-finance-manager](./NERD-finance-manager) |
| ✅ | Personal Finance Tracker | Build a Personal Finance Tracker that consists of a frontend and a backend. Structure it into the following modules: 1. | Python, JavaScript, HTML | [NERD-finance-tracker](./NERD-finance-tracker) |
| ✅ | Zarządzanie zadaniami w trybie offline z synchronizacją z chmurą | Zbuduj aplikację desktopową do zarządzania zadaniami, która będzie działać offline i synchronizować dane z lokalną bazą SQLite. | Electron, Node.js, TypeScript, JavaScript, HTML | [NERD-offline-task-manager](./NERD-offline-task-manager) |
| ✅ | Budowa inteligentnego asystenta do przetwarzania danych z plików CSV | Zbuduj aplikację w Pythonie, która będzie w stanie wczytywać pliki CSV, przetwarzać dane oraz umożliwiać użytkownikowi wykonywanie różnych operacji na tych danych. | Python, HTML | [NERD-csv-data-assistant](./NERD-csv-data-assistant) |

---
_Index generated automatically by NERD whenever a quest is added or passed._
# Personal Finance Tracker

A full-stack personal finance tracking application built with Node.js, Express, and Svelte. Track your income and expenses, categorize transactions, and visualize your spending patterns.

## Tech Stack

- **Backend**: Node.js 18+, Express 4.x
- **Frontend**: Svelte 4.x, Vite 5.x
- **Testing**: Jest 29.x (backend), Playwright (E2E)
- **Authentication**: JWT (jsonwebtoken)
- **Password Security**: bcrypt
- **Storage**: In-memory (no external database)

## Project Structure

```
NERD-personal-finance-tracker/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express server setup
│   │   ├── routes/
│   │   │   ├── transactions.js    # Transaction endpoints
│   │   │   └── auth.js            # Authentication endpoints
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification middleware
│   │   │   └── errorHandler.js    # Centralized error handler
│   │   └── store/
│   │       └── inMemory.js        # In-memory data store
│   ├── tests/
│   │   └── transactions.test.js   # Jest unit tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.svelte             # Main app component
│   │   ├── lib/
│   │   │   ├── TransactionList.svelte
│   │   │   ├── AddTransaction.svelte
│   │   │   ├── Summary.svelte
│   │   │   ├── Dashboard.svelte
│   │   │   └── Chart.svelte
│   │   ├── stores/
│   │   │   └── transactions.js    # Svelte store
│   │   └── api/
│   │       └── client.js          # API client
│   ├── package.json
│   └── vite.config.js
├── README.md
└── package.json                   # Root package.json
```

## Installation & Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Step 1: Install All Dependencies

```bash
cd NERD-personal-finance-tracker
npm run install:all
```

This will install root dependencies and then install dependencies for both backend and frontend.

### Step 2: Create Environment File

Create a `.env` file in the root directory:

```
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
PORT=3001
```

### Step 3: Start Development Servers

Run both backend and frontend concurrently:

```bash
npm run dev
```

- **Backend**: Runs on `http://localhost:3001`
- **Frontend**: Runs on `http://localhost:5173`

The frontend is configured to proxy API requests to the backend.

## API Endpoints

All endpoints return JSON responses. Authentication endpoints are public; transaction endpoints require a valid JWT token in the `Authorization` header.

### Authentication Endpoints

#### Register a New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securePassword123"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-here",
  "username": "john_doe",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Username already exists"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid-here",
  "username": "john_doe",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid username or password"
}
```

### Transaction Endpoints

**Authorization Header Required:** `Authorization: Bearer YOUR_JWT_TOKEN`

#### List All Transactions
```http
GET /api/transactions
Authorization: Bearer YOUR_JWT_TOKEN
```

**Query Parameters:**
- `category` (optional): Filter by category (e.g., `?category=food`)
- `type` (optional): Filter by type: `income` or `expense` (e.g., `?type=expense`)

**Response (200 OK):**
```json
[
  {
    "id": "uuid-1",
    "userId": "user-uuid",
    "type": "expense",
    "amount": 45.50,
    "category": "food",
    "description": "Lunch with team",
    "date": "2026-06-27",
    "createdAt": "2026-06-27T12:30:00Z"
  },
  {
    "id": "uuid-2",
    "userId": "user-uuid",
    "type": "income",
    "amount": 1500,
    "category": "salary",
    "description": "Monthly salary",
    "date": "2026-06-25",
    "createdAt": "2026-06-25T09:00:00Z"
  }
]
```

#### Create a New Transaction
```http
POST /api/transactions
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "type": "expense",
  "amount": 45.50,
  "category": "food",
  "description": "Lunch with team",
  "date": "2026-06-27"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-new",
  "userId": "user-uuid",
  "type": "expense",
  "amount": 45.50,
  "category": "food",
  "description": "Lunch with team",
  "date": "2026-06-27",
  "createdAt": "2026-06-27T12:30:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Amount must be greater than 0"
}
```

#### Get Single Transaction
```http
GET /api/transactions/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200 OK):**
```json
{
  "id": "uuid-1",
  "userId": "user-uuid",
  "type": "expense",
  "amount": 45.50,
  "category": "food",
  "description": "Lunch with team",
  "date": "2026-06-27",
  "createdAt": "2026-06-27T12:30:00Z"
}
```

**Error Response (404 Not Found):**
```json
{
  "error": "Transaction not found"
}
```

#### Update a Transaction
```http
PUT /api/transactions/:id
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "type": "expense",
  "amount": 50.00,
  "category": "food",
  "description": "Lunch with team at new place",
  "date": "2026-06-27"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid-1",
  "userId": "user-uuid",
  "type": "expense",
  "amount": 50.00,
  "category": "food",
  "description": "Lunch with team at new place",
  "date": "2026-06-27",
  "createdAt": "2026-06-27T12:30:00Z"
}
```

#### Delete a Transaction
```http
DELETE /api/transactions/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200 OK):**
```json
{
  "message": "Transaction deleted successfully"
}
```

### Summary Endpoint

#### Get Financial Summary
```http
GET /api/summary
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200 OK):**
```json
{
  "totalIncome": 3000,
  "totalExpenses": 500.50,
  "balance": 2499.50,
  "byCategory": {
    "salary": 3000,
    "food": 200,
    "utilities": 150.50,
    "entertainment": 150
  }
}
```

## Running Tests

### Backend Tests

Run all Jest tests with coverage report:

```bash
npm test
```

Or run tests in watch mode:

```bash
cd backend
npm run test:watch
```

Tests cover:
- User registration and login validation
- Transaction CRUD operations
- Authorization checks
- Input validation
- Error handling

Expected coverage: ≥80%

## Features

- ✅ User registration and login with JWT authentication
- ✅ Create, read, update, and delete transactions
- ✅ Filter transactions by category and type
- ✅ Financial summary with income, expenses, and balance
- ✅ Category-based spending breakdown
- ✅ Responsive Svelte frontend with Vite
- ✅ Real-time transaction list updates
- ✅ Visual charts for spending analysis
- ✅ Clean, modern UI with CSS

## Architecture Notes

### Backend
- Express.js middleware pipeline for auth, validation, and error handling
- In-memory store using JavaScript arrays (data persists only during server runtime)
- Centralized error handling with descriptive HTTP status codes
- Input validation on all POST/PUT endpoints
- Password hashing with bcrypt (10 salt rounds)

### Frontend
- Svelte stores for reactive state management
- API client wrapper for consistent request handling
- JWT token stored in memory (not localStorage) for security
- Responsive design with mobile-first CSS
- Real-time updates using Svelte reactivity

## Development Workflow

```bash
# Terminal 1: Run everything concurrently
npm run dev

# Terminal 2 (if needed): Run tests separately
npm test

# Frontend build (production)
npm run build
```

## Environment Variables

Create a `.env` file in the root:

```
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=3001
```

## Security Notes

- All passwords are hashed with bcrypt before storage
- JWT tokens are used for stateless authentication
- CORS is enabled for `http://localhost:5173` in development
- Sensitive endpoints require valid JWT token
- Input validation prevents common attacks

## Future Enhancements

- [ ] Persistent database (MongoDB, PostgreSQL)
- [ ] Budget limits and alerts
- [ ] Recurring transactions
- [ ] Advanced filtering and export to CSV
- [ ] Multi-currency support
- [ ] Transaction tags and notes
- [ ] Email notifications
