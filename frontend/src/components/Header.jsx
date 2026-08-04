import React from 'react';
import { Cpu, Mail, LogOut, RefreshCw, Key } from 'lucide-react';

export default function Header({ currentUser, credStatus, activeTab, setActiveTab, onRefresh, onLogout }) {
  const tabs = [
    { id: 'feed', label: 'Opportunities Feed' },
    { id: 'profile', label: 'Master Profile & BYOK' },
    { id: 'news', label: 'AI News Feed' },
    { id: 'activity', label: 'Agent Activity & Memory' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            O
          </div>
          <div>
            <div className="font-semibold text-zinc-900 tracking-tight flex items-center gap-2 text-base">
              OpportunityAgent
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                BYOK Multi-User
              </span>
            </div>
            <p className="text-xs text-zinc-500">Discovery & Auto-Registration Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* System Indicators & User Section */}
        <div className="flex items-center gap-3">
          {/* Groq Key Badge */}
          <div 
            onClick={() => setActiveTab('profile')} 
            className="cursor-pointer flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-300 transition"
            title="Groq API Key Connection Status"
          >
            <Key className="w-3.5 h-3.5 text-indigo-600" />
            <span>Groq</span>
            <span className={`w-2 h-2 rounded-full ${credStatus?.groq_connected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
          </div>

          {/* User Email & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 text-xs">
            <span className="font-semibold text-zinc-800 max-w-[120px] truncate">
              {currentUser?.email || 'User'}
            </span>
            <button 
              onClick={onLogout}
              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
