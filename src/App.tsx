import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { CountersPage } from "./pages/CountersPage";
import { CounterDetailPage } from "./pages/CounterDetailPage";
import { TodayDashboard } from "./pages/TodayDashboard";
import { TasksPage } from "./pages/TasksPage";
import { CalendarPage } from "./pages/CalendarPage";
import { RemindersPage } from "./pages/RemindersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AnalyticsDashboard } from "./pages/AnalyticsDashboard";
import { ProfilePage } from "./pages/ProfilePage";
import { ToastContainer, ReminderScheduler } from "./components/ReminderToast";
import { ThemeProvider } from "./components/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastContainer>
          <ReminderScheduler />
          <Routes>
            <Route path="/login"  element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/today" replace />} />
              <Route path="/today"      element={<TodayDashboard />} />
              <Route path="/analytics"  element={<AnalyticsDashboard />} />
              <Route path="/counters"   element={<CountersPage />} />
              <Route path="/counters/:id" element={<CounterDetailPage />} />
              <Route path="/tasks"      element={<TasksPage />} />
              <Route path="/calendar"   element={<CalendarPage />} />
              <Route path="/reminders"  element={<RemindersPage />} />
              <Route path="/profile"    element={<ProfilePage />} />
              <Route path="/settings"   element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </ToastContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
