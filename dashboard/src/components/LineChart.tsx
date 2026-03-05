import { useMemo, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import type { EChartsOption } from 'echarts';
import { echarts } from '../lib/echarts';

type LineSeriesData = {
  name: string;
  data: number[];
};

type LineChartProps = {
  title: string;
  years: string[];
  lines: LineSeriesData[];
  height?: number;
};

export function LineChart({ title, years, lines, height = 520 }: LineChartProps) {
  const [hoveredSeriesName, setHoveredSeriesName] = useState<string | null>(null);

  const series: EChartsOption['series'] = lines.map((line) => ({
    name: line.name,
    data: line.data,
    type: 'line' as const,
    smooth: true,

    // improves line hover behavior
    triggerLineEvent: true,
    silent: false,

    // keep markers but make them effectively easier to hit
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 8,

    lineStyle: { width: 2 },
    emphasis: {
        focus: 'series' as const,
        lineStyle: { width: 3 }
    }
    }));

  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';

          const year = params[0]?.axisValue ?? '';

          const filtered =
            hoveredSeriesName != null
              ? params.filter((p: any) => p.seriesName === hoveredSeriesName)
              : params;

          const linesHtml = filtered
            .map((p: any) => `${p.seriesName}: ${Number(p.value).toFixed(2)}%`)
            .join('<br/>');

          return `${year}<br/>${linesHtml}`;
        }
      },
      grid: {
        top: 18,
        right: 44,
        bottom: 18,
        left: 44,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { color: '#f0f0f0' },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#f0f0f0',
          formatter: (value: number) => `${value.toFixed(1)}%`
        },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } }
      },
      color: ['#79c9ff', '#95e2b9', '#9ad7ff', '#7fd8ad', '#68b8f0', '#6bc49f', '#a8e6c8', '#8fcaf2'],
      series
    }),
    [years, series, hoveredSeriesName]
  );

  const onEvents = useMemo(
  () => ({
    mousemove: (p: any) => {
      // When you are on a line/series, show only that series.
      if (p?.componentType === 'series' && typeof p.seriesName === 'string') {
        setHoveredSeriesName(p.seriesName);
        return;
      }
      // When you are not directly on a series (just in the plot area), show all.
      setHoveredSeriesName(null);
    },
    mouseout: () => {
      // Safety: if ECharts fires mouseout without a following mousemove
      setHoveredSeriesName(null);
    },
    globalout: () => {
      setHoveredSeriesName(null);
    }
  }),
  []
);

  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <h2>{title}</h2>
      </div>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height }}
        notMerge
        onEvents={onEvents}
      />
    </section>
  );
}