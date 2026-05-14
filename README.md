# AI Examiner — Intelligent Examination Platform

An enterprise-grade AI-powered platform for automated handwritten answer sheet evaluation using Google Gemini AI and EasyOCR.

---

## ⚡ Quick Start Guide (Windows)

### Step 1 — Start MongoDB

MongoDB must be running before you can start the backend. Choose one:

**Option A — MongoDB is installed as a Windows Service (recommended):**
```
net start MongoDB
```

**Option B — Run MongoDB manually:**
```
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath C:\data\db
```

**Option C — MongoDB not installed? Install it:**
1. Download from: https://www.mongodb.com/try/download/community
2. Run the `.msi` installer, choose "Install as a Windows Service"
3. After install, `net start MongoDB` will work

**Option D — Use MongoDB Atlas (cloud, no install needed):**
- Create a free cluster at https://cloud.mongodb.com
- Copy the connection string and update `backend/.env`:
  ```
  MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/aiexaminer
  ```

---

### Step 2 — Install Dependencies

Open 3 separate terminals in `C:\Users\SHANKRAMMA\Downloads\aiexam\`:

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm run seed
npm run dev
# ✅ Starts on http://localhost:5001
```

**Terminal 2 — AI Microservice (Python):**
```bash
cd ai-service
pip install -r requirements.txt
python main.py
# ✅ Starts on http://localhost:8000
```

**Terminal 3 — Frontend:**
```bash
cd frontend
npm install
npm run dev
# ✅ Starts on http://localhost:5173
```

Or run the automated scripts:
```bash
install.bat   # Install all dependencies
start.bat     # Start all 3 services in separate windows
```

---

## 🔑 Demo Credentials

| Role    | Email                        | Password    |
|---------|------------------------------|-------------|
| Admin   | admin@aiexaminer.com        | admin123    |
| Teacher | teacher@aiexaminer.com      | teacher123  |
| Student | student@aiexaminer.com      | student123  |

---

## 🏗️ Architecture

```
aiexam/
├── backend/         # Node.js + Express + MongoDB
│   └── src/
│       ├── models/       # Mongoose schemas (User, Exam, Submission, Evaluation)
│       ├── controllers/  # Route handlers (auth, admin, teacher, student)
│       ├── routes/       # Express routes
│       ├── middleware/   # JWT auth, file upload, error handler
│       ├── services/     # aiService.js — orchestrates OCR + Gemini pipeline
│       └── utils/        # seed.js — demo data seeder
├── frontend/        # React 18 + Vite + Tailwind CSS v3
│   └── src/
│       ├── pages/        # All pages (admin/teacher/student/auth)
│       ├── components/   # Reusable layouts with animated sidebars
│       ├── store/        # Zustand (auth, notifications)
│       └── services/     # Axios API client
└── ai-service/      # Python FastAPI + EasyOCR + Gemini AI
    └── services/
        ├── ocr_service.py     # EasyOCR text extraction from PDFs/images
        └── gemini_service.py  # Gemini 1.5 Flash answer evaluation
```

---

## ✨ Key Features

| Feature | Details |
|---------|---------|
| AI Evaluation | Gemini 1.5 Flash grades answers semantically |
| OCR Extraction | EasyOCR reads handwritten PDFs and images |
| Identity Masking | Examiners see only anonymous IDs, not student names |
| Multi-Role Access | Admin, Teacher, Examiner, Student dashboards |
| Manual Override | Examiners can override AI marks with audit trail |
| Analytics | Charts for performance trends and subject-wise comparison |
| Re-evaluation | Students can request re-evaluation (max 2 times) |
| Fallback Mode | Rule-based grading when Gemini API is unavailable |

---

## 🔧 Environment Variables

### `backend/.env`
```
PORT=5001
MONGO_URI=mongodb://localhost:27017/aiexaminer
JWT_SECRET=aiexaminer_super_secret_key_change_in_production
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:8000
GEMINI_API_KEY=AIzaSyDan380VsVPcHhrQetBQf4lfymTqf6_kCc
FRONTEND_URL=http://localhost:5173
UPLOAD_PATH=uploads
```

### `ai-service/.env`
```
GEMINI_API_KEY=AIzaSyDan380VsVPcHhrQetBQf4lfymTqf6_kCc
HOST=0.0.0.0
PORT=8000
```

---

## 📚 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Student/Teacher login |
| POST | /api/auth/admin-login | Admin login |
| POST | /api/auth/register | Register (student/teacher) |
| GET | /api/teacher/exams | List all exams |
| POST | /api/teacher/exams | Create exam |
| GET | /api/teacher/submissions | List submissions |
| GET | /api/teacher/submissions/:id/evaluations | Get evaluations |
| PATCH | /api/teacher/evaluations/:id/override | Override marks |
| GET | /api/student/exams | Available exams |
| POST | /api/student/submit/:examId | Submit answer sheet |
| GET | /api/student/submissions/:id/result | Get result |
| GET | /api/ai/health | Check AI microservice |
| GET | /api/health | Backend health check |
