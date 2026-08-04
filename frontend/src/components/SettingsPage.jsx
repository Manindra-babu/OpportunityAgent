import React, { useState } from 'react';
import { Sliders, Mail, ShieldCheck, Check, Save, Info } from 'lucide-react';

export default function SettingsPage({ settings, gmailStatus, onUpdateThreshold }) {
  const [thresholdVal, setThresholdVal] = useState(settings?.relevance_threshold || 70);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveThreshold = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onUpdateThreshold(Number(thresholdVal));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Page Title */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
        <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Agent Platform Settings</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Configure multi-agent decision parameters, email integration, and scraping source toggles.
        </p>
      </div>

      {/* Threshold Slider Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Relevance Filter Score Threshold
            </h2>
            <p className="text-xs text-zinc-500">
              Only opportunities scoring at or above this threshold will trigger Gmail notifications and auto-registrations.
            </p>
          </div>
          
          <div className="text-2xl font-bold text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100">
            {thresholdVal}%
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <input
            type="range"
            min="40"
            max="95"
            step="5"
            value={thresholdVal}
            onChange={(e) => setThresholdVal(e.target.value)}
            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
            <span>40% (Lenient)</span>
            <span>70% (Recommended)</span>
            <span>95% (Strict)</span>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between border-t border-zinc-100">
          <div className="text-xs text-zinc-500">
            {savedSuccess && <span className="text-emerald-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Threshold saved!</span>}
          </div>

          <button
            onClick={handleSaveThreshold}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl shadow-xs transition flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Threshold'}
          </button>
        </div>
      </div>

      {/* Gmail OAuth Integration Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              Gmail API Integration (OAuth2)
            </h2>
            <p className="text-xs text-zinc-500">
              Sends alert emails and polls inbox for YES/NO reply commands.
            </p>
          </div>

          <span className={`px-3 py-1 text-xs font-semibold rounded-xl border ${
            gmailStatus?.connected 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
          }`}>
            {gmailStatus?.connected ? 'Connected' : 'Active (Simulation Mode)'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-xs space-y-2">
          <div className="flex items-center gap-2 font-medium text-zinc-800">
            <Info className="w-4 h-4 text-indigo-600" />
            Status: {gmailStatus?.mode}
          </div>
          <p className="text-zinc-600 leading-relaxed">
            Active email account: <span className="font-mono font-semibold text-zinc-900">{gmailStatus?.email_account}</span>.
            You can test email alerts and reply actions directly from the Feed page or connect your Google Cloud Console OAuth keys (`GMAIL_CLIENT_ID`).
          </p>
        </div>
      </div>

      {/* Scraper Source Toggles */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          Active Scraper Sources
        </h2>

        <div className="space-y-3">
          {['Devfolio (Hackathons)', 'Unstop (Competitions & Internships)', 'Internshala (Remote Internships)'].map((src, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
              <span className="font-semibold text-zinc-800">{src}</span>
              <span className="px-2.5 py-0.5 rounded font-mono bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200">
                Enabled
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
