// 读取当前主题的 CSS 变量值（用于 canvas 类场景：ECharts 等不认 var()）
export function getCssVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '';
}
