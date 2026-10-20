import React, { useEffect } from 'react';
import { Header } from '../Header';
import { Footer } from '../Footer';
import credits from '../../dropstudio/library/credits.json';
import type { TrackCredit } from '../../dropstudio/track';
import { SafeBadge } from '../dropstudio/controls';

const LIBS: { name: string; license: string; use: string }[] = [
  { name: 'React', license: 'MIT', use: 'User interface' },
  { name: 'three.js', license: 'MIT', use: '3D rendering' },
  { name: 'Zustand', license: 'MIT', use: 'App state' },
  { name: '@tonejs/midi', license: 'MIT', use: 'Reading MIDI files' },
  { name: 'mp4-muxer', license: 'MIT', use: 'Writing MP4 files' },
  { name: 'Mediabunny + AAC encoder', license: 'MPL-2.0', use: 'Reading/verifying MP4 files, AAC fallback encoder' },
  { name: 'idb-keyval', license: 'Apache-2.0', use: 'Saving projects and analysis cache in your browser' },
  { name: 'Lucide icons', license: 'ISC', use: 'Icons' },
];

/** Credits & Licenses: every built-in song (from credits.json) and the open-source software used. */
export const CreditsPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const list = credits as TrackCredit[];
  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">Credits &amp; Licenses</h1>
          <p className="text-slate-400 text-sm">
            Every built-in song is either a public-domain composition (composer died more than 100 years ago, or a traditional tune first published more than 100 years ago) newly sequenced by the BounceForge
            team from the original score, or an original BounceForge melody. All instrument sounds come from BounceForge's own synthesizer — no samples from recordings.
          </p>
        </div>

        <section className="rounded-3xl bg-white/[0.02] border border-white/10 overflow-x-auto">
          <table className="w-full text-xs" data-testid="credits-table">
            <thead className="text-left text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Composer</th>
                <th className="p-3">Died</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-white/5 align-top">
                  <td className="p-3 font-bold text-white">{c.title}</td>
                  <td className="p-3">
                    {c.composer}
                    {c.basis && <div className="text-xs text-slate-500">{c.basis}</div>}
                  </td>
                  <td className="p-3">{c.composerDeathYear ?? '—'}</td>
                  <td className="p-3 space-y-1">
                    <div>{c.status}</div>
                    <SafeBadge />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="text-xs text-slate-400">
          Sequencing: {list[0]?.sequencedBy}. Sound: {list[0]?.soundfont}.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-black text-white">Your own music</h2>
          <p className="text-sm text-slate-300">
            Files you upload are processed only in your browser and are marked "User Provided — your responsibility". You must own the music or have the rights to use it. Copyrighted music may get your
            video claimed or muted on YouTube/TikTok.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-black text-white">Open-source software</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {LIBS.map((l) => (
              <li key={l.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="font-bold text-white">
                  {l.name} <span className="text-xs text-cyan-300 font-mono">{l.license}</span>
                </div>
                <div className="text-xs text-slate-400">{l.use}</div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
};
