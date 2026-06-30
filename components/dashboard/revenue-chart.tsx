import { formatMoney } from "@/lib/utils/format";

/**
 * Lightweight, dependency-free SVG bar chart of cash collected per month.
 * Server-rendered; readable without JS. A data table is provided for a11y.
 */
export function RevenueChart({
  data,
  currencySymbol,
}: {
  data: { label: string; ym: string; amount: number }[];
  currencySymbol: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  const width = 560;
  const height = 200;
  const padX = 16;
  const padBottom = 28;
  const padTop = 12;
  const slot = (width - padX * 2) / data.length;
  const barW = Math.min(48, slot * 0.55);
  const chartH = height - padBottom - padTop;

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-52 w-full"
        role="img"
        aria-label="Cash collected per month over the last six months"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line
          x1={padX}
          y1={height - padBottom}
          x2={width - padX}
          y2={height - padBottom}
          stroke="#e3e9f4"
          strokeWidth={1}
        />

        {data.map((d, i) => {
          const h = d.amount > 0 ? Math.max(3, (d.amount / max) * chartH) : 0;
          const x = padX + slot * i + (slot - barW) / 2;
          const y = height - padBottom - h;
          return (
            <g key={d.ym}>
              {h > 0 ? (
                <rect x={x} y={y} width={barW} height={h} rx={5} fill="url(#barGrad)" />
              ) : null}
              <text
                x={x + barW / 2}
                y={height - padBottom + 16}
                textAnchor="middle"
                className="fill-[#64748b] text-[11px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="sr-only">
        <table>
          <tbody>
            {data.map((d) => (
              <tr key={d.ym}>
                <th scope="row">{d.label}</th>
                <td>{formatMoney(d.amount, currencySymbol)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
