/*
 * @@description:
 */
import I18N from '@src/lang/I18N';
import {
  Form as AntForm,
  TableColumnsType,
  Button,
  Modal,
  TableProps,
} from 'antd';
import classNames from 'classnames';
import { VFC, useState, useEffect, useRef } from 'react';

import {
  getEmissionSourceList,
  getEmissionSoureLibraryTableDataDetail,
  listALLByDictTypeBatch,
} from '@/views/subModulesCommon/carbonFootprintModel/service';

import EmissionSourceDetail from '@/views/subModules/CarbonFootprintModel/components/EmissionSourceDrawer/ModalDetail';
import styles from '@/views/subModules/CarbonFootprintModel/components/EmissionSourceDrawer/index.module.less';
import { ALL_EMISSION, ALL_EMISSION_LABEL } from '@/views/subModules/CarbonFootprintModel/constant';
import { Dicts } from '@/views/subModules/CarbonFootprintModel/formilyComponents/FormilyFactor/type';
import { EmissionFormDataSource, OptionsTypesData } from '@/views/components/CarbonFootprintModel/type';
import {
  formItemInitInput,
  formItemInitType,
  formPropsInit,
} from '@/views/subModules/CarbonFootprintModel/components/Factor/util';
import SearchFormUtil from '@/views/subModules/CarbonFootprintModel/components/SearchForm';
import { utilGetUrlParams } from '@/views/subModules/CarbonFootprintModel/components/SearchForm/util';
import CommonTable from '@/views/subModules/CarbonFootprintModel/components/TableUtil/page/CommonTable';
import { TableRef } from '@/views/subModules/CarbonFootprintModel/components/TableUtil/types/common';
import TextWidthOverflow from '@/views/subModules/CarbonFootprintModel/components/byWidth';
import layoutStyles from './index.module.less';

type EmissionSourceTableProps = {
  emissionName?: string;
  onConfirm: (emissionSource: EmissionFormDataSource) => Promise<any>;
  onCancel: () => Promise<any>;
  tableScrollOptions?: TableProps<any>['scroll'];
  options?: OptionsTypesData[];
};

const commonFormItemProps = {
  style: { width: 240 },
};

const ModalEmissionSourceTable: VFC<EmissionSourceTableProps> = ({
  emissionName,
  onCancel,
  onConfirm,
  tableScrollOptions,
  options,
}) => {
  // 弹框标题的高度
  const TitleHeight = 55;
  // 搜索栏 + 边距
  const SearchHeight = 60;
  // 弹框距离上下方距离 各50
  const ModalTopBottom = 50 + 50;
  // 表头高度
  const TableColumnsHeight = 50 + 16;
  // 底部分页的高度
  const PaginationHeight = 60;

  // 表格内部超出滚动的滚动条
  const TableScrollY =
    window.innerHeight -
    TitleHeight -
    TableColumnsHeight -
    SearchHeight -
    ModalTopBottom -
    PaginationHeight;

  // 搜索项的类别动态根据不同的入口，筛选项的内容也不同
  const emissionSearchTypeOptions =
    options ||
    Object.values(ALL_EMISSION).map(emissionSourceType => ({
      value: emissionSourceType,
      label: ALL_EMISSION_LABEL()[emissionSourceType],
    }));

  const [searchParams, setSearchParams] = useState<
    Partial<Pick<EmissionFormDataSource, 'name' | 'type'>>
  >(() => {
    const searchParamsString = utilGetUrlParams('search') || '{}';

    const searchParamsParse = { ...JSON.parse(searchParamsString) };

    if (emissionName) {
      searchParamsParse.name = emissionName;
    }

    return searchParamsParse;
  });

  const [selectedEmissionSource, setSelectedEmissionSource] = useState<
    EmissionFormDataSource[]
  >([]);

  /** 基本详情的弹框 */
  const [showBasicModal, setShowBasicModal] = useState<boolean>(false);
  const setModalVisible = (val: boolean) => {
    setShowBasicModal(val);
  };

  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  /** 单位的字典值 */
  const [cascaderOptions, setCascaderOptions] = useState<Dicts[]>([]);

  /** 排放源信息 */
  const [emissionSourceInfo, setEmissionSourceInfo] =
    useState<Record<string, any>>();

  const [searchForm] =
    AntForm.useForm<Partial<Pick<EmissionFormDataSource, 'name' | 'type'>>>();

  const searchFormProps = {
    ...formPropsInit(),
    layout: 'inline' as const,
    form: searchForm,
    initialValues: {
      name: searchParams?.name || null,
    },
  };

  const tableRef = useRef<TableRef<EmissionFormDataSource>>();

  /**
   * @description: 点击查看
   * @param {EmissionSource} item 查看的数据
   */
  const showEmissionSourceModal = async (item: EmissionFormDataSource) => {
    const back = await getEmissionSoureLibraryTableDataDetail({
      id: `${item.id}`,
    });

    const { data } = back.data;
    const { factorObj, typeExtra } = data;

    // 获取数量单位的code
    const child = cascaderOptions.find(op => op.dictValue === data.unitCode);
    const parent = cascaderOptions.find(
      op => op.dictValue === child?.sourceType,
    );
    const unitData =
      parent && child ? [parent.dictValue, child.dictValue] : undefined;

    const formValues = {
      ...data,
      unitData,
      typeExtraWay: 1,
      factorObj: { ...factorObj, rate: data.rate },
      specificationWay2Numerator: '',
      amount2: '',
    };

    // 处理运输情况
    if (typeExtra) {
      // 产品重量
      if (typeExtra.way === 1) {
        formValues.specificationWay2Numerator = typeExtra.unitName;
        formValues.amount2 = `${typeExtra.amount || ''}`;
      }

      // 载重比
      if (typeExtra.way === 2) {
        // 载重比单位信息是禁止选择的，所以不需要赋值，都是默认值
        // formValues.specificationWay3Numerator = typeExtra.unitName;
        // formValues.specificationWay3Denominator = typeExtra.distUnitName || '';
      }

      // 按能耗
      if (typeExtra.way === 3) {
        // 单位信息在外层有unitCode，所以上面的unitData 已经处理掉了,不需要单独处理了
      }

      // 同步类型
      formValues.typeExtraWay = typeExtra.way;
    }

    setEmissionSourceInfo(formValues);
    setModalVisible(true);
  };

  const tableColumns: TableColumnsType<EmissionFormDataSource> = [
    {
      title: I18N.carbonFootprint.number,
      fixed: 'left',
      width: 70,
      dataIndex: '__index__',
      render: (_, processLibProduct, index) => index + 1,
    },
    {
      title: I18N.carbonFootprint3.emissionSourceName,
      width: 200,
      dataIndex: 'name',
      render: (val: string) => {
        if (val) {
          return <TextWidthOverflow value={val} width={180} />;
        }
        return '-';
      },
    },
    {
      title: I18N.carbonFootprint3.category,
      width: 120,
      dataIndex: 'type',
      render: (_, emissionSource) =>
        ALL_EMISSION_LABEL()[emissionSource.type] || '-',
    },
    {
      title: I18N.carbonFootprint.unit,
      width: 100,
      dataIndex: 'unitName',
      render: (_, emissionSource) =>
        (emissionSource.typeExtra
          ? emissionSource.typeExtra.unitName || emissionSource.unitName
          : emissionSource.unitName) || '-',
    },
    {
      title: I18N.carbonFootprint.emissionSourceDescription,
      width: 200,
      dataIndex: 'emissionSourceDescription',
      render: (val: string) => <TextWidthOverflow width={190} value={val} />,
    },
    {
      title: I18N.carbonFootprint.operation,
      width: 100,
      fixed: 'right',
      dataIndex: '__operate__',
      render: (_, emissionSource) => (
        <Button
          onClick={async () => {
            await showEmissionSourceModal(emissionSource);
          }}
          className={styles.operateBtn}
          type='link'
        >
          {I18N.carbonFootprint.check}</Button>
      ),
    },
  ];

  /**
   * @description: 初始化
   */
  const init = async () => {
    const dic = await listALLByDictTypeBatch<{ factorUnitM: Dicts[] }>({
      dictTypes: 'factorUnitM',
    });
    setCascaderOptions(dic.data.data.factorUnitM);
  };
  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (selectedEmissionSource.length > 0) {
      const ids = selectedEmissionSource.map(pr => pr.id as number);
      setSelectedRowKeys(ids);
    } else {
      setSelectedRowKeys([]);
    }
  }, [selectedEmissionSource]);

  return (
    (<div className={classNames(styles.ModalEmissionSourceDiv, layoutStyles.emissionSourceTable)}>
      <div className='m-t-16'>
        <SearchFormUtil
          useSearch={false}
          antdFormProps={searchFormProps}
          searchSub={() => {
            setSearchParams({
              ...searchParams,
              ...searchForm.getFieldsValue(),
            });
          }}
          resetBack={() => setSearchParams({})}
          formItems={[
            {
              ...formItemInitInput('', 'name', false),
              props: {
                ...commonFormItemProps,
                placeholder: I18N.carbonFootprint3.emissionSourceName,
              },
            },
            {
              ...formItemInitType('select', '', 'type', false),
              props: {
                ...commonFormItemProps,
                placeholder: I18N.carbonFootprint3.category,
                options: emissionSearchTypeOptions,
              },
            },
          ]}
        />
      </div>
      <CommonTable<
        EmissionFormDataSource,
        { data: { total: number; rows: EmissionFormDataSource[] } }
      >
        columns={tableColumns}
        rowSelection={{
          type: 'radio',
          columnWidth: 80,
          fixed: 'left',
          selectedRowKeys,
          onChange: (_, selectedRows) =>
            setSelectedEmissionSource(selectedRows),
        }}
        searchParams={searchParams}
        bordered={false}
        cRef={tableRef}
        scroll={{ x: 870, ...(tableScrollOptions || {}), y: TableScrollY }}
        pageSize={10}
        rowKey='id'
        fetchApi={params =>
          getEmissionSourceList({
            ...params,
            pageSize: params.size,
            pageNum: params.page,
          })
        }
        returnFetchApi={back => {
          if (back?.data?.data?.rows.length > 0) {
            setSelectedEmissionSource([back?.data?.data?.rows[0]]);
          } else {
            setSelectedEmissionSource([]);
          }
          return {
            data: back?.data?.data?.rows || [],
            count: back?.data?.data?.total || 0,
          };
        }}
        pagination={{ position: ['bottomLeft'] }}
      />
      <Modal
        width={1100}
        title={I18N.carbonFootprint3.emissionSourceDetails}
        maskClosable={false}
        open={showBasicModal}
        transitionName=''
        okButtonProps={{
          style: {
            display: 'none',
          },
        }}
        cancelText={I18N.carbonFootprint3.close}
        bodyStyle={{
          padding: 0,
        }}
        onCancel={() => setModalVisible(false)}
      >
        <EmissionSourceDetail readPretty initValues={emissionSourceInfo} />
      </Modal>
      {selectedEmissionSource.length > 0 && (
        <div className={classNames(styles.modalEmissionSourceFooter, layoutStyles.footer)}>
          <Button
            onClick={async () => {
              if (onCancel) {
                onCancel();
              }
            }}
          >
            {I18N.carbonFootprint.cancel}</Button>
          <Button
            style={{
              marginLeft: 10,
            }}
            type='primary'
            onClick={async () => {
              await onConfirm(selectedEmissionSource[0]);
            }}
          >
            {I18N.carbonFootprint3.confirmSelection}</Button>
        </div>
      )}
    </div>)
  );
};

export default ModalEmissionSourceTable;
