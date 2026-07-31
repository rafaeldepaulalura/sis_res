import { useId } from 'react';

// Gráficos em SVG puro — sem biblioteca externa, para não pesar o bundle do
// PDV (que roda em tablet velho no salão). Todos escalam pelo viewBox.

const W = 600;
const H = 220;
const PAD = { top: 12, right: 10, bottom: 24, left: 46 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export interface Point {
  label: string;
  value: number;
}

// Topo "redondo" do eixo Y (1.200 em vez de 1.187) e os valores das linhas.
// `integer` força passo mínimo de 1: contagem de pedidos não tem meio pedido,
// e passos fracionários apareciam arredondados e repetidos ("0 1 1 2 2").
function ticks(max: number, integer = false, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  let step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  if (integer) step = Math.max(1, Math.round(step));
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function Grid({ values }: { values: number[] }) {
  const max = values[values.length - 1];
  return (
    <g>
      {values.map((v) => {
        const y = PAD.top + PLOT_H - (v / max) * PLOT_H;
        return (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-gray-200"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-gray-400 text-[11px]"
            >
              {compact(v)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// Rótulos do eixo X sem sobrepor: mostra 1 a cada N.
function xLabels(points: Point[], every: number) {
  return points.map((p, i) => ({ ...p, show: i % every === 0 }));
}

interface SeriesProps {
  points: Point[];
  // Cor da série (classe Tailwind de texto; o SVG usa currentColor).
  colorClass?: string;
  labelEvery?: number;
  empty?: string;
  // Série de contagem (pedidos): eixo Y só com números inteiros.
  integer?: boolean;
}

// Linha com área preenchida — vendas ao longo do dia.
export function AreaChart({
  points,
  colorClass = 'text-emerald-500',
  labelEvery = 2,
  empty = 'Sem dados no período.',
  integer = false,
}: SeriesProps) {
  // Id único por instância: dois gráficos na mesma página não podem
  // disputar o mesmo <linearGradient id>.
  const gradientId = useId();
  const max = Math.max(...points.map((p) => p.value), 0);
  if (!points.length || max === 0) return <EmptyChart message={empty} />;

  const t = ticks(max, integer);
  const top = t[t.length - 1];
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? PLOT_W / 2 : (i / (points.length - 1)) * PLOT_W);
  const y = (v: number) => PAD.top + PLOT_H - (v / top) * PLOT_H;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${PAD.top + PLOT_H} L${x(0)},${
    PAD.top + PLOT_H
  } Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Grid values={t} />
      <g className={colorClass}>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) =>
          p.value > 0 ? (
            <circle key={p.label} cx={x(i)} cy={y(p.value)} r={3} fill="currentColor" />
          ) : null,
        )}
      </g>
      {xLabels(points, labelEvery).map((p, i) =>
        p.show ? (
          <text
            key={p.label}
            x={x(i)}
            y={H - 6}
            textAnchor="middle"
            className="fill-gray-400 text-[11px]"
          >
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

// Barras — vendas por dia da semana.
export function BarChart({
  points,
  colorClass = 'text-emerald-500',
  empty = 'Sem dados no período.',
  integer = false,
}: SeriesProps) {
  const max = Math.max(...points.map((p) => p.value), 0);
  if (!points.length || max === 0) return <EmptyChart message={empty} />;

  const t = ticks(max, integer);
  const top = t[t.length - 1];
  const slot = PLOT_W / points.length;
  const barW = Math.min(slot * 0.55, 44);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img">
      <Grid values={t} />
      <g className={colorClass}>
        {points.map((p, i) => {
          const h = (p.value / top) * PLOT_H;
          const cx = PAD.left + slot * i + slot / 2;
          return (
            <rect
              key={p.label}
              x={cx - barW / 2}
              y={PAD.top + PLOT_H - h}
              width={barW}
              height={Math.max(h, p.value > 0 ? 2 : 0)}
              rx={4}
              fill="currentColor"
            />
          );
        })}
      </g>
      {points.map((p, i) => (
        <text
          key={p.label}
          x={PAD.left + slot * i + slot / 2}
          y={H - 6}
          textAnchor="middle"
          className="fill-gray-400 text-[11px]"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}

// Rosca — participação de cada forma de pagamento.
export function DonutChart({
  slices,
}: {
  slices: { label: string; percent: number; colorClass: string }[];
}) {
  const R = 60;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <svg viewBox="0 0 160 160" className="h-36 w-36 shrink-0" role="img">
      <g transform="rotate(-90 80 80)">
        <circle
          cx={80}
          cy={80}
          r={R}
          fill="none"
          stroke="currentColor"
          className="text-gray-100"
          strokeWidth={20}
        />
        {slices.map((s) => {
          const len = (s.percent / 100) * C;
          const dash = `${len} ${C - len}`;
          const offset = -(acc / 100) * C;
          acc += s.percent;
          return (
            <circle
              key={s.label}
              cx={80}
              cy={80}
              r={R}
              fill="none"
              stroke="currentColor"
              className={s.colorClass}
              strokeWidth={20}
              strokeDasharray={dash}
              strokeDashoffset={offset}
            />
          );
        })}
      </g>
    </svg>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-gray-400">
      {message}
    </div>
  );
}
