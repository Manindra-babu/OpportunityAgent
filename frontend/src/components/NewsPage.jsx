import React from 'react';
import { Rss, ExternalLink, RefreshCw, Newspaper, Calendar } from 'lucide-react';

export default function NewsPage({ news, onRefresh, loading }) {
  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-indigo-600" />
            AI & Engineering News Feed
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Aggregated real-time RSS feeds from Hacker News AI, ArXiv Research, and TechCrunch.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl shadow-xs transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Fetching RSS...' : 'Refresh RSS Feeds'}
        </button>
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {news.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl border border-zinc-200 p-12 text-center">
            <Rss className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-800">No news articles fetched yet</h3>
            <p className="text-xs text-zinc-500 mt-1">Click Refresh RSS Feeds above to fetch the latest AI updates.</p>
          </div>
        ) : (
          news.map((item) => (
            <div 
              key={item.id}
              className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs hover:border-indigo-200 transition space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 font-semibold text-[10px] rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                    {item.source}
                  </span>
                  <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3 h-3" />
                    {item.published_at || 'Recently'}
                  </span>
                </div>

                <h2 className="text-sm font-semibold text-zinc-900 leading-snug hover:text-indigo-600 transition">
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                </h2>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="text-zinc-400 text-[11px]">Source: {item.source}</span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  Read Article <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
