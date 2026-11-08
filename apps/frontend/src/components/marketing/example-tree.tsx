// The example family of the "contoh silsilah keluarga" guide: four generations, one row each, couples joined by a
// terracotta dot and children under their own parents (the same look as the landing page's TreePreview).
// The names are plain SVG text, so crawlers and answer engines read the example too.

import type { ExampleTreeFigure } from "@/lib/guides-content";

const W = 150;
const H = 54;
const ROW = [20, 120, 220, 320];

function Card({ name, years, tone, x, y }: { name: string; years: string; tone: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={W} height={H} rx="12" className="fill-card stroke-border" />
      <rect width="4" height={H} rx="2" className={tone} />
      <circle cx="30" cy="27" r="14" className="fill-secondary" />
      <text x="30" y="31" textAnchor="middle" className="fill-secondary-foreground text-[11px] font-semibold">
        {name.slice(0, 1)}
      </text>
      <text x="52" y="24" className="fill-foreground text-[12px] font-semibold">
        {name}
      </text>
      <text x="52" y="40" className="fill-muted-foreground text-[10px]">
        {years}
      </text>
    </g>
  );
}

export function ExampleTree({ figure }: { figure: ExampleTreeFigure }) {
  const male = "fill-node-male";
  const female = "fill-node-female";
  const line = "fill-none stroke-muted-foreground/50";
  return (
    <figure className="overflow-x-auto rounded-2xl border bg-card p-4">
      <svg viewBox="0 0 760 394" role="img" aria-label={figure.label} className="h-auto w-full min-w-[560px]">
        {figure.generations.map(([gen, role], i) => (
          <g key={gen} className="text-[11px]">
            <text x="0" y={ROW[i] + 24} className="fill-foreground font-semibold">
              {gen}
            </text>
            <text x="0" y={ROW[i] + 40} className="fill-muted-foreground">
              {role}
            </text>
          </g>
        ))}
        {/* Generation 1 -> Hasan; generation 2 -> Ahmad and Budi; generation 3 -> Rani and Bayu. */}
        <path d="M415 47 V100 H325 V120" className={line} strokeWidth="1.5" />
        <path d="M415 147 V200 H375 V220 M415 200 H665 V220" className={line} strokeWidth="1.5" />
        <path d="M285 247 V300 H205 V320 M285 300 H385 V320" className={line} strokeWidth="1.5" />
        <path d="M400 47 H430 M400 147 H430 M270 247 H300" className={line} strokeWidth="1.5" />
        <circle cx="415" cy="47" r="5" className="fill-terracotta" />
        <circle cx="415" cy="147" r="5" className="fill-terracotta" />
        <circle cx="285" cy="247" r="5" className="fill-terracotta" />
        <Card name="Kromo Sentono" years="1905–1978" tone={male} x={250} y={ROW[0]} />
        <Card name="Painem" years="1910–1985" tone={female} x={430} y={ROW[0]} />
        <Card name="Hasan" years="1938–2011" tone={male} x={250} y={ROW[1]} />
        <Card name="Siti" years="1942–2019" tone={female} x={430} y={ROW[1]} />
        <Card name="Ahmad" years="1965" tone={male} x={300} y={ROW[2]} />
        <Card name="Dewi" years="1968" tone={female} x={120} y={ROW[2]} />
        <Card name="Budi" years="1966" tone={male} x={590} y={ROW[2]} />
        <Card name="Rani" years="1994" tone={female} x={130} y={ROW[3]} />
        <Card name="Bayu" years="1997" tone={male} x={310} y={ROW[3]} />
      </svg>
      <figcaption className="sr-only">{figure.label}</figcaption>
    </figure>
  );
}
