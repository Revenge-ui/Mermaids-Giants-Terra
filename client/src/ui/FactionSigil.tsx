/** Original vector insignia: tidal crown and tectonic monolith, no external art. */
export function FactionSigil({ faction }: { faction: string }) {
  return <svg className={`faction-sigil ${faction.toLowerCase()}`} viewBox="0 0 180 210" fill="none" aria-hidden="true">
    <path d="M90 8 163 48v93l-73 60-73-60V48Z" stroke="currentColor" opacity=".45" />
    <path d="M90 20 152 55v80l-62 52-62-52V55Z" fill="currentColor" opacity=".06" />
    {faction === "MERMAID" ? <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M90 42v113M62 60l-9 32 22-9M118 60l9 32-22-9M54 91q36 55 72 0M90 42l-9 17 9-6 9 6Z" /><path d="M42 128q16-16 32 0t32 0 32 0M49 143q13-12 27 0t27 0 27 0" /><circle cx="90" cy="165" r="4" /></g> : faction === "GIANT" ? <g stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"><path d="m38 130 27-59 18 24 18-46 42 81ZM65 71l5 42 13-18M101 49l6 51 36 30M43 144h94M55 154h70M80 164h20" /><path d="m95 105-12 17 10 7-7 17" /></g> : <g stroke="currentColor" strokeWidth="2"><circle cx="90" cy="103" r="42" /><path d="m90 45 16 40 37 18-37 16-16 41-16-41-37-16 37-18Z" /><circle cx="90" cy="103" r="12" /></g>}
    <path d="M17 48h20M143 48h20M17 141h16M147 141h16" stroke="currentColor" />
  </svg>;
}
