'use client';

import React, { useEffect, useState } from 'react';
import { checkServerDetailedStatus } from '@/lib/actions';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Gauge } from 'lucide-react';

interface ServerStatusCardProps {
  name: string;
  url: string;
}

interface ServerStatus {
  online: boolean;
  status: number;
  latency: number;
  message: string;
}

const ServerStatusCard: React.FC<ServerStatusCardProps> = ({ name, url }) => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await checkServerDetailedStatus(url);
        setStatus(result);
      } catch (error) {
        setStatus({
          online: false,
          status: 0,
          latency: 0,
          message: 'Check Failed',
        });
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [url]);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:bg-zinc-900 transition-colors">
      <div className="flex flex-col gap-1">
        <h3 className="text-zinc-100 font-semibold text-lg flex items-center gap-2 capitalize">
          {name}
        </h3>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 text-sm hover:text-indigo-400 transition-colors"
        >
          {url}
        </a>
      </div>

      <div className="flex items-center gap-6">
        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Checking...</span>
          </div>
        ) : status ? (
          <>
            {/* Latency Badge */}
            <div className={`
              px-3 py-1 pb-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border
              ${status.latency < 200
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : status.latency < 500
                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'}
            `}>
              <Gauge className="w-3.5 h-3.5" />
              {status.latency}ms
            </div>

            {/* Status Badge */}
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border
              ${status.online
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'}
            `}>
              {status.online ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Reliable</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Down</span>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">Error</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerStatusCard;
