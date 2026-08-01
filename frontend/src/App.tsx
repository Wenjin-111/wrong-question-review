import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import { AuthProvider } from './store/AuthContext';
import { ThemeProvider, useTheme } from './store/ThemeProvider';
import { themes } from './styles/theme';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import QuestionsPage from './pages/QuestionsPage';
import QuestionAddPage from './pages/QuestionAddPage';
import QuestionDetailPage from './pages/QuestionDetailPage';
import OCREntryPage from './pages/OCREntryPage';
import ReviewCenterPage from './pages/ReviewCenterPage';
import ReviewSessionPage from './pages/ReviewSessionPage';
import ReviewResultPage from './pages/ReviewResultPage';
import StatsPage from './pages/StatsPage';
import ProfilePage from './pages/ProfilePage';
import DraftBoxPage from './pages/DraftBoxPage';
import PDFImportPage from './pages/PDFImportPage';
import BatchEditPage from './pages/BatchEditPage';
import AIChatPage from './pages/AIChatPage';
import SelectQuestionsPage from './pages/SelectQuestionsPage';

function ThemedApp() {
  const { theme } = useTheme();
  return (
    <ConfigProvider theme={themes[theme]}>
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/questions" element={<QuestionsPage />} />
                  <Route path="/questions/add" element={<QuestionAddPage />} />
                  <Route path="/questions/ocr" element={<OCREntryPage />} />
<Route path="/questions/pdf" element={<PDFImportPage />} />
                  <Route path="/questions/batch-edit" element={<BatchEditPage />} />
                  <Route path="/questions/:id" element={<QuestionDetailPage />} />
                  <Route path="/review" element={<ReviewCenterPage />} />
                  <Route path="/review/session" element={<ReviewSessionPage />} />
                  <Route path="/review/result" element={<ReviewResultPage />} />
                  <Route path="/review/select" element={<SelectQuestionsPage />} />
                  <Route path="/stats" element={<StatsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
<Route path="/profile" element={<ProfilePage />} />
<Route path="/drafts" element={<DraftBoxPage />} />
<Route path="/ai-chat" element={<AIChatPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
