import React, { useState } from 'react';
import { Sparkles, ExternalLink, Play, CheckCircle2, XCircle, AlertTriangle, Clock, Filter, RefreshCw, Send, Search, X, Calendar, Bell } from 'lucide-react';

export default function FeedPage({ opportunities, threshold, onTriggerDiscovery, onManualAction, loading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const categories = ['All', 'Upcoming Events', 'Internship', 'Hackathon'];
  const statuses = ['All', 'pending_reply', 'yes', 'registered', 'failed', 'manual_intervention', 'skipped'];

  const isUpcomingOpp = (opp) => {
    if (opp.is_upcoming || opp.category === 'Upcoming Event') return true;
    const text = ((opp.title || '') + ' ' + (opp.description || '') + ' ' + (opp.deadline || '')).toLowerCase();
    return text.includes('upcoming') || text.includes('starts on') || text.includes('begins') || text.includes('registration opens') || text.includes('starts in') || text.includes('yet to start') || text.includes('starts:');
  };

  const filteredOpps = opportunities.filter(opp => {
    const upcoming = isUpcomingOpp(opp);
    if (selectedCategory === 'Upcoming Events') {
      if (!upcoming) return false;
    } else if (selectedCategory === 'Internship') {
      if (opp.category !== 'Internship' || upcoming) return false;
    } else if (selectedCategory === 'Hackathon') {
      if (opp.category !== 'Hackathon' || upcoming) return false;
    }

    if (selectedStatus !== 'All' && opp.registration_rel?.status !== selectedStatus) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = opp.title?.toLowerCase().includes(q);
      const descMatch = opp.description?.toLowerCase().includes(q);
      const sourceMatch = opp.source?.toLowerCase().includes(q);
      const categoryMatch = opp.category?.toLowerCase().includes(q);
      const reasonMatch = opp.score_rel?.reason?.toLowerCase().includes(q);
      return titleMatch || descMatch || sourceMatch || categoryMatch || reasonMatch;
    }

    return true;
  });

  const upcomingOpps = filteredOpps.filter(opp => isUpcomingOpp(opp));
  const activeOpps = filteredOpps.filter(opp => !isUpcomingOpp(opp));

  const handleAction = async (oppId, action) => {
    setActionLoadingId(oppId);
    try {
      await onManualAction(oppId, action);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (opp, score) => {
    const status = opp.registration_rel?.status || 'pending_reply';
    if (isUpcomingOpp(opp)) {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> Upcoming Event
        </span>
      );
    }

    switch (status) {
      case 'registered':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Registered</span>;
      case 'yes':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Registering...</span>;
      case 'failed':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Failed (Fix Needed)</span>;
      case 'manual_intervention':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> CAPTCHA Wall</span>;
      case 'skipped':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">Skipped</span>;
      case 'pending_reply':
      default:
        if (score >= threshold) {
          return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Email Alert Sent</span>;
        }
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200">Below Threshold</span>;
    }
  };

  const renderOppCard = (opp, isUpcoming = false) => {
    const score = opp.score_rel?.score || 0;
    const status = opp.registration_rel?.status || 'pending_reply';
    const isProcessing = actionLoadingId === opp.id;

    return (
      <div 
        key={opp.id} 
        className={`bg-white rounded-2xl border p-5 shadow-xs transition space-y-4 ${
          isUpcoming ? 'border-purple-200 hover:border-purple-300 bg-gradient-to-r from-purple-50/20 to-white' : 'border-zinc-200 hover:border-zinc-300'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                {opp.source}
              </span>
              <span className={`px-2.5 py-0.5 text-[11px] font-medium rounded-md border ${
                isUpcoming ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
              }`}>
                {opp.category}
              </span>
              {getStatusBadge(opp, score)}
            </div>

            <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2 mt-1">
              {opp.title}
              <a 
                href={opp.url} 
                target="_blank" 
                rel="noreferrer" 
                className="text-zinc-400 hover:text-indigo-600 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </h2>
          </div>

          {/* Score Pill */}
          <div className={`px-4 py-2 rounded-xl text-center border ${
            score >= threshold 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-zinc-50 text-zinc-600 border-zinc-200'
          }`}>
            <div className="text-xs font-medium uppercase tracking-wider">Match Score</div>
            <div className="text-xl font-bold">{Math.round(score)}%</div>
          </div>
        </div>

        {/* Description & Match Reason */}
        <p className="text-xs text-zinc-600 leading-relaxed">{opp.description}</p>
        
        {opp.score_rel?.reason && (
          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-start gap-2 text-xs text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-indigo-700">Groq Reasoning: </span>
              {opp.score_rel.reason}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            {isUpcoming && opp.start_date && (
              <span className="font-semibold text-purple-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Starts: {opp.start_date}
              </span>
            )}
            <div>Deadline / Registration: <span className="font-medium text-zinc-700">{opp.deadline || 'Open Soon'}</span></div>
          </div>

          <div className="flex items-center gap-2">
            {isUpcoming ? (
              <button
                onClick={() => handleAction(opp.id, 'yes')}
                disabled={isProcessing}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                {isProcessing ? 'Saving...' : 'Pre-Register / Remind Me'}
              </button>
            ) : status === 'pending_reply' ? (
              <>
                <button
                  onClick={() => handleAction(opp.id, 'yes')}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-xs transition"
                >
                  {isProcessing ? 'Processing...' : 'Reply YES (Register)'}
                </button>

                <button
                  onClick={() => handleAction(opp.id, 'skip')}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-lg transition"
                >
                  Decline / Skip
                </button>
              </>
            ) : (status === 'failed' || status === 'manual_intervention') ? (
              <button
                onClick={() => handleAction(opp.id, 'register_now')}
                disabled={isProcessing}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                Retry Playwright Form Fill
              </button>
            ) : null}
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Discovered Opportunities</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Filtered by Groq LLM against candidate profile (Threshold: <span className="font-semibold text-indigo-600">{threshold}%</span> match).
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                    selectedCategory === cat ? 'bg-white text-zinc-900 shadow-xs font-semibold' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {cat === 'Upcoming Events' ? '🗓️ Upcoming Events' : cat}
                </button>
              ))}
            </div>

            {/* Trigger Discovery Button */}
            <button
              onClick={onTriggerDiscovery}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl shadow-xs transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Discovering...' : 'Run Discovery Scraper'}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search opportunities by title, company (Microsoft, Google, Infosys), skills, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50/50 hover:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Opportunities List Container */}
      <div className="space-y-6">
        {filteredOpps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center space-y-2">
            <Filter className="w-8 h-8 text-zinc-300 mx-auto" />
            <h3 className="text-sm font-semibold text-zinc-800">
              {searchQuery ? `No results found for "${searchQuery}"` : 'No opportunities match the selected filter'}
            </h3>
            <p className="text-xs text-zinc-500">
              {searchQuery ? 'Try searching with different keywords like Microsoft, React, or Python.' : 'Try clicking "Run Discovery Scraper" to pull fresh postings.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium rounded-lg transition"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : selectedCategory === 'Upcoming Events' ? (
          /* ONLY Upcoming Events View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-purple-950 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                Upcoming Events & Hackathons (Pre-Registrations) ({upcomingOpps.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {upcomingOpps.map(opp => renderOppCard(opp, true))}
            </div>
          </div>
        ) : (
          /* General View (All / Internship / Hackathon) */
          <>
            {/* Section 1: Upcoming Events (if any match search/filter) */}
            {upcomingOpps.length > 0 && selectedCategory === 'All' && (
              <div className="space-y-4 bg-purple-50/40 p-5 rounded-2xl border border-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-purple-950 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      🗓️ Upcoming Events (Not Started Yet) ({upcomingOpps.length})
                    </h2>
                    <p className="text-xs text-purple-700 mt-0.5">
                      These events and hackathons have not yet started. You can pre-register or save reminders.
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCategory('Upcoming Events')}
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition"
                  >
                    View All Upcoming →
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {upcomingOpps.map(opp => renderOppCard(opp, true))}
                </div>
              </div>
            )}

            {/* Section 2: Active Opportunities */}
            {activeOpps.length > 0 && (
              <div className="space-y-4">
                {upcomingOpps.length > 0 && selectedCategory === 'All' && (
                  <h2 className="text-base font-semibold text-zinc-900 tracking-tight flex items-center gap-2 pt-2">
                    🔥 Active Opportunities & Internships ({activeOpps.length})
                  </h2>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {activeOpps.map(opp => renderOppCard(opp, false))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
