/*
 * @Author: zhangmingyao 791813037@qq.com
 * @LastEditors: zhangmingyao 791813037@qq.com
 * @LastEditTime: 2023-04-06 23:58:51
 * @Date: 2023-03-07 15:05:10
 * @@description: 碳足迹报告
 */

import { request } from '@src/api/request';
import { Button } from '@src/components/Button';
import { formPropsInit } from '@src/components/FormUtil/util';
import { checkPermissions } from '@src/components/Permission/utils';
import SearchFormUtil from '@src/components/SearchForm';
import { TableActions } from '@src/components/Table/components/TableActions';
import CommonTable from '@src/components/TableUtil/page/CommonTable';
import { TableRef } from '@src/components/TableUtil/types/common';
import I18N from '@src/lang/I18N';
import { virtualLinkTransform } from '@src/router/route-paths';
import { RouteMapsCorbonFootprint3 } from '@src/router/route-paths/corbonFootprint3';
import { PageInfoType } from '@src/router/type';
import { POST5827ce9c386d794601e7650d253aeac2 } from '@src/sdks_v2/footprint3V2ApiDocs';
import { Toast } from '@src/utils/Toast';
import { useTableViewportScrollHeight } from '@src/hooks/useTableScrollHeight';
import { Form, Modal, Spin, Table, message } from 'antd';
import saveAs from 'file-saver';
import { compact } from 'lodash-es';
import { useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { getProductsOfReport, getReportFile } from './Info/service';
import { columns } from './columns';
import { AnalysisIcon } from '../components/AnalysisIcon';
import { searchTableFormItem } from './formItems';
import styles from './index.module.less';
import { TableRow } from './types';
import { AnalysisText } from '../components/AnalysisText';
import { COMPARISON_REPORT_TYPE, REPORT_TYPE } from '../constant';

const { confirm } = Modal;

const CarbonFootPrint3Report = () => {
  const isEdit = checkPermissions(true, 'footprint3:report:edit');
  const isAdd = checkPermissions(true, 'footprint3:report:add');
  const canGenerate = checkPermissions(true, 'footprint3:report:create');
  const tableRef = useRef<TableRef<TableRow>>();
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const tableScrollHeight = useTableViewportScrollHeight(tableWrapperRef);
  const [searchForm] = Form.useForm();
  /** 查询的条件 */
  const [searchParamsData, setSearchParamsData] = useState<any>();

  /** 展开的数据 */
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);

  /** 下载管理的Loading */
  const [downLoading, setDownLoading] = useState(false);
  const history = useHistory();

  /**
   * @description: 删除列表数据
   * @param {ProductLibraryTableData} deleteItem 被删除的行数据信息
   */
  const deleteTable = async (deleteItem: any) => {
    confirm({
      title: I18N.carbonFootprint.prompt,
      content: I18N.template(I18N.carbonFootprint3.confirmDeletionOfThis12, {
        val1: deleteItem.reportName,
      }),
      okButtonProps: {
        danger: true,
      },
      icon: null,
      onOk: async () => {
        try {
          const back = await POST5827ce9c386d794601e7650d253aeac2({
            report: deleteItem,
          });
          if (back.data.code === 200) {
            tableRef.current?.reset();
            Toast('success', I18N.carbonFootprint.deleteSuccessful);
          }
        } catch {
          /* empty */
        }
      },
    });
  };

  /**
   * 展开收起表格
   * @param expanded 是否展开
   * @param record 展开收起的信息
   */
  const handleExpand = async (expanded: boolean, record: TableRow) => {
    setDownLoading(true);
    if (expanded) {
      const { data } = await getProductsOfReport({ id: record.id });
      record.expandedList = data.data;
      setExpandedRowKeys([...expandedRowKeys, record.id]);
    } else {
      setExpandedRowKeys(expandedRowKeys.filter(item => item !== record.id));
    }
    setDownLoading(false);
  };

  /**
   * 展开表格
   * @param record 报告信息
   */
  const expandedRowRender = (record: TableRow) => (
    <Table
      columns={[
        {
          title: I18N.carbonFootprint.productName,
          width: 260,
          dataIndex: 'productName',
          render: (val, item) => {
            if (
              record.type === REPORT_TYPE.COMPARE ||
              record.type === REPORT_TYPE.REDUCTION
            ) {
              const targetLabel =
                record.type === REPORT_TYPE.REDUCTION
                  ? I18N.carbonFootprint3.projectScenario
                  : I18N.carbonFootprint3.targetProduct;
              const benchmarkLabel =
                record.type === REPORT_TYPE.REDUCTION
                  ? I18N.carbonFootprint3.benchmarkScenario
                  : I18N.carbonFootprint3.benchmarkProduct;
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {item.baseType === COMPARISON_REPORT_TYPE.TARGET && (
                    <div
                      style={{
                        flex: 'none',
                        padding: '2px 6px',
                        height: 24,
                        fontSize: 12,
                        color: '#04252b',
                        borderRadius: 4,
                        background: '#edf4f4',
                        marginRight: 8,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {targetLabel}
                    </div>
                  )}
                  {item.baseType === COMPARISON_REPORT_TYPE.STANDARD && (
                    <div
                      style={{
                        flex: 'none',
                        padding: '2px 6px',
                        height: 24,
                        fontSize: 12,
                        color: '#04252b',
                        borderRadius: 4,
                        background: '#edf4f4',
                        marginRight: 8,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {benchmarkLabel}
                    </div>
                  )}
                  <AnalysisText value={String(val ?? '-')} />
                </div>
              );
            }
            return <AnalysisText value={String(val ?? '-')} />;
          },
        },
        {
          title: I18N.carbonFootprint3.specificationAndModel,
          width: 150,
          dataIndex: 'specification',
          render: val => <AnalysisText value={String(val ?? '-')} />,
        },
        {
          title: I18N.carbonFootprint3.functionalUnits,
          width: 200,
          dataIndex: 'accountName',
          render: val => <AnalysisText value={String(val ?? '-')} />,
        },
        {
          title: I18N.carbonFootprint.accountingCycle,
          width: 200,
          dataIndex: 'startTime',
          render: (val, item) => (
            <AnalysisText
              value={I18N.template(I18N.carbonFootprint3.items4, {
                val1: item.startTime,
                val2: item.endTime,
              })}
            />
          ),
        },
        {
          title: I18N.carbonFootprint3.unitEmissions,
          width: 200,
          dataIndex: 'factor',
          render: (val, item) => (
            <AnalysisText value={`${item?.factor}${item?.factorUnit}`} />
          ),
        },
      ]}
      dataSource={record.expandedList || []}
      rowKey='id'
      size='small'
      pagination={false}
    />
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.title}>
          {I18N.carbonFootprint.carbonFootprintReport}
        </div>
      </div>
      <div className={styles.searchContent}>
        <SearchFormUtil
          antdFormProps={{
            ...formPropsInit(),
            layout: 'inline',
            form: searchForm,
          }}
          searchSub={() => {
            const val = searchForm.getFieldsValue();
            setSearchParamsData({
              ...searchParamsData,
              ...val,
            });
            setExpandedRowKeys([]);
          }}
          resetBack={() => {
            setSearchParamsData(undefined);
            setExpandedRowKeys([]);
          }}
          formItems={searchTableFormItem()}
        />
        {isAdd && (
          <Button
            type='primary'
            icon={<AnalysisIcon name='plus' />}
            onClick={async () => {
              history.push(
                virtualLinkTransform(
                  RouteMapsCorbonFootprint3.carbonFootprint3ProcessReportInfo,
                  [':pageInfoType', ':id', ':comparisonId'],
                  [PageInfoType.add, 'null', 'null'],
                ),
              );
            }}
          >
            {I18N.carbonFootprint.newReportAdded}
          </Button>
        )}
      </div>
      <div ref={tableWrapperRef} className={styles.tableContent}>
        <Spin spinning={downLoading}>
          <CommonTable<TableRow, { data: { rows: TableRow[]; total?: number } }>
            bordered={false}
            searchParams={searchParamsData}
            cRef={tableRef}
            pageSize={10}
            fetchApi={params =>
              request<{ data: { rows: TableRow[]; total?: number } }>({
                method: 'get',
                url: '/footprint3/report/list',
                params: {
                  ...params,
                  pageNum: params.page,
                  pageSize: params.size,
                },
              })
            }
            returnFetchApi={({ data }) => ({
              data: data?.data?.rows,
              count: data?.data?.total || 0,
            })}
            expandable={{
              expandedRowKeys,
              expandedRowRender,
              onExpand: (expanded, record) => handleExpand(expanded, record),
            }}
            columns={[
              ...columns(),
              {
                title: I18N.carbonFootprint.operation,
                width: 190,
                dataIndex: 'action',
                fixed: 'right',
                render(_, row) {
                  return (
                    <TableActions
                      buttonProps={
                        canGenerate
                          ? [{ disabled: row.reportStatus === 0 }]
                          : undefined
                      }
                      menus={compact([
                        checkPermissions(
                          {
                            label: I18N.carbonFootprint.generateReport,
                            key: I18N.carbonFootprint.generateReport,
                            disabled: row.reportStatus === 0,
                            onClick: async () => {
                              if (row.reportStatus === 0) return;
                              setDownLoading(true);
                              message.loading({
                                content: I18N.carbonFootprint3.generatingReport,
                                key: 'load',
                              });
                              try {
                                const { data } = await getReportFile({
                                  reportId: row.id,
                                });
                                if (data.data) {
                                  message.success({
                                    content:
                                      I18N.carbonFootprint3
                                        .successfullyGenerated,
                                    key: 'load',
                                  });
                                  saveAs(data.data.url, data.data.name);
                                } else {
                                  message.destroy('load');
                                }
                              } catch {
                                message.destroy('load');
                              } finally {
                                setDownLoading(false);
                              }
                            },
                          },
                          'footprint3:report:create',
                        ),
                        checkPermissions(
                          {
                            label: I18N.carbonFootprint3.details,
                            key: I18N.carbonFootprint3.details,
                            onClick: async () => {
                              if (isEdit) {
                                history.push(
                                  virtualLinkTransform(
                                    RouteMapsCorbonFootprint3.carbonFootprint3ProcessReportInfo,
                                    [':pageInfoType', ':id', ':comparisonId'],
                                    [PageInfoType.edit, row.id, 'null'],
                                  ),
                                );
                              } else {
                                history.push(
                                  virtualLinkTransform(
                                    RouteMapsCorbonFootprint3.carbonFootprint3ProcessReportInfo,
                                    [':pageInfoType', ':id', ':comparisonId'],
                                    [PageInfoType.show, row.id, 'null'],
                                  ),
                                );
                              }
                            },
                          },
                          'footprint3:report:info',
                        ),
                        checkPermissions(
                          {
                            label: I18N.carbonFootprint.delete,
                            key: I18N.carbonFootprint.delete,
                            onClick: async () => {
                              await deleteTable(row);
                            },
                          },
                          'footprint3:report:delete',
                        ),
                      ])}
                    />
                  );
                },
              },
            ]}
            rowKey='id'
            scroll={{
              x: 1160,
              y: tableScrollHeight,
            }}
          />
        </Spin>
      </div>
    </div>
  );
};

export default CarbonFootPrint3Report;
