import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface Props {
  option: echarts.EChartsOption;
  height?: number | string;
  onEvents?: Record<string, (params: any, chart: echarts.ECharts) => void>;
}

export default function EChart({ option, height = 260, onEvents }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const eventsRef = useRef(onEvents);
  eventsRef.current = onEvents;

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.clear();
    chart.setOption(option);
    chart.off('click');
    chart.on('click', (params: any) => eventsRef.current?.click?.(params, chart));
  }, [option]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
