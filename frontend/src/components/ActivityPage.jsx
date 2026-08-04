import React, { useState } from 'react';
import { Activity, Brain, LineChart as ChartIcon, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Wrench, RefreshCw, Clock, XCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function ActivityPage({ logs, failureMemory, rules, metrics, onSubmitFix }) {
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [fixFieldName, setFixFieldName] = useState('phone');
  const [fixFieldValue, setFixFieldValue] = useState('');
  const [submittingFix, setSubmittingFix] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState(new Set());

  const toggleLogExpand = (id) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleFixSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFailure || !fixFieldValue) return;
    setSubmittingFix(true);
    try {
      await onSubmitFix({
        opportunity_id: 1,
        field_name: fixFieldName,
        field_value: fixFieldValue,
        remember_rule: true
      });
      setSelectedFailure(null);
      setFixFieldValue('');
    } finally {
      setSubmittingFix(false);
    }
  };

  const getStatusPill = (action, details) => {
    const text = (action + " " + details).toLowerCase();
    if (text.includes("success") || text.includes("registered") || text.includes("merged")) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Registered / Success
        </span>
      );
    }
    if (text.includes("failed") || text.includes("error")) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    }
    if (text.includes("captcha") || text.includes("otp") || text.includes("manual")) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Action Needed
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
        <Clock className="w-3 h-3" /> In Progress
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            Agent Activity & Registration Log
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Click on any item below to expand detailed agent actions, status logs, and Playwright auto-fill steps.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 text-indigo-900 font-semibold">
            Auto-Success Rate: {metrics?.learning_timeline?.[4]?.auto_success_rate || 85}%
          </div>
        </div>
      </div>

      {/* Self-Healing Learning Curve Chart Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <ChartIcon className="w-4 h-4 text-indigo-600" />
              Manual Intervention Rate vs Auto-Success Rate (% Over Time)
            </h2>
            <p className="text-xs text-zinc-500">
              Demonstrates the system learning from field mapping corrections over repeated execution iterations.
            </p>
          </div>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics?.learning_timeline || []}>
              <defs>
                <linearGradient id="colorAuto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorManual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
              <XAxis dataKey="run" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717A' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#71717A' }} unit="%" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E4E4E7', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="auto_success_rate" name="Auto Success Rate" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorAuto)" />
              <Area type="monotone" dataKey="manual_intervention_rate" name="Manual Intervention Needed" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorManual)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: Failure Memory & Field Mapping Rules */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-600" />
                Failure Memory Store (Known Site Quirks)
              </h2>
              <span className="text-xs text-zinc-400">{failureMemory?.length || 0} site rules</span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {failureMemory?.length === 0 ? (
                <p className="text-xs text-zinc-500 italic p-4 text-center">No registration failures recorded yet.</p>
              ) : (
                failureMemory?.map((mem) => (
                  <div key={mem.id} className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-zinc-900">{mem.domain}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] uppercase font-mono">
                        {mem.failure_type}
                      </span>
                    </div>

                    <p className="text-zinc-600">{mem.description}</p>
                    
                    <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-emerald-700">Resolution: {mem.resolution}</span>
                      <button
                        onClick={() => setSelectedFailure(mem)}
                        className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-700 font-medium text-[11px] transition flex items-center gap-1"
                      >
                        <Wrench className="w-3 h-3 text-indigo-600" />
                        Apply Fix
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Persisted Field Mapping Rules */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Learned Field-Mapping Rules</h2>
            <div className="space-y-2">
              {rules?.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No custom rules added yet. System using default mapping.</p>
              ) : (
                rules?.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
                    <div>
                      <span className="font-mono text-indigo-600 font-medium">{rule.source_label}</span>
                      <span className="text-zinc-400 mx-1.5">→</span>
                      <span className="font-mono text-zinc-800">{rule.target_profile_field}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">{rule.domain || 'Global'}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Clean Accordion Activity Log */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Live Execution Log
            </h2>
            <span className="text-[11px] text-zinc-400">Click item to expand details</span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {logs?.length === 0 ? (
              <p className="text-xs text-zinc-400 italic p-6 text-center">No execution logs recorded yet.</p>
            ) : (
              logs?.map((log) => {
                const isExpanded = expandedLogIds.has(log.id);

                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-zinc-200 bg-white hover:border-indigo-200 transition overflow-hidden shadow-2xs"
                  >
                    {/* Collapsed Header */}
                    <div
                      onClick={() => toggleLogExpand(log.id)}
                      className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none bg-zinc-50/50 hover:bg-zinc-100/60 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}

                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px] shrink-0">
                          {log.agent_name}
                        </span>

                        <span className="text-xs font-semibold text-zinc-900 truncate">
                          {log.action}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {getStatusPill(log.action, log.details)}
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Details Body */}
                    {isExpanded && (
                      <div className="p-4 border-t border-zinc-100 bg-white text-xs space-y-2">
                        <div className="font-semibold text-zinc-700 text-[11px] uppercase tracking-wider">
                          Execution Details & Log Output
                        </div>
                        <p className="text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-lg border border-zinc-100 font-mono text-[11px]">
                          {log.details}
                        </p>
                        <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1">
                          <span>Timestamp: {new Date(log.timestamp).toLocaleString()}</span>
                          <span>Agent: {log.agent_name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* User Fix Modal */}
      {selectedFailure && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900">Apply Form Field Fix</h3>
              <button 
                onClick={() => setSelectedFailure(null)} 
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              Provide corrected input value for <span className="font-semibold text-indigo-600">{selectedFailure.domain}</span>. This fix will be persisted in Failure Memory and applied to future registrations.
            </p>

            <form onSubmit={handleFixSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-700">Target Profile Field</label>
                <select
                  value={fixFieldName}
                  onChange={(e) => setFixFieldName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="phone">Contact / Phone Number</option>
                  <option value="github_username">GitHub Username</option>
                  <option value="cgpa">CGPA / Marks</option>
                  <option value="full_name">Full Candidate Name</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-700">Correction Value</label>
                <input
                  type="text"
                  placeholder="e.g. +1 (555) 019-2834"
                  value={fixFieldValue}
                  onChange={(e) => setFixFieldValue(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFailure(null)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!fixFieldValue || submittingFix}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  {submittingFix && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {submittingFix ? 'Saving Fix...' : 'Save & Re-attempt Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
