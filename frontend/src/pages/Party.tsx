export default function Party() {
  return (
    <div className="grid grid-cols-[260px_1fr_320px] grid-rows-[1fr_200px] gap-2 p-2 min-h-screen bg-gray-950 text-gray-100">
      <aside className="bg-gray-900 rounded p-2">Objects (Hierarchy)</aside>
      <main className="bg-black rounded row-span-2">Canvas (PixiJS placeholder)</main>
      <section className="bg-gray-900 rounded p-2">Inspector</section>
      <section className="bg-gray-900 rounded p-2 col-span-2">Assets/Console</section>
    </div>
  );
}


