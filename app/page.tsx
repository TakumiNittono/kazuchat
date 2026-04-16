import Link from "next/link";

const FEATURES = [
  {
    title: "Ask anything, in plain English",
    body: "Grammar, vocab, kanji readings, nuance — the tutor handles it all.",
  },
  {
    title: "Real example sentences",
    body: "Every answer comes with usable examples, romaji, and meaning.",
  },
  {
    title: "Works on your phone",
    body: "Install to your home screen and it feels like a native app.",
  },
];

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-between px-6 py-10 safe-top safe-bottom">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-10 mt-6">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt="Nihongo Tutor"
            width={72}
            height={72}
            className="w-[72px] h-[72px] rounded-2xl shadow-lg shadow-sky-500/30"
          />
          <h1 className="text-3xl font-semibold tracking-tight">
            Nihongo Tutor
          </h1>
          <p className="text-slate-500 text-base leading-relaxed">
            A friendly AI Japanese teacher. Ask any question about Japanese and
            get a clear, kind answer.
          </p>
        </div>

        <ul className="w-full flex flex-col gap-3 text-left">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <p className="font-medium text-slate-900">{f.title}</p>
              <p className="text-sm text-slate-500 mt-0.5">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full max-w-md mt-10">
        <Link
          href="/chat"
          className="block w-full text-center rounded-2xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 transition-colors text-white font-medium py-4 text-base shadow-lg shadow-sky-500/30"
        >
          Start learning
        </Link>
        <p className="text-xs text-slate-400 text-center mt-3">
          No sign-up. Works in your browser.
        </p>
      </div>
    </main>
  );
}
