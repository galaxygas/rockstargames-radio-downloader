import { createFileRoute } from "@tanstack/react-router";
import { Desk } from "@/components/desk";
import { loadCatalog } from "@/lib/radio/catalog.functions";

export const Route = createFileRoute("/")({
  loader: () => loadCatalog(),
  component: Home,
  pendingComponent: Pending,
  pendingMs: 150,
});

function Home() {
  const catalog = Route.useLoaderData();
  return <Desk catalog={catalog} />;
}

function Pending() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4">
      <p className="font-display text-sm tracking-widest text-amber">NIGHT AIRCHECK</p>
      <h1 className="mt-2 font-display text-5xl text-fg">Station Scope</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
        Reading the music page and checking every station master, frame by frame.
      </p>
    </main>
  );
}
