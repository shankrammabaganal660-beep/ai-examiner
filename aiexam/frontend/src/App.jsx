import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Public pages
import Home from './pages/Home';
import RoleSelection from './pages/auth/RoleSelection';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin pages
import AdminLayout from './components/layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';

// Teacher pages
import TeacherLayout from './components/layouts/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ManageExams from './pages/teacher/ManageExams';
import CreateExam from './pages/teacher/CreateExam';
import Submissions from './pages/teacher/Submissions';
import EvaluationView from './pages/teacher/EvaluationView';
import TeacherAnalytics from './pages/teacher/TeacherAnalytics';
import TeacherNotifications from './pages/teacher/TeacherNotifications';
import TeacherSettings from './pages/teacher/TeacherSettings';

// Student pages
import StudentLayout from './components/layouts/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import AvailableExams from './pages/student/AvailableExams';
import StudentResults from './pages/student/StudentResults';
import ResultDetail from './pages/student/ResultDetail';
import StudentAnalytics from './pages/student/StudentAnalytics';
import StudentNotifications from './pages/student/StudentNotifications';
import StudentSettings from './pages/student/StudentSettings';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, isTokenValid } = useAuthStore();
  const validToken = isTokenValid();

  console.log('ProtectedRoute Check:', { 
    isAuthenticated, 
    role: user?.role, 
    hasValidToken: validToken,
    allowedRoles 
  });

  if (!isAuthenticated || !validToken) {
    console.warn('ProtectedRoute: Not authenticated or invalid token, redirecting to /');
    return <Navigate to="/" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    console.warn(`ProtectedRoute: Role ${user?.role} not allowed, redirecting.`);
    const roleMap = { admin: '/admin', teacher: '/teacher', examiner: '/teacher', student: '/student' };
    return <Navigate to={roleMap[user?.role] || '/'} replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#16162a', color: '#e8e8f0', border: '1px solid #2a2a4a', fontSize: '13px', fontWeight: 500 },
          success: { iconTheme: { primary: '#10b981', secondary: '#16162a' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#16162a' } },
          duration: 3000,
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/auth/role" element={<RoleSelection />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/register/:role" element={<Register />} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

        {/* Teacher / Examiner */}
        <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher', 'examiner']}><TeacherLayout /></ProtectedRoute>}>
          <Route index element={<TeacherDashboard />} />
          <Route path="exams" element={<ManageExams />} />
          <Route path="exams/create" element={<CreateExam />} />
          <Route path="exams/:id/edit" element={<CreateExam />} />
          <Route path="submissions" element={<Submissions />} />
          <Route path="submissions/:id/evaluate" element={<EvaluationView />} />
          <Route path="analytics" element={<TeacherAnalytics />} />
          <Route path="notifications" element={<TeacherNotifications />} />
          <Route path="settings" element={<TeacherSettings />} />
        </Route>

        {/* Student */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentLayout /></ProtectedRoute>}>
          <Route index element={<StudentDashboard />} />
          <Route path="exams" element={<AvailableExams />} />
          <Route path="results" element={<StudentResults />} />
          <Route path="results/:id" element={<ResultDetail />} />
          <Route path="analytics" element={<StudentAnalytics />} />
          <Route path="notifications" element={<StudentNotifications />} />
          <Route path="settings" element={<StudentSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
