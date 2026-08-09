import React, { useState, useEffect } from 'react';
import {
  Key,
  Mail,
  Upload,
  GitBranch,
  Briefcase,
  Award,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Eye,
  EyeOff,
  Phone,
  Code,
  FolderGit2,
  GraduationCap,
  Edit3,
  Save,
  X
} from 'lucide-react';

export default function ProfilePage({
  profile,
  credStatus,
  onUpdateProfile,
  onUploadResume,
  onSyncGithub,
  onSaveGroqKey,
  onDeleteGroqKey,
  onStartGmailOAuth,
  onDeleteGmail,
  onRefresh
}) {
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [validatingGroq, setValidatingGroq] = useState(false);
  const [groqError, setGroqError] = useState('');
  const [groqSuccessMsg, setGroqSuccessMsg] = useState('');

  const [githubInput, setGithubInput] = useState(profile?.github_username || '');
  const [syncing, setSyncing] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    cgpa: profile?.cgpa || '',
    primary_domain: profile?.primary_domain || '',
    skillsStr: (profile?.skills || []).join(', ')
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        cgpa: profile.cgpa || '',
        primary_domain: profile.primary_domain || '',
        skillsStr: (profile.skills || []).join(', ')
      });
    }
  }, [profile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileErr('');

    try {
      const skills = editForm.skillsStr
        ? editForm.skillsStr.split(',').map(s => s.trim()).filter(Boolean)
        : (profile?.skills || []);
      
      if (onUpdateProfile) {
        await onUpdateProfile({
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone,
          cgpa: editForm.cgpa,
          primary_domain: editForm.primary_domain,
          skills
        });
      }
      setProfileMsg('Master Profile updated and saved successfully!');
      setIsEditing(false);
      if (onRefresh) await onRefresh();
    } catch (err) {
      setProfileErr(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

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
    } catch (err) {
      console.error('Resume upload error:', err);
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const handleGithubSync = async () => {
    if (!githubInput) return;
    setSyncing(true);
    try {
      await onSyncGithub(githubInput);
    } catch (err) {
      console.error('GitHub sync error:', err);
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
      await onSaveGroqKey(groqKeyInput.trim());
      setGroqSuccessMsg('Groq API Key validated and saved securely!');
      setGroqKeyInput('');
      if (onRefresh) await onRefresh();
    } catch (err) {
      const detailMsg = typeof err.response?.data?.detail === 'string'
        ? err.response.data.detail
        : 'Failed to validate Groq API key. Check key format.';
      setGroqError(detailMsg);
    } finally {
      setValidatingGroq(false);
    }
  };

  const handleConnectGmail = async () => {
    setGmailLoading(true);
    setGmailError('');
    setGmailSuccessMsg('');

    try {
      if (onStartGmailOAuth) {
        await onStartGmailOAuth();
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setGmailError('Session expired. Please log out and log in again.');
      } else {
        const detailMsg = typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : 'Failed to connect Gmail account.';
        setGmailError(detailMsg);
      }
    } finally {
      setGmailLoading(false);
    }
  };

  // Categorize Skills vs Tools
  const TOOL_KEYWORDS = ['VS Code', 'Power BI', 'Microsoft Excel', 'Git', 'GitHub', 'Linux', 'Docker', 'Kubernetes', 'Postman', 'Figma', 'Jupyter'];
  const allSkills = profile?.skills || [];
  const extractedTools = allSkills.filter(s => TOOL_KEYWORDS.includes(s));
  const coreTechnicalSkills = allSkills.filter(s => !TOOL_KEYWORDS.includes(s));

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Master Candidate Profile</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage your derived technical skills, parsed resume details, tools, and BYOK credentials.
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

              {gmailError && (
                <p className="text-[11px] text-rose-600 font-medium">{gmailError}</p>
              )}
              {gmailSuccessMsg && (
                <p className="text-[11px] text-emerald-600 font-medium">{gmailSuccessMsg}</p>
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
          
          {/* Candidate Info Overview with Edit & Save Capability */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Candidate Information & Master Profile
              </h2>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              )}
            </div>

            {profileMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                {profileMsg}
              </div>
            )}
            {profileErr && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                {profileErr}
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-zinc-700 font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      placeholder="Candidate Name"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-700 font-medium mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="candidate@example.com"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-700 font-medium mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-700 font-medium mb-1">CGPA / Grade</label>
                    <input
                      type="text"
                      value={editForm.cgpa}
                      onChange={(e) => setEditForm({ ...editForm, cgpa: e.target.value })}
                      placeholder="8.5"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Primary Domain</label>
                  <input
                    type="text"
                    value={editForm.primary_domain}
                    onChange={(e) => setEditForm({ ...editForm, primary_domain: e.target.value })}
                    placeholder="Full Stack Development"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Technical Skills & Tools (comma separated)</label>
                  <textarea
                    rows={3}
                    value={editForm.skillsStr}
                    onChange={(e) => setEditForm({ ...editForm, skillsStr: e.target.value })}
                    placeholder="Python, JavaScript, React, FastAPI, Docker, Git"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {savingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingProfile ? 'Saving Profile...' : 'Save Master Profile'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/60">
                  <div className="text-zinc-500 font-medium flex items-center gap-1">
                    Full Name
                  </div>
                  <div className="text-xs font-semibold text-zinc-900 mt-1 truncate">{profile?.full_name || 'Not set'}</div>
                </div>
                
                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/60">
                  <div className="text-zinc-500 font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3 text-indigo-500" /> Email Address
                  </div>
                  <div className="text-xs font-semibold text-zinc-900 mt-1 truncate">{profile?.email || 'Not set'}</div>
                </div>

                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/60">
                  <div className="text-zinc-500 font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-500" /> Phone Number
                  </div>
                  <div className="text-xs font-semibold text-zinc-900 mt-1">{profile?.phone || 'Not set'}</div>
                </div>

                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/60">
                  <div className="text-zinc-500 font-medium flex items-center gap-1">
                    CGPA / Grade
                  </div>
                  <div className="text-xs font-semibold text-zinc-900 mt-1">{profile?.cgpa || '8.5 / 10'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Tools, Software & Technologies */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-600" />
                Tools, Software & Environment ({extractedTools.length})
              </h2>
            </div>

            {extractedTools.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">Upload resume to extract tools (e.g. VS Code, Power BI, Excel, Git, Linux, Docker).</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {extractedTools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-xs font-semibold rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs"
                  >
                    ⚡ {tool}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Derived Technical Skills Badge Cloud */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                Derived Technical & Programming Skills ({coreTechnicalSkills.length})
              </h2>
            </div>

            {coreTechnicalSkills.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No skills extracted yet. Upload your resume to extract skills.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {coreTechnicalSkills.map((skill, idx) => (
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

          {/* Resume Projects Extracted */}
          {profile?.projects && profile.projects.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo-600" />
                Resume Projects ({profile.projects.length})
              </h2>

              <div className="space-y-3">
                {profile.projects.map((proj, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1.5">
                    <div className="font-semibold text-sm text-zinc-900">{proj.title}</div>
                    <div className="text-xs text-zinc-600">{proj.description}</div>
                    {proj.tech && (
                      <span className="inline-block mt-1 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-indigo-100 text-indigo-800">
                        Tech: {proj.tech}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education & Degree Extracted */}
          {profile?.education && profile.education.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
              <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                Education & Degree ({profile.education.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile.education.map((edu, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
                    <div className="font-semibold text-xs text-zinc-900">{edu.institution}</div>
                    <div className="text-[11px] text-zinc-600">{edu.degree}</div>
                    <div className="text-[10px] text-zinc-400">Year: {edu.year}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
