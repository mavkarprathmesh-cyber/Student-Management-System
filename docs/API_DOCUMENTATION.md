# API Documentation: Student Management System (SMS)

Base URL: `http://localhost:5000/api`

---

## Authentication & Headers

All protected endpoints require an `Authorization` header containing the JWT Bearer token:
```http
Authorization: Bearer <accessToken>
```

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/login`
- **Description:** Authenticates user credentials and returns JWT access & refresh tokens.
- **Body:**
  ```json
  {
    "email": "admin@sms.edu",
    "password": "Admin@123456"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOi...",
      "refreshToken": "eyJhbGci...",
      "user": {
        "id": "uuid",
        "email": "admin@sms.edu",
        "role": "ADMIN"
      }
    }
  }
  ```

### `GET /api/auth/me`
- **Description:** Retrieves authenticated user's current session and linked profiles.
- **Access:** Any authenticated user.

### `POST /api/auth/change-password`
- **Description:** Updates password for the current user.
- **Body:** `{ "currentPassword": "...", "newPassword": "..." }`

### `POST /api/auth/init-admin`
- **Description:** Safe initial setup endpoint for first administrator. Fails if admin already exists.
- **Body:** `{ "email": "admin@institution.edu", "password": "..." }`

---

## 2. Dashboard Endpoints (`/api/dashboard`)

### `GET /api/dashboard/stats`
- **Description:** Returns real-time database counts (active students, faculty, courses, attendance %, pending fees).
- **Access:** Authenticated users (tailored response for Students vs Staff).

### `GET /api/dashboard/charts`
- **Description:** Returns calculated aggregated data for Recharts (monthly admissions, attendance trends, course distribution, grade breakdown).

---

## 3. Student Management Endpoints (`/api/students`)

### `GET /api/students`
- **Query Params:** `page`, `limit`, `search`, `departmentId`, `courseId`, `classId`, `status`, `sortBy`, `sortOrder`.
- **Access:** Admin, Teacher.

### `GET /api/students/:id`
- **Description:** Full profile including attendance history, exam results, and fee records.
- **Access:** Admin, Teacher, or Student viewing own ID.

### `POST /api/students`
- **Description:** Creates student with atomic admission number generation (`ADM-YYYY-XXXX`) and enrollment.
- **Access:** Admin.

### `PUT /api/students/:id`
- **Description:** Updates student record.
- **Access:** Admin.

### `PATCH /api/students/:id/deactivate`
- **Description:** Safely sets status to `INACTIVE` preserving historical records.
- **Access:** Admin.

### `PATCH /api/students/:id/restore`
- **Description:** Restores student status to `ACTIVE`.
- **Access:** Admin.

### `GET /api/students/export/csv`
- **Description:** Generates and downloads CSV of filtered student records.

### `POST /api/students/import/csv`
- **Description:** Batch imports students from CSV data.

---

## 4. Academic Structure Endpoints (`/api/academics`)

- `GET /api/academics/departments` & `POST /api/academics/departments`
- `GET /api/academics/courses` & `POST /api/academics/courses`
- `GET /api/academics/classes` & `POST /api/academics/classes`
- `GET /api/academics/subjects` & `POST /api/academics/subjects`
- `GET /api/academics/academic-years` & `POST /api/academics/academic-years`
- `POST /api/academics/promote` (Batch student promotion wizard)

---

## 5. Attendance Management Endpoints (`/api/attendance`)

### `GET /api/attendance/session`
- **Query Params:** `classId`, `subjectId`, `date`.
- **Description:** Fetches or initializes session with enrolled student roster.

### `POST /api/attendance/mark`
- **Description:** Bulk saves attendance records (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`).
- **Formula:** `Attendance % = (Attended eligible / Total eligible) * 100`

### `GET /api/attendance/class-summary`
- **Query Params:** `classId`.
- **Description:** Computes attendance percentages per enrolled student.

### `GET /api/attendance/low-attendance`
- **Query Params:** `threshold=75`.
- **Description:** Returns list of students below attendance threshold with guardian phone contacts.

---

## 6. Examinations & Results Endpoints (`/api/examinations`)

- `GET /api/examinations` (Lists exams; students see only published exams)
- `POST /api/examinations` (Schedule exam with subjects, max marks, passing marks)
- `PATCH /api/examinations/:id/publish` (Publishes results to students)
- `GET /api/examinations/marks/sheet` (Marks entry sheet)
- `POST /api/examinations/marks/save` (Bulk save student marks with validation)
- `GET /api/examinations/report-card/:studentId/:examId` (Official student report card with GPA & grades)

---

## 7. Fee & Finance Endpoints (`/api/fees`)

- `GET /api/fees/structures` & `POST /api/fees/structures`
- `GET /api/fees/student-fees` (Student fee accounts with balance, status)
- `POST /api/fees/payments` (Records payment, updates balance, creates receipt #)
- `GET /api/fees/receipts/:receiptNumber` (Receipt breakdown for printing)
- `GET /api/fees/export/csv` (Download fee report)

---

## 8. Notice Board & System Settings (`/api/announcements`, `/api/settings`)

- `GET /api/announcements` & `POST /api/announcements`
- `GET /api/announcements/notifications` & `POST /api/announcements/notifications/read-all`
- `GET /api/settings/institution` & `PUT /api/settings/institution`
- `GET /api/settings/users` & `PATCH /api/settings/users/:id/status`
- `GET /api/settings/audit-logs` (Immutable system activity audit trails)
