export function Placeholder({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-zinc-50 dark:bg-black">
      <h1 className="text-2xl font-bold text-black dark:text-white">{title}</h1>
      <p className="text-zinc-500">Coming in Phase {phase}</p>
    </div>
  );
}
