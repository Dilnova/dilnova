"use client";

export default function MetaDomainSetupGuide() {
  return (
    <details className="group rounded-xl border border-blue-200/70 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 overflow-hidden text-xs">
      <summary className="px-3.5 py-2.5 font-semibold text-blue-900 dark:text-blue-300 flex items-center justify-between cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/40 transition-colors select-none">
        <span className="flex items-center gap-2">
          <span>📖</span>
          <span>Step-by-Step Guide: How to Get Your Meta Verification Tokens</span>
        </span>
        <span className="text-[10px] text-blue-500 font-mono group-open:rotate-180 transition-transform duration-200">
          ▼
        </span>
      </summary>
      <div className="p-3.5 pt-2 space-y-2.5 text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-blue-200/50 dark:border-blue-900/40">
        <ol className="list-decimal list-inside space-y-2 leading-relaxed">
          <li>
            Open{" "}
            <a
              href="https://business.facebook.com/settings/owned-domains"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 font-semibold underline inline-flex items-center gap-0.5"
            >
              Meta Business Settings &rarr; Brand Safety &rarr; Domains &UpperRightArrow;
            </a>
          </li>
          <li>
            Click the blue <strong>&quot;Add&quot;</strong> button &rarr; select{" "}
            <strong>&quot;Create a new domain&quot;</strong>.
          </li>
          <li>
            Enter either <code className="font-mono text-[10px]">dilstar.pp.ua</code> or{" "}
            <code className="font-mono text-[10px]">dilnova.pp.ua</code> (without{" "}
            <code className="font-mono text-[10px]">https://</code> or{" "}
            <code className="font-mono text-[10px]">www</code>).
          </li>
          <li>
            Under <em>&quot;Select a verification method&quot;</em>, select:
            <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 font-medium text-zinc-800 dark:text-zinc-200 text-[10px]">
              &quot;Add a meta-tag to your HTML source code&quot;
            </div>
          </li>
          <li>
            Meta will display a code snippet like:
            <div className="mt-1 p-2 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-[10px] border border-zinc-800 overflow-x-auto">
              &lt;meta name=&quot;facebook-domain-verification&quot; content=&quot;
              <span className="text-amber-300 font-bold">abcdef0123456789</span>&quot; /&gt;
            </div>
            Copy either just the token inside{" "}
            <code className="font-mono text-[10px] text-purple-600 dark:text-purple-400">
              content=&quot;...&quot;
            </code>{" "}
            or the whole snippet (it will automatically extract the token).
          </li>
          <li>
            Paste into the respective domain field above (Dilstar or Dilnova) and click{" "}
            <strong>&quot;Save All Settings&quot;</strong> at the bottom of the page.
          </li>
          <li>
            Return to Meta Business Suite and click the green{" "}
            <strong>&quot;Verify domain&quot;</strong> button. Repeat for the second domain if you
            wish to verify both!
          </li>
        </ol>
      </div>
    </details>
  );
}
