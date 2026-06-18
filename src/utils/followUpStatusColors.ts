const STATUS_CLASS_MAP: Record<string, string> = {
  Hot: 'status-badge status-hot',
  Warm: 'status-badge status-warm',
  Cold: 'status-badge status-cold',
  Converted: 'status-badge status-converted',
  Lost: 'status-badge status-lost',
};

export const businessStatusColors = STATUS_CLASS_MAP;

export const lifecycleStatusColors: Record<'active' | 'updated', string> = {
  active: 'status-badge status-active',
  updated: 'status-badge status-updated',
};

export const getFollowUpStatusClasses = (status: string): string => {
  return STATUS_CLASS_MAP[status] ?? 'status-badge status-default';
};
