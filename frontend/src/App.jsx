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
      const [profData, credData, oppData, newsData, settsData, logData, memData, metData] = await Promise.all([
        getProfile().catch(() => null),
        getCredentialsStatus().catch(() => ({ groq_connected: false, gmail_connected: false })),
        getOpportunities().catch(() => []),
        getNews().catch(() => []),
        getSettings().catch(() => ({ relevance_threshold: 70 })),
        getActivityLogs().catch(() => []),
        getFailureMemory().catch(() => []),
        getMetrics().catch(() => null)
      ]);

      if (profData) setProfile(profData);
      if (credData) setCredStatus(credData);
      if (oppData) setOpportunities(oppData);
      if (newsData) setNews(newsData);
      if (settsData) setSettings(settsData);
      if (logData) setLogs(logData);
      if (memData) setFailureMemory(memData);
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
    if (res.authorization_url) {
      window.location.href = res.authorization_url;
    }
  };

  const handleDeleteGmail = async () => {
    await deleteGmail();
    await loadUserData();
  };

  const handleUploadResume = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    await uploadResume(formData);
    await loadUserData();
  };

  const handleSyncGithub = async (username) => {
    await syncGithub(username);
    await loadUserData();
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

  const handleUpdateThreshold = async (val) => {
    await updateThreshold(val);
    await loadUserData();
  };

  const handleSubmitFix = async (oppId, fieldName, fieldValue, rememberRule) => {
    await submitUserFix({
      opportunity_id: oppId,
      field_name: fieldName,
      field_value: fieldValue,
      remember_rule: rememberRule
    });
    await loadUserData();
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      
      {/* Auth Modal if Not Logged In */}
      {!currentUser && (
        <AuthModal onLogin={handleLogin} onSignup={handleSignup} onSuccessAuth={handleSuccessAuth} />
      )}

      {/* Header */}
      {currentUser && (
        <Header
          currentUser={currentUser}
          credStatus={credStatus}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onRefresh={loadUserData}
          onLogout={handleLogout}
        />
      )}

      {/* Main Content Area */}
      {currentUser && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          {activeTab === 'feed' && (
            <FeedPage
              opportunities={opportunities}
              threshold={settings.relevance_threshold || 70}
              onTriggerDiscovery={handleTriggerDiscovery}
              onManualAction={handleManualAction}
              loading={oppLoading}
            />
          )}

          {activeTab === 'profile' && (
            <ProfilePage
              profile={profile}
              credStatus={credStatus}
              onUploadResume={handleUploadResume}
              onSyncGithub={handleSyncGithub}
              onSaveGroqKey={handleSaveGroqKey}
              onDeleteGroqKey={handleDeleteGroqKey}
              onStartGmailOAuth={handleStartGmailOAuth}
              onDeleteGmail={handleDeleteGmail}
            />
          )}

          {activeTab === 'news' && (
            <NewsPage
              news={news}
              onRefresh={handleRefreshNews}
              loading={newsLoading}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityPage
              logs={logs}
              failureMemory={failureMemory}
              rules={rules}
              metrics={metrics}
              onSubmitFix={handleSubmitFix}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              settings={settings}
              gmailStatus={credStatus}
              onUpdateThreshold={handleUpdateThreshold}
            />
          )}
        </main>
      )}

      <footer className="bg-white border-t border-zinc-200 py-4 text-center text-xs text-zinc-400">
        OpportunityAgent — Multi-User BYOK Internship & Hackathon Engine • Strict Light SaaS Aesthetic
      </footer>
    </div>
  );
}
