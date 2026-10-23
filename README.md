# Apex Student Management System (SMS)

A complete, modern, responsive, production-ready **Student Management System** built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, **Node.js**, **Express.js**, and **Prisma ORM**.

Designed for colleges, universities, and schools to digitize student admissions, academic operations, daily attendance tracking, examination grading, fee accounts, and institutional governance.

---

## 🌟 Key Features

1. **Role-Based Access Control (RBAC):**
   - **Administrator:** Full institutional authority over departments, courses, classes, faculty, student registrations, fees, and audit logs.
   - **Faculty / Teacher:** Manages assigned classes & subjects, marks attendance, and records examination grades.
   - **Student:** Private student portal viewing personal academic history, attendance rates, published examination grades & report cards, and fee receipts.

2. **Real-Time Dynamic Dashboard:**
   - Real database metrics (Active students, faculty count, program count, attendance rate %, fee collections, low attendance alerts).
   - Interactive **Recharts** visualizations (Monthly admissions, attendance trends, course distribution, grade breakdown, fee collection vs outstanding).

3. **Student Lifecycle Management:**
   - Sequential, collision-free admission number generation (`ADM-YYYY-0001`).
   - Paginated, searchable, and filterable student data tables.
   - CSV export and batch CSV import with validation.
   - Detailed tabbed student profile: Personal & Guardian contacts, Enrollment history, Attendance breakdown, Examination marks, and Fee statements.
   - Safe deactivation & restoration preserving historical academic records.

4. **Faculty & Academic Structure:**
   - Departments, Degree Courses, Class Sections, Curriculum Subjects, and Academic Years with semester terms.
   - Faculty assignment manager linking teachers to subjects and class sections.
   - **Batch Student Promotion Wizard** to advance classes of students to the next academic level.

5. **Accurate Attendance Management:**
   - Bulk daily session marking (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) with duplicate prevention.
   - Attendance percentage calculation formula:  
     $$\text{Attendance \%} = \left(\frac{\text{Attended Eligible Sessions}}{\text{Total Eligible Sessions}}\right) \times 100$$
   - Critical low attendance flagging ($<75\%$) with guardian contact quick-dial.

6. **Examinations & Report Cards:**
   - Scheduled assessments (`MID_TERM`, `FINAL`, `QUIZ`, `PRACTICAL`).
   - Bulk marks entry with validation against maximum marks.
   - Automatic letter grading (`A+`, `A`, `B+`, `B`, `C`, `D`, `F`), pass/fail determination, and cumulative GPA calculation.
   - Controlled publication toggle (draft marks hidden until officially published).
   - Printable official institutional report card view (`window.print()`).

7. **Fee & Financial Accounts:**
   - Configurable fee structures (Tuition, Lab, Exam, Library).
   - Auto-assignment of fees to enrolled students.
   - Payment collection modal supporting partial and full payments across methods (Cash, Wire, Card).
   - Collision-free receipt number generation (`REC-YYYY-0001`) with printable official receipts.

8. **Campus Notice Board & Notifications:**
   - Targeted audience broadcasts (`ALL`, `TEACHERS`, `STUDENTS`, or specific `CLASS`).
   - In-app notification center with unread badge counter.

9. **Security, Audit, & System Settings:**
   - Passwords hashed using `bcrypt` (10 rounds).
   - JWT session management with refresh token rotation.
   - Immutable security audit logs recording administrative updates with user ID, action, entity, and IP address.
   - Dark / Light mode toggle with preference persistence.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, React Router v6 |
| **Backend** | Node.js, Express.js, TypeScript, Prisma ORM, Zod, JWT, bcryptjs, Helmet, CORS |
| **Database** | PostgreSQL (Production) / SQLite (Local Dev with turnkey DB switch script) |
| **Testing** | Vitest, Supertest (17 automated unit and integration tests) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18 or newer)
- npm (v9 or newer)

### 2. Installation
Clone the repository and install root, server, and client dependencies:
```bash
# In the project root:
cd "c:\Student management system"

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Database Initialization & Seeding
```bash
cd ../server
# Push schema and create SQLite local database
npx prisma db push

# Populate rich realistic institutional sample data
npm run prisma:seed
```

### 4. Running the Application
From the workspace root:
```bash
# Start backend API (runs on http://localhost:5000)
npm run dev:server

# In a second terminal, start frontend (runs on http://localhost:5173)
npm run dev:client
```

---

## 🔑 Default Demo Accounts

The database seed script includes three pre-configured accounts:

| Role | Email Address | Password | Description |
|---|---|---|---|
| **Administrator** | `admin@sms.edu` | `Admin@123456` | Full administrative control |
| **Faculty / Teacher** | `sarah.jenkins@sms.edu` | `Teacher@123456` | Department of Computer Science |
| **Student** | `alex.morgan@sms.edu` | `Student@123456` | B.Tech Year 1 Student |

*Tip: The login page includes interactive **1-Click Demo Profile buttons** for instant testing of all roles!*

---

## 🧪 Testing & Verification

Run the automated test suite in the `server` directory:
```bash
cd server
npm test
```
**Test Results:**
- `calculations.test.ts`: 8 unit tests (Attendance formula, late/excused logic, threshold detection, grading scale).
- `api.test.ts`: 9 integration tests (Health check, authentication, RBAC protection, student pagination, fee balances).
- **Result:** **17 passed (100% passing)**.

Verify production builds:
```bash
# Server TypeScript build
npm --prefix server run build

# Client Vite production bundle
npm --prefix client run build
```

---

## 📖 Documentation
- [Production Deployment Guide](file:///c:/Student%20management%20system/docs/DEPLOYMENT_GUIDE.md)
- [Complete REST API Documentation](file:///c:/Student%20management%20system/docs/API_DOCUMENTATION.md)
