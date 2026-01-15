'use client';

import { useProfile } from '@/components/ProfileProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';

const ADMIN_PROFILE_ID = 'f0245e82-9cec-4d6c-a6b1-a935b48a13b7';


export default function TestServer() {
  const { currentProfile, isLoading: profileLoading } = useProfile();
  const [tmdbId, setTmdbId] = useState('550'); // Default: Fight Club
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [startTime, setStartTime] = useState(0);

  // Provider Config State
  const [host, setHost] = useState('https://vidlink.pro');
  const [movieTemplate, setMovieTemplate] = useState('/movie/{id}');
  const [tvTemplate, setTvTemplate] = useState('/tv/{id}/{season}/{episode}');
  const [resumeParam, setResumeParam] = useState('startAt');

  // Output State
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');

  const isAdmin = currentProfile?.id === ADMIN_PROFILE_ID;


  // Generate URL whenever inputs change
  useEffect(() => {
    let url = '';
    const baseUrl = host.replace(/\/$/, ''); // Remove trailing slash

    if (mediaType === 'movie') {
      let path = movieTemplate
        .replace('{id}', tmdbId);

      // Handle query templates that might get double slashes if not careful, 
      // but usually templates start with / or ?
      if (!path.startsWith('/') && !path.startsWith('?')) {
        path = '/' + path;
      }

      url = baseUrl + path;

    } else {
      let path = tvTemplate
        .replace('{id}', tmdbId)
        .replace('{season}', String(season))
        .replace('{episode}', String(episode));

      if (!path.startsWith('/') && !path.startsWith('?')) {
        path = '/' + path;
      }

      url = baseUrl + path;
    }

    // Add Resume Param
    if (startTime > 0 && resumeParam) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}${resumeParam}=${startTime}`;
    }

    setGeneratedUrl(url);
  }, [tmdbId, mediaType, season, episode, startTime, host, movieTemplate, tvTemplate, resumeParam]);

  const handleLoad = () => {
    setIframeSrc(generatedUrl);
};

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
            Solo gli amministratori possono testare i provider di streaming.
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

  return (
    <div className=" text-white p-6 grid grid-cols-1 lg:grid-cols-4 gap-4">

      <div className="lg:col-span-1 space-y-4">
        <Card className="">
          <CardHeader className="text-lg font-semibold flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs">1</span>
              Contenuto
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <Tabs value={mediaType} onValueChange={(val) => setMediaType(val as 'movie' | 'tv')} className='w-full'>
                <TabsList className='w-full'>
                  <TabsTrigger value="movie" className='w-1/2'>Movie</TabsTrigger>
                  <TabsTrigger value="tv" className='w-1/2'>TV Show</TabsTrigger>
                </TabsList>
                <TabsContent value="movie" className='space-y-2'>
                  <div className="space-y-2">
                    <Label htmlFor='tmdbId' className="text-xs text-gray-400 uppercase">TMDB ID</Label>
                    <Input
                      id='tmdbId'
                      type="text"
                      value={tmdbId}
                      onChange={(e) => setTmdbId(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor='startTime' className="text-xs text-gray-400 uppercase">Start Time (sec)</Label>
                    <Input
                      id='startTime'
                      type="number"
                      value={startTime}
                      onChange={(e) => setStartTime(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex gap-2 text-xs">
                      <Button size="xs" variant="outline" onClick={() => setStartTime(0)}>0s</Button>
                      <Button size="xs" variant="outline" onClick={() => setStartTime(120)}>2m</Button>
                      <Button size="xs" variant="outline" onClick={() => setStartTime(600)}>10m</Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="tv" className='space-y-2'>
                  <div className="space-y-2">
                    <Label htmlFor='tmdbId' className="text-xs text-gray-400 uppercase">TMDB ID</Label>
                    <Input
                      id='tmdbId'
                      type="text"
                      value={tmdbId}
                      onChange={(e) => setTmdbId(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor='season' className="text-xs text-gray-400 uppercase">Season</Label>
                      <Input
                        id='season'
                        type="number"
                        value={season}
                        onChange={(e) => setSeason(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor='episode' className="text-xs text-gray-400 uppercase">Episode</Label>
                      <Input
                        id='episode'
                        type="number"
                        value={episode}
                        onChange={(e) => setEpisode(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor='startTime' className="text-xs text-gray-400 uppercase">Start Time (sec)</Label>
                    <Input
                      id='startTime'
                      type="number"
                      value={startTime}
                      onChange={(e) => setStartTime(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex gap-2 text-xs">
                      <Button size="xs" variant="outline" onClick={() => setStartTime(0)}>0s</Button>
                      <Button size="xs" variant="outline" onClick={() => setStartTime(120)}>2m</Button>
                      <Button size="xs" variant="outline" onClick={() => setStartTime(600)}>10m</Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-lg font-semibold flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs">2</span>
              Provider
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            <div className="space-y-2">
              <Label htmlFor='host' className="text-xs text-gray-400 uppercase">Host URL</Label>
              <Input
                id='host'
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full"
                placeholder="https://vidlink.pro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor='movieTemplate' className="text-xs text-gray-400 uppercase">Movie Template</Label>
              <Input
                id='movieTemplate'
                type="text"
                value={movieTemplate}
                onChange={(e) => setMovieTemplate(e.target.value)}
                className="w-full"
              />
              <p className="text-[10px] text-gray-500">Use {'{id}'} placeholder</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor='tvTemplate' className="text-xs text-gray-400 uppercase">TV Template</Label>
              <Input
                id='tvTemplate'
                type="text"
                value={tvTemplate}
                onChange={(e) => setTvTemplate(e.target.value)}
                className="w-full"
              />
              <p className="text-[10px] text-gray-500">Use {'{id}'}, {'{season}'}, {'{episode}'}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor='resumeParam' className="text-xs text-gray-400 uppercase">Resume Param Key</Label>
              <Input
                id='resumeParam'
                type="text"
                value={resumeParam}
                onChange={(e) => setResumeParam(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg" className='w-fit' asChild>
            <Link href="/servers">Back</Link>
          </Button>
          <Button
            variant="default"
            size="lg"
            className='flex-1'
            onClick={handleLoad}
          >
            Carica
          </Button>
        </div>
      </div>

      <div className="lg:col-span-3 flex flex-col h-[55vh] lg:h-[85vh] gap-4">
        <Card className="flex flex-row items-center gap-2 py-2 px-2">
          <code className="flex-1 bg-black/30 py-2 px-3 rounded-lg text-xs sm:text-sm font-mono text-white break-all select-all">
            {generatedUrl}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(generatedUrl, "_blank")}
          >
            Open New Tab
          </Button>
        </Card>

        {/* Iframe Container */}
        <div className="flex-1 bg-black rounded-2xl overflow-hidden shadow-2xl border border-border relative group">
          {iframeSrc ? (
            <iframe
              src={iframeSrc}
              className="w-full h-full border-none"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 opacity-20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
              <p>Clicca 'Carica' per testare</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}