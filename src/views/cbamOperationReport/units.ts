/** 单位字典条目，sourceType 与 dictValue 共同标识层级单位。 */
interface OperationUnitOption {
  sourceType?: string | number;
  dictValue: string | number;
  dictLabel: string;
}

/** 仅解析显示名称；未加载或未知编码显示占位，原始编码仍由表单保存。 */
export const operationUnitLabel = (
  value: string | undefined,
  options: OperationUnitOption[] | undefined,
): string => {
  const unit = value?.trim() || '';
  if (!/^\d+(,\d+)?$/.test(unit)) return unit || '-';
  const parts = unit.split(',');
  const option = options?.find(item =>
    parts.length === 2
      ? String(item.sourceType) === parts[0] &&
        String(item.dictValue) === parts[1]
      : String(item.dictValue) === parts[0],
  );
  return option?.dictLabel || '-';
};
