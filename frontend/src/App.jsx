import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import QuestionnairePage from './pages/student/QuestionnairePage';
import MatchesPage from './pages/student/MatchesPage';
import RoomPage from './pages/student/RoomPage';
import FeedbackPage from './pages/student/FeedbackPage';
import PendingApprovalPage from './pages/student/PendingApprovalPage';
import RejectedRegistrationPage from './pages/student/RejectedRegistrationPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentsPage from './pages/admin/StudentsPage';
import RegistrationRequestsPage from './pages/admin/RegistrationRequestsPage';
import RoomsPage from './pages/admin/RoomsPage';
import MatchingPage from './pages/admin/MatchingPage';
import CompatibilityPage from './pages/admin/CompatibilityPage';
import AllocationsPage from './pages/admin/AllocationsPage';
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage';
import AdminManagementPage from './pages/admin/AdminManagementPage';

// Management pages
import ManagementDashboard from './pages/management/ManagementDashboard';
import ManagementRoomsPage from './pages/management/ManagementRoomsPage';
import ReportsPage from './pages/management/ReportsPage';

// Student profile page (shared)
import StudentProfilePage from './pages/student/StudentProfilePage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />

            {/* Student approval states */}
            <Route path="/student/pending-approval" element={<ProtectedRoute roles={['STUDENT']} allowPending><PendingApprovalPage /></ProtectedRoute>} />
            <Route path="/student/rejected" element={<ProtectedRoute roles={['STUDENT']} allowRejected><RejectedRegistrationPage /></ProtectedRoute>} />

            {/* Approved student routes */}
            <Route path="/student/dashboard" element={<ProtectedRoute roles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute roles={['STUDENT']}><StudentProfilePage /></ProtectedRoute>} />
            <Route path="/student/questionnaire" element={<ProtectedRoute roles={['STUDENT']}><QuestionnairePage /></ProtectedRoute>} />
            <Route path="/student/matches" element={<ProtectedRoute roles={['STUDENT']}><MatchesPage /></ProtectedRoute>} />
            <Route path="/student/room" element={<ProtectedRoute roles={['STUDENT']}><RoomPage /></ProtectedRoute>} />
            <Route path="/student/feedback" element={<ProtectedRoute roles={['STUDENT']}><FeedbackPage /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/registration-requests" element={<ProtectedRoute roles={['ADMIN']}><RegistrationRequestsPage /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute roles={['ADMIN']}><StudentsPage /></ProtectedRoute>} />
            <Route path="/admin/rooms" element={<ProtectedRoute roles={['ADMIN']}><RoomsPage /></ProtectedRoute>} />
            <Route path="/admin/matching" element={<ProtectedRoute roles={['ADMIN']}><MatchingPage /></ProtectedRoute>} />
            <Route path="/admin/compatibility" element={<ProtectedRoute roles={['ADMIN']}><CompatibilityPage /></ProtectedRoute>} />
            <Route path="/admin/allocations" element={<ProtectedRoute roles={['ADMIN']}><AllocationsPage /></ProtectedRoute>} />
            <Route path="/admin/feedback" element={<ProtectedRoute roles={['ADMIN']}><AdminFeedbackPage /></ProtectedRoute>} />

            {/* Management routes */}
            <Route path="/management/dashboard" element={<ProtectedRoute roles={['MANAGEMENT']}><ManagementDashboard /></ProtectedRoute>} />
            <Route path="/management/registration-requests" element={<ProtectedRoute roles={['MANAGEMENT']}><RegistrationRequestsPage /></ProtectedRoute>} />
            <Route path="/management/rooms" element={<ProtectedRoute roles={['MANAGEMENT']}><ManagementRoomsPage /></ProtectedRoute>} />
            <Route path="/management/reports" element={<ProtectedRoute roles={['MANAGEMENT']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/management/admins" element={<ProtectedRoute roles={['MANAGEMENT']}><AdminManagementPage /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
