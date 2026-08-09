import React, { useState } from 'react';
import { Activity, Brain, LineChart as ChartIcon, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Wrench, RefreshCw, Clock, XCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function ActivityPage({ logs, failureMemory, rules, metrics, onSubmitFix }) {
  const [selectedFailure, setSelectedFailure] = useState(null);
  const [fixFieldName, setFixFieldName] = useState('phone');
  const [fixFieldValue, setFixFieldValue] = useState('');
  const [submittingFix, setSubmittingFix] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState(new Set());

  // Ensure props are guaranteed arrays to prevent React render crash
  const safeLogs = Array.isArray(logs) ? logs : (Array.isArray(logs?.items) ? logs.items : []);
  const safeFailureMemory = Array.isArray(failureMemory) ? failureMemory : (Array.isArray(failureMemory?.items) ? failureMemory.items : []);
  const safeRules = Array.isArray(rules) ? rules : (Array.isArray(rules?.items) ? rules.items : []);

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
              <span className="text-xs text-zinc-400">{safeFailureMemory.length} site rules</span>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {safeFailureMemory.length === 0 ? (
                <p className="text-xs text-zinc-500 italic p-4 text-center">No registration failures recorded yet.</p>
              ) : (
                safeFailureMemory.map((mem) => (
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
              {safeRules.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No custom rules added yet. System using default mapping.</p>
              ) : (
                safeRules.map((rule) => (
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
            {safeLogs.length === 0 ? (
              <p className="text-xs text-zinc-400 italic p-6 text-center">No execution logs recorded yet.</p>
            ) : (
              safeLogs.map((log) => {
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

                    {/* Expanded Detail Body */}
                    {isExpanded && (
                      <div className="p-4 border-t border-zinc-100 bg-zinc-50/30 space-y-2 text-xs">
                        <div className="font-medium text-zinc-700">Action Details:</div>
                        <p className="text-zinc-600 font-mono text-[11px] leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-zinc-200/60">
                          {log.details}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
