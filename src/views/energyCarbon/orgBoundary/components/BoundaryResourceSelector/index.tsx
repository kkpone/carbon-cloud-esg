import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useQuery } from '@tanstack/react-query';
import {
  type TableColumnsType,
  type TableProps,
  Modal,
  Table,
  Typography,
} from 'antd';

import { useEffect, useMemo, useRef, useState } from 'react';

import { getEnergyEquipmentPageApi } from '@/views/energyCarbon/config/energyEquipment/services';
import { getEnergyTypeName } from '@/views/energyCarbon/config/energyList/constant';
import { getEnergyPageApi } from '@/views/energyCarbon/config/energyList/services';
import { getProductPageApi } from '@/views/energyCarbon/config/mainProduct/services';
import { getMeasuringInstrumentPageApi } from '@/views/energyCarbon/config/measuringInstrument/services';

/** 四类可选择边界资源。 */
export type BoundaryResourceKind =
  | 'energy'
  | 'product'
  | 'equipment'
  | 'instrument';

/** 选择弹窗统一使用的展示结构。 */
export interface BoundaryResourceOption {
  id: number;
  name?: string | null;
  code?: string | null;
  unitName?: string | null;
  keyEnergyEquipment?: boolean | null;
  energyName?: string | null;
  energyType?: 1 | 2;
}

interface Props {
  open: boolean;
  kind: BoundaryResourceKind;
  selectedItems: BoundaryResourceOption[];
  onCancel: () => void;
  onConfirm: (items: BoundaryResourceOption[]) => void;
}

const PAGE_SIZE = 10;

const getResourceTitles = (): Record<BoundaryResourceKind, string> => ({
  energy: I18N.energyCarbon.cfgSelectEnergy,
  product: I18N.energyCarbon.cfgSelectProduct,
  equipment: I18N.energyCarbon.cfgSelectEquipment,
  instrument: I18N.energyCarbon.cfgSelectInstrument,
});

/** 按当前资源类型调用已有主数据分页接口并统一为选择项。 */
async function getResourcePage(kind: BoundaryResourceKind, pageNum: number) {
  if (kind === 'energy') {
    const page = (await getEnergyPageApi({ pageNum, pageSize: PAGE_SIZE })).data
      .data;
    return {
      total: page.total,
      records: page.records.map(item => ({
        id: item.id,
        name: item.energyName,
        unitName: item.unitName,
        energyType: item.energyType,
      })),
    };
  }
  if (kind === 'product') {
    const page = (await getProductPageApi({ pageNum, pageSize: PAGE_SIZE }))
      .data.data;
    return {
      total: page.total,
      records: page.records.map(item => ({
        id: item.id,
        name: item.productName,
        code: item.productCode,
        unitName: item.unitName,
      })),
    };
  }
  if (kind === 'equipment') {
    const page = (
      await getEnergyEquipmentPageApi({ pageNum, pageSize: PAGE_SIZE })
    ).data.data;
    return {
      total: page.total,
      records: page.records.map(item => ({
        id: item.id,
        name: item.equipmentName,
        code: item.equipmentCode,
        keyEnergyEquipment: item.keyEnergyEquipment,
      })),
    };
  }

  const page = (
    await getMeasuringInstrumentPageApi({ pageNum, pageSize: PAGE_SIZE })
  ).data.data;
  return {
    total: page.total,
    records: page.records.map(item => ({
      id: item.id,
      name: item.instrumentName,
      code: item.instrumentCode,
      energyName: item.energyName,
    })),
  };
}

/** 业务检索：边界管理 - 分页选择边界绑定资源并跨页保留选择结果 */
export default function BoundaryResourceSelector({
  open,
  kind,
  selectedItems,
  onCancel,
  onConfirm,
}: Props) {
  const { locale } = useLocale();
  const [pageNum, setPageNum] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const selectedMapRef = useRef(new Map<number, BoundaryResourceOption>());

  useEffect(() => {
    if (!open) {
      return;
    }
    // 每次打开都以抽屉当前值重建选择快照，取消不会污染表单。
    setPageNum(1);
    setSelectedKeys(selectedItems.map(item => item.id));
    selectedMapRef.current = new Map(
      selectedItems.map(item => [item.id, item]),
    );
  }, [open, selectedItems]);

  const { data, isFetching } = useQuery({
    queryKey: ['org-boundary-resource-selector', kind, pageNum],
    queryFn: () => getResourcePage(kind, pageNum),
    enabled: open,
  });

  const columns = useMemo<TableColumnsType<BoundaryResourceOption>>(() => {
    const nameTitle =
      kind === 'energy'
        ? I18N.energyCarbon.energyName
        : kind === 'product'
        ? I18N.common.fields.productName
        : kind === 'equipment'
        ? I18N.energyCarbon.cfgEquipmentName
        : I18N.energyCarbon.cfgInstrumentName;
    const result: TableColumnsType<BoundaryResourceOption> = [
      {
        title: nameTitle,
        dataIndex: 'name',
        width: 260,
        ellipsis: { showTitle: false },
        render: value => {
          const displayValue = value || '-';
          return (
            <Typography.Text ellipsis={{ tooltip: displayValue }}>
              {displayValue}
            </Typography.Text>
          );
        },
      },
    ];
    if (kind === 'energy') {
      result.push({
        title: I18N.common.shared.category,
        dataIndex: 'energyType',
        width: 160,
        render: value => (value ? getEnergyTypeName(value) : '-'),
      });
    }
    if (kind !== 'energy') {
      result.push({
        title:
          kind === 'product'
            ? I18N.energyCarbon.cfgProductCode
            : kind === 'equipment'
            ? I18N.energyCarbon.cfgEquipmentCode
            : I18N.energyCarbon.cfgInstrumentCode,
        dataIndex: 'code',
        width: 180,
        ellipsis: true,
        render: value => value || '-',
      });
    }
    if (kind === 'instrument') {
      result.push({
        title: I18N.energyCarbon.cfgMeasuredEnergy,
        dataIndex: 'energyName',
        width: 180,
        ellipsis: { showTitle: false },
        render: value => {
          const displayValue = value || '-';
          return (
            <Typography.Text ellipsis={{ tooltip: displayValue }}>
              {displayValue}
            </Typography.Text>
          );
        },
      });
    } else if (kind === 'energy' || kind === 'product') {
      result.push({
        title: I18N.energyCarbon.measurementUnit,
        dataIndex: 'unitName',
        render: value => value || '-',
      });
    } else if (kind === 'equipment') {
      result.push({
        title: I18N.energyCarbon.cfgKeyEquipment,
        dataIndex: 'keyEnergyEquipment',
        render: value => {
          if (value === undefined || value === null) return '-';
          return value ? I18N.common.answers.yes : I18N.common.answers.no;
        },
      });
    }
    return result;
  }, [locale, kind]);

  const rowSelection: TableProps<BoundaryResourceOption>['rowSelection'] = {
    selectedRowKeys: selectedKeys,
    preserveSelectedRowKeys: true,
    onSelect: (record, selected) => {
      const nextKeys = new Set(selectedKeys.map(Number));
      if (selected) {
        nextKeys.add(record.id);
        selectedMapRef.current.set(record.id, record);
      } else {
        nextKeys.delete(record.id);
        selectedMapRef.current.delete(record.id);
      }
      setSelectedKeys(Array.from(nextKeys));
    },
    onSelectAll: (selected, _selectedRows, changedRows) => {
      const nextKeys = new Set(selectedKeys.map(Number));
      changedRows.forEach(record => {
        if (selected) {
          nextKeys.add(record.id);
          selectedMapRef.current.set(record.id, record);
        } else {
          nextKeys.delete(record.id);
          selectedMapRef.current.delete(record.id);
        }
      });
      setSelectedKeys(Array.from(nextKeys));
    },
  };

  return (
    <Modal
      title={getResourceTitles()[kind]}
      open={open}
      width={760}
      destroyOnClose
      onCancel={onCancel}
      onOk={() => {
        const items = selectedKeys
          .map(key => selectedMapRef.current.get(Number(key)))
          .filter((item): item is BoundaryResourceOption => item !== undefined);
        onConfirm(items);
      }}
      data-testid={`org-boundary-${kind}-selector`}
    >
      <Table<BoundaryResourceOption>
        rowKey='id'
        size='small'
        loading={isFetching}
        columns={columns}
        dataSource={data?.records ?? []}
        rowSelection={rowSelection}
        pagination={{
          current: pageNum,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: setPageNum,
        }}
      />
    </Modal>
  );
}
