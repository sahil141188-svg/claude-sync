export interface BarDatum {
  key: string;
  label: string;
  value: number;
  detail?: string;
}

/** Single-series bar chart in brand red. Hover shows the value; a table is provided for screen readers. */
export function BarChart({ data, title }: { data: BarDatum[]; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((a, d) => (d.value > a.value ? d : a), data[0]);

  return (
    <figure>
      <div className="relative h-48" aria-hidden>
        {/* recessive gridlines */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-ink-10" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-ink-10" />
        <div className="absolute inset-x-0 bottom-0 border-t border-ink-20" />
        <span className="absolute -top-2 right-0 bg-white pl-1 text-[11px] text-ink-60">{max}</span>
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((d) => (
            <div key={d.key} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-[28px] rounded-t bg-red transition-colors group-hover:bg-maroon"
                style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
              />
              <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white group-hover:block">
                <span className="font-semibold">{d.value}</span> sent · {d.label}
                {d.detail ? ` · ${d.detail}` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-[2px] text-[10px] text-ink-60" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 whitespace-nowrap text-center">
            {(data.length - 1 - i) % 3 === 0 ? d.label : ''}
          </span>
        ))}
      </div>
      {peak && peak.value > 0 && (
        <figcaption className="mt-3 text-xs text-ink-60">
          Busiest day: {peak.label}, {peak.value} messages.
        </figcaption>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Messages sent</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
