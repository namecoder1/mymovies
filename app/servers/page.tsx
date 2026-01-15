'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from "sonner"
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Gauge,
  RefreshCw,
  Power,
  PowerOff,
  TrendingUp,
  AlertTriangle,
  Server,
  ShieldAlert,
  Plus,
  Trash2,
  FlaskConical,
  Edit,
} from 'lucide-react';
import {
  getStreamProviders,
  updateProviderActive,
  triggerCheckAllProviders,
  triggerCheckSingleProvider,
  getMonitorServiceStatus,
  createStreamProvider,
  updateStreamProvider,
  deleteStreamProvider,
  StreamProvider,
  CreateProviderData,
} from '@/lib/actions';
import { useProfile } from '@/components/ProfileProvider';
import { it } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import CancelDialog from '@/components/CancelDialog';

// Admin profile ID - only this profile can access this page
const ADMIN_PROFILE_ID = 'f0245e82-9cec-4d6c-a6b1-a935b48a13b7';

interface MonitorStatus {
  service: string;
  uptime: number;
  lastCheckAt: string | null;
  nextCheckAt: string | null;
  providers: {
    total: number;
    active: number;
    healthy: number;
  };
}

const FAMILY_OPTIONS = [
  { value: 'path-tmdb', label: 'Path TMDB', example: '/movie/{id}' },
  { value: 'query-tmdb', label: 'Query TMDB', example: '?tmdb={id}' },
  { value: 'path-imdb', label: 'Path IMDB', example: '/movie/{id} (IMDB)' },
  { value: 'videoid-tmdb', label: 'Video ID TMDB', example: '?video_id={id}' },
];

export default function ServersPage() {
  const { currentProfile, isLoading: profileLoading } = useProfile();
  const [providers, setProviders] = useState<StreamProvider[]>([]);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus | null>(null);
  const [monitorOnline, setMonitorOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [checkingProvider, setCheckingProvider] = useState<string | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<StreamProvider | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateProviderData>({
    key: '',
    name: '',
    host: '',
    family: 'path-tmdb',
    movie_path_template: '/movie/{id}',
    tv_path_template: '/tv/{id}/{season}/{episode}',
    priority: 50,
    supports_movies: true,
    supports_tv: true,
    requires_imdb: false,
    supports_resume: false,
    resume_param: '',
    notes: '',
    is_active: true,
  });

  // Check admin access
  const isAdmin = currentProfile?.id === ADMIN_PROFILE_ID;

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [providersData, statusResult] = await Promise.all([
        getStreamProviders(),
        getMonitorServiceStatus(),
      ]);
      setProviders(providersData);
      if (statusResult.success) {
        setMonitorStatus(statusResult.data);
        setMonitorOnline(true);
      } else {
        setMonitorOnline(false);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 2 minutes
    const interval = setInterval(() => loadData(false), 120000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleActive = async (provider: StreamProvider) => {
    startTransition(async () => {
      const result = await updateProviderActive(provider.id, !provider.is_active);
      if (result.success) {
        setProviders((prev) =>
          prev.map((p) =>
            p.id === provider.id ? { ...p, is_active: !p.is_active } : p
          )
        );
      }
    });
  };

  const handleCheckAll = async () => {
    startTransition(async () => {
      const result = await triggerCheckAllProviders();
      if (result.success) {
        // Reload data after check
        await loadData();
      } else {
        alert('Failed to trigger check: ' + result.error);
      }
    });
  };

  const handleCheckSingle = async (provider: StreamProvider) => {
    setCheckingProvider(provider.key);
    try {
      const result = await triggerCheckSingleProvider(provider.key);
      if (result.success) {
        await loadData();
      } else {
        alert('Failed to check provider: ' + result.error);
      }
    } finally {
      setCheckingProvider(null);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      host: '',
      family: 'path-tmdb',
      movie_path_template: '/movie/{id}',
      tv_path_template: '/tv/{id}/{season}/{episode}',
      priority: 50,
      supports_movies: true,
      supports_tv: true,
      requires_imdb: false,
      supports_resume: false,
      resume_param: '',
      notes: '',
      is_active: true,
    });
    setEditingId(null);
  };

  const handleCreateOrUpdateProvider = async () => {
    if (!formData.key || !formData.name || !formData.host) {
      toast.error('Key, Name e Host sono obbligatori');
      return;
    }

    setIsCreating(true);
    try {
      let result;
      if (editingId) {
        result = await updateStreamProvider(editingId, formData);
      } else {
        result = await createStreamProvider(formData);
      }

      if (result.success && result.data) {
        setSheetOpen(false);
        resetForm();

        // Optimistic update
        if (editingId) {
          setProviders(prev => prev.map(p => p.id === editingId ? (result.data as StreamProvider) : p));
        } else {
          setProviders(prev => [...prev, (result.data as StreamProvider)].sort((a, b) => a.priority - b.priority));
        }

        toast.success(editingId ? 'Provider aggiornato con successo' : 'Provider creato con successo');
      } else {
        toast.error('Errore: ' + (result.error || 'Unknown error'));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = (provider: StreamProvider) => {
    setEditingId(provider.id);
    setFormData({
      key: provider.key,
      name: provider.name,
      host: provider.host,
      family: provider.family as any,
      movie_path_template: provider.movie_path_template || '',
      tv_path_template: provider.tv_path_template || '',
      priority: provider.priority,
      supports_movies: provider.supports_movies,
      supports_tv: provider.supports_tv,
      requires_imdb: provider.requires_imdb,
      supports_resume: provider.supports_resume,
      resume_param: provider.resume_param || '',
      notes: provider.notes || '',
      is_active: provider.is_active,
    });
    setSheetOpen(true);
  };

  const handleDeleteClick = (provider: StreamProvider) => {
    setDeletingProvider(provider);
  };

  const confirmDeleteProvider = async () => {
    if (!deletingProvider) return;

    setIsDeleting(true);
    try {
      const result = await deleteStreamProvider(deletingProvider.id);
      if (result.success) {
        setProviders((prev) => prev.filter((p) => p.id !== deletingProvider.id));
        setDeletingProvider(null);
        toast.success('Provider eliminato con successo');
      } else {
        toast.error('Errore: ' + result.error);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Show loading while checking profile
  if (profileLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-24 px-4 pb-20">
        <div className="container mx-auto max-w-5xl flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      </main>
    );
  }

  // Access denied for non-admin users
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-24 px-4 pb-20">
        <div className="container mx-auto max-w-5xl flex flex-col items-center justify-center py-20">
          <div className="p-4 bg-red-500/10 rounded-full mb-6">
            <ShieldAlert className="w-16 h-16 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Accesso Negato</h1>
          <p className="text-zinc-400 text-center max-w-md mb-6">
            Non hai i permessi per accedere a questa pagina.
            Solo gli amministratori possono gestire i provider di streaming.
          </p>
          <Button
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-medium transition-colors"
            asChild
          >
            <Link href="/">
              Torna alla Home
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 pt-24 px-4 pb-20">
        <div className="container mx-auto max-w-5xl flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      </main>
    );
  }

  const activeProviders = providers.filter((p) => p.is_active);
  const healthyProviders = providers.filter((p) => p.is_active && p.is_healthy);

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 px-4 pb-20">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <Activity className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">Provider Admin</h1>
              <p className="text-zinc-400 mt-1">
                Gestisci e monitora i provider di streaming
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setSheetOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Aggiungi
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
            >
              <Link href="/servers/test">
                <FlaskConical className="w-4 h-4" />
                Prova
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleCheckAll}
              disabled={isPending || !monitorOnline}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Controlla
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-2xl font-bold text-zinc-100">{providers.length}</div>
            <div className="text-sm text-zinc-400">Totali</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-2xl font-bold text-indigo-400">{activeProviders.length}</div>
            <div className="text-sm text-zinc-400">Attivi</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="text-2xl font-bold text-emerald-400">{healthyProviders.length}</div>
            <div className="text-sm text-zinc-400">Sani</div>
          </div>
        </div>

        {/* Provider List */}
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={`p-4 rounded-xl border transition-all ${provider.is_active
                ? 'bg-zinc-900/50 border-zinc-800'
                : 'bg-zinc-900/20 border-zinc-800/50 opacity-60'
                }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="contents">
                  {/* Left: Info */}
                  <div className="flex items-start gap-4 w-full sm:w-auto">
                    {/* Active Toggle */}
                    <button
                      onClick={() => handleToggleActive(provider)}
                      disabled={isPending}
                      className={`p-2 rounded-lg transition-colors shrink-0 ${provider.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                        }`}
                      title={provider.is_active ? 'Disabilita' : 'Abilita'}
                    >
                      {provider.is_active ? (
                        <Power className="w-4 h-4" />
                      ) : (
                        <PowerOff className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-zinc-100 truncate mr-1">
                          {provider.name}
                        </h3>
                        <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded whitespace-nowrap">
                          #{provider.priority}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-zinc-800/50 text-zinc-500 rounded font-mono whitespace-nowrap">
                          {provider.family}
                        </span>
                      </div>
                      <a
                        href={provider.host}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-zinc-500 hover:text-indigo-400 transition-colors truncate block max-w-[200px] sm:max-w-xs"
                      >
                        {provider.host}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex flex-col items-start sm:items-end gap-3 w-full sm:w-auto">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Response Time */}
                    {provider.response_time_ms !== null && (
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border ${provider.response_time_ms < 500
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : provider.response_time_ms < 1500
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                      >
                        <Gauge className="w-3.5 h-3.5" />
                        {provider.response_time_ms}ms
                      </div>
                    )}

                    {/* Success Rate */}
                    {provider.success_rate_24h !== null && (
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border ${provider.success_rate_24h >= 90
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : provider.success_rate_24h >= 50
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        {provider.success_rate_24h.toFixed(0)}%
                      </div>
                    )}

                    {/* Failures Badge */}
                    {provider.consecutive_failures > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {provider.consecutive_failures}
                      </div>
                    )}

                    {/* Health Status */}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border ${provider.is_healthy
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                    >
                      {provider.is_healthy ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Sano</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>Down</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className='flex items-center'>
                    {/* Check Button */}
                    <button
                      onClick={() => handleCheckSingle(provider)}
                      disabled={checkingProvider === provider.key || !monitorOnline}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Controlla ora"
                    >
                      {checkingProvider === provider.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEditClick(provider)}
                      className="p-2 bg-zinc-800 hover:bg-indigo-600 text-zinc-400 hover:text-white transition-colors"
                      title="Modifica provider"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteClick(provider)}
                      className="p-2 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white transition-colors"
                      title="Elimina provider"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom row: Last check info & failure reason */}
              {(provider.last_check_at || provider.last_failure_reason) && (
                <div className="mt-4 sm:mt-3 pt-3 border-t border-zinc-800/50 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs text-zinc-500">
                  {provider.last_check_at && (
                    <span>Ultimo controllo: {formatDistanceToNow(new Date(provider.last_check_at as string), { addSuffix: true, locale: it })}</span>
                  )}
                  {provider.last_success_at && (
                    <span>Ultimo successo: {formatDistanceToNow(new Date(provider.last_success_at as string), { addSuffix: true, locale: it })}</span>
                  )}
                  {provider.last_failure_reason && (
                    <span className="text-red-400/70">
                      Reason: {provider.last_failure_reason}
                    </span>
                  )}
                  {provider.notes && (
                    <span className="text-zinc-400 italic sm:ml-auto w-full sm:w-auto text-left sm:text-right">{provider.notes}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty state */}
        {providers.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No providers found in database</p>
            <p className="text-sm mt-1">Run the SQL migration to seed initial providers</p>
          </div>
        )}
      </div>

      {/* Add Provider Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg bg-zinc-950 border-zinc-800 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-zinc-100">{editingId ? 'Modifica Provider' : 'Aggiungi Provider'}</SheetTitle>
            <SheetDescription className="text-zinc-400">
              {editingId ? 'Modifica i dati del provider esistente' : 'Inserisci i dati del nuovo provider di streaming'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6 px-4">
            {/* Key */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Key <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s/g, '') })}
                placeholder="es: vixsrc, vidsrcCc"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              <p className="text-xs text-zinc-500 mt-1">Identificatore univoco, senza spazi</p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Nome <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="es: VixSrc, VidSrc.cc"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>

            {/* Host */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Host URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
            </div>

            {/* Family */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Tipo URL
              </label>
              <select
                value={formData.family}
                onChange={(e) => setFormData({ ...formData, family: e.target.value as CreateProviderData['family'] })}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                {FAMILY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.example}
                  </option>
                ))}
              </select>
            </div>

            {/* Movie Path Template */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Template Film
              </label>
              <input
                type="text"
                value={formData.movie_path_template || ''}
                onChange={(e) => setFormData({ ...formData, movie_path_template: e.target.value })}
                placeholder="/movie/{id}"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1">Usa {'{id}'} per TMDB/IMDB ID</p>
            </div>

            {/* TV Path Template */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Template Serie TV
              </label>
              <input
                type="text"
                value={formData.tv_path_template || ''}
                onChange={(e) => setFormData({ ...formData, tv_path_template: e.target.value })}
                placeholder="/tv/{id}/{season}/{episode}"
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono text-sm"
              />
              <p className="text-xs text-zinc-500 mt-1">Usa {'{id}'}, {'{season}'}, {'{episode}'}</p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Priorità
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 50 })}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              <p className="text-xs text-zinc-500 mt-1">1 = più alta priorità, 100 = più bassa</p>
            </div>

            {/* Capabilities */}
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.supports_movies}
                  onChange={(e) => setFormData({ ...formData, supports_movies: e.target.checked })}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-red-500 focus:ring-red-500/50"
                />
                Supporta Film
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.supports_tv}
                  onChange={(e) => setFormData({ ...formData, supports_tv: e.target.checked })}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-red-500 focus:ring-red-500/50"
                />
                Supporta Serie TV
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_imdb}
                  onChange={(e) => setFormData({ ...formData, requires_imdb: e.target.checked })}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-red-500 focus:ring-red-500/50"
                />
                Richiede IMDB ID
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-red-500 focus:ring-red-500/50"
                />
                Attivo
              </label>
            </div>

            {/* Resume Support */}
            <div className="space-y-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.supports_resume}
                  onChange={(e) => setFormData({ ...formData, supports_resume: e.target.checked })}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-red-500 focus:ring-red-500/50"
                />
                Supporta Resume (riprendi da timestamp)
              </label>
              {formData.supports_resume && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Parametro URL per timestamp
                  </label>
                  <input
                    type="text"
                    value={formData.resume_param || ''}
                    onChange={(e) => setFormData({ ...formData, resume_param: e.target.value })}
                    placeholder="es: t, start, time"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm font-mono"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Parametro usato nell'URL (es: ?t=120 per riprendere a 2 min)</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Note
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Note opzionali sul provider..."
                rows={2}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
              />
            </div>
          </div>

          <SheetFooter className="border-t flex flex-row items-center gap-2 border-zinc-800">
            <SheetClose asChild>
              <Button
                className="px-4 flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
              >
                Annulla
              </Button>
            </SheetClose>
            <Button
              onClick={handleCreateOrUpdateProvider}
              disabled={isCreating || !formData.key || !formData.name || !formData.host}
              className="px-4 py-2 flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editingId ? 'Salvataggio...' : 'Creazione...'}
                </>
              ) : (
                <>
                  {editingId ? <RefreshCw className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Salva Modifiche' : 'Crea Provider'}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <CancelDialog
        open={!!deletingProvider}
        onOpenChange={(open) => !open && setDeletingProvider(null)}
        title="Elimina Provider"
        description={`Sei sicuro di voler eliminare il provider "${deletingProvider?.name}"? Questa azione non può essere annullata.`}
        cancelText="Annulla"
        confirmText="Elimina"
        onConfirm={confirmDeleteProvider}
        isPending={isDeleting}
      />
    </main>
  );
}