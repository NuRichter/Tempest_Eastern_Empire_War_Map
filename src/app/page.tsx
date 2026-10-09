import { AppShell } from '@/components/AppShell';

import { SITE_DESCRIPTION } from './site';

export default function Page() {
  return (
    <>
      {/* Server-rendered summary for screen readers and search engines (the map itself is drawn in the browser). */}
      <section className="sr-only" aria-label="About this map">
        <h2>Tensura War Map: Tempest vs the Eastern Empire</h2>
        <p>{SITE_DESCRIPTION}</p>
        <p>
          Follow the Eastern Empire invasion arc of That Time I Got Reincarnated as a Slime (Tensei Shitara Slime Datta Ken), light novel
          volumes 12 to 16, day by day: territories, army sizes and movements, the battles at the Dwargon front and the Labyrinth, casualties
          and the people involved, with sources and every reconstruction labelled. Available in 30 languages. Fan-made, not official Tensura
          material.
        </p>
      </section>
      <AppShell />
    </>
  );
}
