import ReactECharts from 'echarts-for-react';
import { useEffect, useRef } from 'react';

interface Props {
  option: Record<string, unknown>;
  className?: string;
  dataTestId: string;
}

interface CategoryChartOption {
  dataZoom?: Array<{ startValue?: number; endValue?: number }>;
  xAxis?: Array<{ data?: unknown[] }>;
}

/**
 * 业务检索：能碳图表 - 通过图内滚轮横向浏览超量分类并保留页面位置
 */
export default function EnergyCarbonCategoryChart({
  option,
  className,
  dataTestId,
}: Props) {
  // 保存图表实例和外层容器，后续由原生非被动滚轮监听接管超量分类的横向浏览。
  const chartRef = useRef<ReactECharts>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 仅当图表配置了分类窗口时拦截滚轮；普通图表和完整周期趋势仍保留页面默认滚动。
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      const chart = chartRef.current?.getEchartsInstance();
      if (!chart) return;
      const currentOption = chart?.getOption() as
        | CategoryChartOption
        | undefined;
      const zoom = currentOption?.dataZoom?.[0];
      const categoryCount = currentOption?.xAxis?.[0]?.data?.length ?? 0;
      const startValue = zoom?.startValue;
      const endValue = zoom?.endValue;
      if (
        typeof startValue !== 'number' ||
        typeof endValue !== 'number' ||
        categoryCount <= endValue ||
        event.deltaY === 0
      ) {
        return;
      }

      // 每次滚轮移动一个分类，并限制在首尾范围内，得到稳定且可预测的横向窗口。
      event.preventDefault();
      const visibleCount = endValue - startValue + 1;
      const maximumStart = categoryCount - visibleCount;
      const nextStart = Math.min(
        Math.max(startValue + (event.deltaY > 0 ? 1 : -1), 0),
        maximumStart,
      );
      chart.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 0,
        startValue: nextStart,
        endValue: nextStart + visibleCount - 1,
      });
    };

    // 使用非被动监听阻止页面纵向位移；卸载时移除监听，避免路由切换后残留事件。
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // 图表仍由原组件负责渲染，容器只补充超量分类的滚轮交互。
  return (
    <div ref={containerRef}>
      <ReactECharts
        ref={chartRef}
        option={option}
        notMerge
        // 统计图的坐标文字和图例使用 SVG 绘制，避免 Canvas 在截图缩放时出现文字发虚；不改变图表配置和容器尺寸。
        opts={{ renderer: 'svg' }}
        className={className}
        data-testid={dataTestId}
      />
    </div>
  );
}
