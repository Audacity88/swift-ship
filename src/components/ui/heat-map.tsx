interface HeatMapProps {
  data: Array<{
    name: string;
    data: number[];
  }>;
  xLabels: string[];
  yLabels: string[];
  xLabel?: string;
  yLabel?: string;
  colors: string[];
  maxValue: number;
  tooltip: (value: number) => string;
}

export function HeatMap({
  data,
  xLabels,
  yLabels,
  xLabel,
  yLabel,
  colors,
  maxValue,
  tooltip,
}: HeatMapProps) {
  const getColor = (value: number) => {
    if (value === 0) return colors[0];
    const index = Math.ceil((value / maxValue) * (colors.length - 1));
    return colors[Math.min(index, colors.length - 1)];
  };

  return (
    <div className="relative w-full h-full">
      {/* Y-axis label */}
      {yLabel && (
        <div
          className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-sm text-muted-foreground"
          style={{ width: 'fit-content' }}
        >
          {yLabel}
        </div>
      )}

      <div className="grid gap-1" style={{ gridTemplateColumns: 'auto 1fr' }}>
        {/* Y-axis labels */}
        <div className="flex flex-col justify-around pr-4">
          {yLabels.map((label) => (
            <div key={label} className="text-sm text-muted-foreground">
              {label}
            </div>
          ))}
        </div>

        {/* Heat map grid */}
        <div>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${xLabels.length}, 1fr)`,
              gridTemplateRows: `repeat(${yLabels.length}, 1fr)`,
            }}
          >
            {data.map((row, i) =>
              row.data.map((value, j) => (
                <div
                  key={`${i}-${j}`}
                  className="aspect-square rounded-sm transition-colors"
                  style={{ backgroundColor: getColor(value) }}
                  title={tooltip(value)}
                />
              ))
            )}
          </div>

          {/* X-axis labels */}
          <div
            className="grid gap-1 mt-2"
            style={{ gridTemplateColumns: `repeat(${xLabels.length}, 1fr)` }}
          >
            {xLabels.map((label) => (
              <div
                key={label}
                className="text-sm text-muted-foreground text-center"
              >
                {label}
              </div>
            ))}
          </div>

          {/* X-axis label */}
          {xLabel && (
            <div className="text-center mt-4 text-sm text-muted-foreground">
              {xLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 