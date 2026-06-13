# Sammy's Restaurant ERP — Deployment Guide

## System Architecture

```
sammy/
├── backend/         → Node.js + Express API (port 5000)
├── frontend/        → React Staff Dashboard (port 5173)
└── online-store/    → Customer Ordering Site (port 5174)
```

---

## Prerequisites

- Node.js v18+
- PostgreSQL 14+
- npm / yarn

---

## 1. Database Setup

### Install PostgreSQL
Create a database named `sammy_erp`:
```sql
CREATE DATABASE sammy_erp;
```

### Update .env
Edit `backend/.env` with your PostgreSQL credentials:
```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/sammy_erp?schema=public"
```

---

## 2. Install Dependencies

From the root `sammy/` folder:
```bash
npm run install:all
```

Or manually:
```bash
cd backend && npm install
cd ../frontend && npm install
cd ../online-store && npm install
```

---

## 3. Initialize Database

```bash
# Generate Prisma client + push schema
npm run db:push

# Seed all staff, menu, tables, and system data
npm run db:seed
```

---

## 4. Start All Services

### Development (all 3 at once):
```bash
npm run dev
```

### Individually:
```bash
npm run backend    # API at http://localhost:5000
npm run frontend   # Staff Dashboard at http://localhost:5173
npm run store      # Online Store at http://localhost:5174
```

---

## 5. Default Credentials

### Staff Dashboard (http://localhost:5173)

#### Email Login
| Name | Email | Password | Role |
|------|-------|----------|------|
| Mory Kaba | mory@sammy.rw | Admin@1234 | Admin |
| Nestor | nestor@sammy.rw | Admin@1234 | Admin |
| Christian | christian@sammy.rw | Manager@1234 | Manager |
| Safi | safi.cashier@sammy.rw | Cashier@1234 | Cashier |
| Patrick | patrick.cashier@sammy.rw | Cashier@1234 | Cashier |

#### PIN Login (4-digit PIN pad)
| Name | PIN | Role |
|------|-----|------|
| Clever (Head Chef) | 5678 | Kitchen |
| Umunu | 5678 | Kitchen |
| Umun | 5678 | Kitchen |
| Safi | 9012 | Bar |
| Patrick | 9012 | Bar |
| Yvone | 1234 | Waiter |
| Denise | 1234 | Waiter |
| Ladouce | 1234 | Waiter |
| Poullet | 1234 | Waiter |

---

## 6. Application URLs

| Service | URL | Description |
|---------|-----|-------------|
| Backend API | http://localhost:5000 | REST API + Socket.io |
| Staff Dashboard | http://localhost:5173 | ERP/POS interface |
| Online Store | http://localhost:5174 | Customer ordering site |
| Prisma Studio | http://localhost:5555 | Database viewer |
| API Health | http://localhost:5000/health | Health check |

---

## 7. Production Deployment

### Backend (PM2)
```bash
npm install -g pm2
cd backend
pm2 start src/server.js --name sammy-api
pm2 save
pm2 startup
```

### Frontend (Build + Serve)
```bash
cd frontend
npm run build
# Serve dist/ with Nginx or use `npm run preview`

cd ../online-store
npm run build
# Serve dist/ with Nginx on a separate subdomain
```

### Nginx Config (example)
```nginx
# API
server {
    listen 80;
    server_name api.sammy.rw;
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Staff Dashboard
server {
    listen 80;
    server_name erp.sammy.rw;
    root /var/www/sammy/frontend/dist;
    index index.html;
    try_files $uri $uri/ /index.html;
}

# Online Store
server {
    listen 80;
    server_name order.sammy.rw;
    root /var/www/sammy/online-store/dist;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```

---

## 8. Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/sammy_erp"
JWT_SECRET="your-secret-key"
PORT=5000
FRONTEND_URL="http://localhost:5173"
ONLINE_STORE_URL="http://localhost:5174"
DELIVERY_FEE=1000
LOYALTY_RATE=1000
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

### Online Store (`online-store/.env`)
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

## 9. Key Features Checklist

- [x] Dual login (Email+Password / PIN pad)
- [x] Role-based access control (ADMIN, MANAGER, CASHIER, WAITER, KITCHEN, BAR)
- [x] Real-time Socket.io notifications with smart routing
- [x] Order workflow: Waiter → Kitchen/Bar → Waiter → Cashier
- [x] 8 tables (A–H) with labeled seats
- [x] Inventory management with liquor ml tracking
- [x] Payroll, attendance, shift management
- [x] Analytics with charts (AreaChart, BarChart, PieChart)
- [x] PDF & Excel export
- [x] Audit logs (Admin only)
- [x] Punishment & delete request approval workflows
- [x] Performance leaderboards
- [x] Dark/light mode
- [x] Online ordering store with loyalty points
- [x] Delivery rider management
- [x] Customer reviews & promotions
- [x] Database backup system

---

## 10. Useful Commands

```bash
# View database in browser
cd backend && npm run db:studio

# Re-seed database (fresh data)
cd backend && npm run db:seed

# Check backend logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log

# Reset database (CAUTION: destroys all data)
cd backend && npx prisma migrate reset
```
