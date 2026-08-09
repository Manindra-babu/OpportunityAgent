import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import FeedPage from './components/FeedPage';
import ProfilePage from './components/ProfilePage';
import NewsPage from './components/NewsPage';
import SettingsPage from './components/SettingsPage';
import ActivityPage from './components/ActivityPage';

import {
  signup,
  login,
  logout,
  getMe,
  getCredentialsStatus,
  saveGroqKey,
  deleteGroqKey,
  startGmailOAuth,
  deleteGmail,
  getProfile,
  updateProfile,
  uploadResume,
  syncGithub,
  getOpportunities,
  triggerDiscovery,
  manualAction,
  getNews,
  refreshNews,
  getSettings,
  updateThreshold,
  getActivityLogs,
  getFailureMemory,
  getRules,
  getMetrics,
  submitUserFix
} from './api/client';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  
  const [oppLoading, setOppLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);

  const [profile, setProfile] = useState(null);
  const [credStatus, setCredStatus] = useState({ groq_connected: false, gmail_connected: false });
  const [opportunities, setOpportunities] = useState([]);
  const [news, setNews] = useState([]);
  const [settings, setSettings] = useState({ relevance_threshold: 70 });
  const [logs, setLogs] = useState([]);
  const [failureMemory, setFailureMemory] = useState([]);
  const [rules, setRules] = useState([]);
  const [metrics, setMetrics] = useState(null);

  // Check auth session on load
  const checkAuth = async () => {
    setAuthChecking(true);
    try {
      const user = await getMe();
      if (user) {
        setCurrentUser(user);
        await loadUserData();
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  const loadUserData = async () => {
    try {
      const [profData, credData, oppData, newsData, settsData, logData, memData, rulesData, metData] = await Promise.all([
        getProfile().catch(() => null),
        getCredentialsStatus().catch(() => ({ groq_connected: false, gmail_connected: false })),
        getOpportunities().catch(() => []),
        getNews().catch(() => []),
        getSettings().catch(() => ({ relevance_threshold: 70 })),
        getActivityLogs().catch(() => []),
        getFailureMemory().catch(() => []),
        getRules().catch(() => []),
        getMetrics().catch(() => null)
      ]);

      if (profData) setProfile(profData);
      if (credData) setCredStatus(credData);
      if (oppData) setOpportunities(oppData);
      if (newsData) setNews(newsData);
      if (settsData) setSettings(settsData);
      if (logData) setLogs(logData);
      if (memData) setFailureMemory(memData);
      if (rulesData) setRules(rulesData);
      if (metData) setMetrics(metData);
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleSuccessAuth = async (user) => {
    if (user) {
      setCurrentUser(user);
      await loadUserData();
    }
  };

  const handleSignup = async (payload) => {
    if (payload?.id) {
      await handleSuccessAuth(payload);
    } else {
      const res = await signup(payload);
      if (res.user) {
        setCurrentUser(res.user);
        await loadUserData();
      }
    }
  };

  const handleLogin = async (payload) => {
    const res = await login(payload);
    if (res.user) {
      setCurrentUser(res.user);
      await loadUserData();
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  const handleSaveGroqKey = async (key) => {
    await saveGroqKey(key);
    await loadUserData();
  };

  const handleDeleteGroqKey = async () => {
    await deleteGroqKey();
    await loadUserData();
  };

  const handleStartGmailOAuth = async () => {
    const res = await startGmailOAuth();
    if (res?.url) {
      window.location.href = res.url;
    } else if (res?.authorization_url) {
      window.location.href = res.authorization_url;
    } else {
      await loadUserData();
    }
  };

  const handleDeleteGmail = async () => {
    await deleteGmail();
    await loadUserData();
  };

  const handleUpdateProfile = async (profileData) => {
    const res = await updateProfile(profileData);
    await loadUserData();
    return res;
  };

  const handleUploadResume = async (fileOrFormData) => {
    let formData = fileOrFormData;
    if (!(fileOrFormData instanceof FormData)) {
      formData = new FormData();
      formData.append('file', fileOrFormData);
    }
    const res = await uploadResume(formData);
    await loadUserData();
    return res;
  };

  const handleSyncGithub = async (usernameOrFormData) => {
    let username = usernameOrFormData;
    if (usernameOrFormData instanceof FormData) {
      username = usernameOrFormData.get('github_username') || '';
    }
    const res = await syncGithub(username);
    await loadUserData();
    return res;
  };

  const handleTriggerDiscovery = async () => {
    setOppLoading(true);
    try {
      await triggerDiscovery();
      await loadUserData();
    } finally {
      setOppLoading(false);
    }
  };

  const handleManualAction = async (oppId, action) => {
    await manualAction({ opportunity_id: oppId, action });
    await loadUserData();
  };

  const handleRefreshNews = async () => {
    setNewsLoading(true);
    try {
      await refreshNews();
      await loadUserData();
    } finally {
      setNewsLoading(false);
    }
  };

  const handleUpdateThreshold = async (threshold) => {
    await updateThreshold(threshold);
    await loadUserData();
  };

  const handleSubmitUserFix = async (payload) => {
    await submitUserFix(payload);
    await loadUserData();
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500 font-medium text-sm">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          Authenticating candidate session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 flex flex-col">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main App Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        {activeTab === 'feed' && (
          <FeedPage
            opportunities={opportunities}
            threshold={settings?.relevance_threshold || 70}
            loading={oppLoading}
            onTriggerDiscovery={handleTriggerDiscovery}
            onManualAction={handleManualAction}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePage
            profile={profile}
            credStatus={credStatus}
            onUpdateProfile={handleUpdateProfile}
            onUploadResume={handleUploadResume}
            onSyncGithub={handleSyncGithub}
            onSaveGroqKey={handleSaveGroqKey}
            onDeleteGroqKey={handleDeleteGroqKey}
            onStartGmailOAuth={handleStartGmailOAuth}
            onDeleteGmail={handleDeleteGmail}
            onRefresh={loadUserData}
          />
        )}

        {activeTab === 'news' && (
          <NewsPage
            news={news}
            loading={newsLoading}
            onRefreshNews={handleRefreshNews}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onUpdateThreshold={handleUpdateThreshold}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityPage
            logs={logs}
            failureMemory={failureMemory}
            rules={rules}
            metrics={metrics}
            onSubmitFix={handleSubmitUserFix}
          />
        )}
      </main>

      {/* Auth Modal overlay if logged out */}
      {!currentUser && (
        <AuthModal
          onLogin={handleLogin}
          onSignup={handleSignup}
          onSuccessAuth={handleSuccessAuth}
        />
      )}
    </div>
  );
}
