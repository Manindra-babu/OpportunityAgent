import React, { useState } from 'react';
import { Upload, GitBranch, Briefcase, GraduationCap, Award, Key, Mail, Eye, EyeOff, CheckCircle2, AlertTriangle, RefreshCw, FileText, Trash2 } from 'lucide-react';

export default function ProfilePage({
  profile,
  credStatus,
  onUploadResume,
  onSyncGithub,
  onSaveGroqKey,
  onDeleteGroqKey,
  onStartGmailOAuth,
  onDeleteGmail,
  onRefresh
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [githubInput, setGithubInput] = useState(profile?.github_username || '');
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Groq API key state
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [validatingGroq, setValidatingGroq] = useState(false);
  const [groqError, setGroqError] = useState('');
  const [groqSuccessMsg, setGroqSuccessMsg] = useState('');

  // Gmail connection state
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailMsg, setGmailMsg] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleResumeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (githubInput) formData.append('github_username', githubInput);
      await onUploadResume(formData);
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleGithubSync = async () => {
    if (!githubInput) return;
    setSyncing(true);
    try {
      await onSyncGithub(githubInput);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveGroqKey = async (e) => {
    e.preventDefault();
    if (!groqKeyInput.trim()) return;
    setValidatingGroq(true);
    setGroqError('');
    setGroqSuccessMsg('');

    try {
      const res = await onSaveGroqKey(groqKeyInput.trim());
      setGroqSuccessMsg(res.message || 'Groq API Key validated and saved securely!');
      setGroqKeyInput('');
      if (onRefresh) await onRefresh();
    } catch (err) {
      setGroqError(err.response?.data?.detail || 'Invalid Groq API Key format. Must start with "gsk_".');
    } finally {
      setValidatingGroq(false);
    }
  };

  const handleConnectGmail = async () => {
    setGmailLoading(true);
    setGmailMsg('');
    try {
      const res = await onStartGmailOAuth();
      if (res.redirect && res.url) {
        window.location.href = res.url;
      } else {
        setGmailMsg(res.message || 'Gmail connected!');
        if (onRefresh) await onRefresh();
      }
    } catch (err) {
      setGmailMsg('Failed to connect Gmail account.');
    } finally {
      setGmailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Master Candidate Profile</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage your derived skills, resume parsing, and BYOK platform API connections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
            Primary Domain: {profile?.primary_domain || 'Full Stack Development'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Connections Card & Uploaders */}
        <div className="space-y-6">
          
          {/* CONNECTIONS CARD (Groq API Key & Gmail OAuth) */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                Connections (BYOK Credentials)
              </h2>
            </div>

            {/* 1. Groq API Key Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-800">Groq API Key</label>
                {credStatus?.groq_connected ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Key Required
                  </span>
                )}
              </div>

              {!credStatus?.groq_connected && (
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800">
                  Add your Groq API key (starts with <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">gsk_...</code>) to enable AI match scoring & resume parsing.
                </div>
              )}

              <form onSubmit={handleSaveGroqKey} className="space-y-2">
                <div className="relative">
                  <input
                    type={showGroqKey ? 'text' : 'password'}
                    placeholder={credStatus?.groq_connected ? '••••••••••••••••••••' : 'gsk_...'}
                    value={groqKeyInput}
                    onChange={(e) => setGroqKeyInput(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    {showGroqKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {groqError && (
                  <p className="text-[11px] text-rose-600 font-medium">{groqError}</p>
                )}
                {groqSuccessMsg && (
                  <p className="text-[11px] text-emerald-600 font-medium">{groqSuccessMsg}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!groqKeyInput.trim() || validatingGroq}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {validatingGroq && <RefreshCw className="w-3 h-3 animate-spin" />}
                    {validatingGroq ? 'Validating...' : 'Validate & Save Key'}
                  </button>

                  {credStatus?.groq_connected && (
                    <button
                      type="button"
                      onClick={async () => {
                        await onDeleteGroqKey();
                        if (onRefresh) await onRefresh();
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium rounded-xl border border-rose-200 transition"
                      title="Disconnect Key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* 2. Gmail Connection Section */}
            <div className="pt-3 border-t border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-800">Gmail Integration</label>
                {credStatus?.gmail_connected ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[10px] text-zinc-500 font-medium">Not Connected</span>
                )}
              </div>

              {gmailMsg && (
                <p className="text-[11px] text-emerald-600 font-medium">{gmailMsg}</p>
              )}

              {credStatus?.gmail_connected ? (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60 text-xs space-y-2">
                  <div className="font-medium text-zinc-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    Connected as <span className="font-semibold text-zinc-900">{credStatus.gmail_email}</span>
                  </div>
                  <button
                    onClick={async () => {
                      await onDeleteGmail();
                      if (onRefresh) await onRefresh();
                    }}
                    className="w-full py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 transition"
                  >
                    Disconnect Gmail Account
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-zinc-500">
                    Connect Gmail to receive automatic email registration alerts & reply actions.
                  </p>
                  <button
                    onClick={handleConnectGmail}
                    disabled={gmailLoading}
                    className="w-full py-2 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white text-xs font-medium rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    {gmailLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    {gmailLoading ? 'Connecting...' : 'Connect Gmail Account'}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Resume Upload Box */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm text-zinc-900">
              <Upload className="w-4 h-4 text-indigo-600" />
              Upload Resume (PDF / DOCX)
            </div>

            <form onSubmit={handleResumeSubmit} className="space-y-3">
              <label className="border-2 border-dashed border-zinc-200 hover:border-indigo-400 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-zinc-50/50">
                <FileText className="w-8 h-8 text-zinc-400 mb-2" />
                <span className="text-xs font-medium text-zinc-700">
                  {selectedFile ? selectedFile.name : 'Drop resume file here or click to browse'}
                </span>
                <span className="text-[10px] text-zinc-400 mt-1">pdfplumber & python-docx extraction</span>
                <input type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" />
              </label>

              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
              >
                {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {uploading ? 'Parsing Resume...' : 'Parse Resume & Update Profile'}
              </button>
            </form>
          </div>

          {/* GitHub Sync Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-semibold text-sm text-zinc-900">
              <GitBranch className="w-4 h-4 text-indigo-600" />
              Sync GitHub Repositories
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="GitHub Username (e.g. alexdev)"
                value={githubInput}
                onChange={(e) => setGithubInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />

              <button
                onClick={handleGithubSync}
                disabled={!githubInput || syncing}
                className="w-full py-2 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white text-xs font-medium rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
              >
                {syncing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {syncing ? 'Syncing Repos...' : 'Fetch & Sync Public Repos'}
              </button>
            </div>
          </div>

        </div>

        {/* Right 2 Columns: Candidate Details & Derived Skills */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Candidate Info Overview */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              Candidate Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/60">
                <div className="text-zinc-500 font-medium">Full Name</div>
                <div className="text-sm font-semibold text-zinc-900 mt-0.5">{profile?.full_name || 'Not set'}</div>
              </div>
              <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/60">
                <div className="text-zinc-500 font-medium">Email Address</div>
                <div className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">{profile?.email || 'Not set'}</div>
              </div>
              <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/60">
                <div className="text-zinc-500 font-medium">CGPA / Grade</div>
                <div className="text-sm font-semibold text-zinc-900 mt-0.5">{profile?.cgpa || '8.5 / 10'}</div>
              </div>
            </div>
          </div>

          {/* Derived Skills Badge Cloud */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                Derived Technical Skills ({profile?.skills?.length || 0})
              </h2>
            </div>

            {(!profile?.skills || profile.skills.length === 0) ? (
              <p className="text-xs text-zinc-500 italic">No skills extracted yet. Upload your resume to extract skills.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Synced GitHub Repositories */}
          {profile?.github_repos && profile.github_repos.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-600" />
                Synced GitHub Repositories ({profile.github_repos.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile.github_repos.map((repo, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
                    <div className="font-semibold text-xs text-zinc-900">{repo.name}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{repo.description || 'No description'}</div>
                    {repo.language && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-zinc-200 text-zinc-700">
                        {repo.language}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
