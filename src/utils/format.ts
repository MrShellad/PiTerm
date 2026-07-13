export const formatBytes = (bytes: number, decimals = 1) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatUptime = (seconds: number, t?: (key: string, defaultVal: string) => string) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const dUnit = t ? t('common.time.days', 'd') : 'd';
  const hUnit = t ? t('common.time.hours', 'h') : 'h';
  const mUnit = t ? t('common.time.minutes', 'm') : 'm';
  const lessThan1m = t ? t('common.time.lessThan1m', '< 1m') : '< 1m';

  const parts = [];
  if (d > 0) parts.push(`${d}${dUnit}`);
  if (h > 0) parts.push(`${h}${hUnit}`);
  if (m > 0) parts.push(`${m}${mUnit}`);
  
  if (parts.length === 0) return lessThan1m;
  return parts.join(" ");
};