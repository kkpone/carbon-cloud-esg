/**
 * @description 一般信息
 */
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import {
  Form,
  FormGrid,
  FormItem,
  FormLayout,
  Input,
  Select,
  DatePicker,
  Radio,
} from '@formily/antd-v5';
import { createForm, onFieldValueChange } from '@formily/core';
import { createSchemaField, FormConsumer } from '@formily/react';
import I18N from '@src/lang/I18N';
import { Button, Descriptions, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { compact, isNumber, omit } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';

import { FormActions } from '@/components/FormActions';
import { InfoTitle } from '@/components/InfoTitle';
import { useCbamPageInfo } from '@/views/cbam/ReportForm/Info/context';
import { omitInfoFn, Toast } from '@/utils';
import { ORG_STATUS } from '@/utils/const';
import { getFactoryDetail } from '@/views/cbam/FactoryInformation/service';
import { useCbamOrgs, useFactoryList } from '@/views/cbam/hook';
import { useAllEnumsBatch } from '@/views/dashborad/Dicts/hooks';

import style from './index.module.less';
import { baseSchema, verificationAgencySchema } from './schemas';
import {
  getGeneralInfoDetail,
  getAccountingMonitorPlans,
  postGeneralInfoAdd,
  putGeneralInfoEdit,
} from '../../service';
import type {
  Factory,
  GeneralInfoProps as GeneralInfoValues,
} from '../../type';

const SchemaField = createSchemaField({
  components: {
    Input,
    Select,
    DatePicker,
    Radio,
    Form,
    FormItem,
    FormGrid,
    FormLayout,
  },
});

interface GeneralInfoProps {
  /** 下一步方法 */
  onClickNextStep: ({ reportId }: { reportId?: number }) => void;
  /** 返回方法 */
  onClickBack: () => void;
  /** 是否是CBAM跳转 */
  isCbamInfo?: boolean;
}

const GeneralInfo = ({
  onClickNextStep,
  onClickBack,
  isCbamInfo,
}: GeneralInfoProps) => {
  const { isDetail, id } = useCbamPageInfo();

  /** 所属组织枚举 */
  const orgList = useCbamOrgs();

  const enumOptions = useAllEnumsBatch('CBAMcountryinfo');
  /** 国家名称枚举 */
  const countryCodeList = enumOptions?.CBAMcountryinfo;

  /** 联动选项，异步返回时只写入仍有效的当前选择。 */
  const [selectedOrgId, setSelectedOrgId] = useState<number>();
  const [selectedFactoryId, setSelectedFactoryId] = useState<number>();
  const [savedPlan, setSavedPlan] = useState<{
    label: string;
    value: number;
  }>();

  /** 工厂枚举 */
  const factoryList = useFactoryList();

  const form = useMemo(
    () =>
      createForm({
        readPretty: isDetail,
        effects: () => {
          onFieldValueChange('orgId', field => {
            setSelectedOrgId(field.value);
            if (field.selfModified) {
              form.setValuesIn('factoryId', undefined);
              form.setValuesIn('planId', undefined);
              form.setValuesIn('factory', {});
            }
          });
          onFieldValueChange('factoryId', field => {
            setSelectedFactoryId(field.value);
            if (!field.selfModified) return;
            form.setValuesIn('planId', undefined);
            form.setValuesIn('factory', {});
            const factoryId = field.value;
            if (factoryId) {
              getFactoryDetail({ id: factoryId }).then(({ data }) => {
                if (form.getValuesIn('factoryId') === factoryId) {
                  form.setValuesIn('factory', { ...data?.data });
                }
              });
            }
          });
        },
      }),
    [isDetail],
  );

  /** 展开/收起 验证机构 */
  const [expandOther, setExpandOther] = useState(false);

  /** 保存按钮的loading */
  const [saveBtnLoading, setSaveBtnLoading] = useState(false);

  /** 保存的接口 */
  const saveApi = id ? putGeneralInfoEdit : postGeneralInfoAdd;

  /** 设置枚举值 */
  useEffect(() => {
    if (orgList) {
      /** 所属组织 */
      form.setFieldState('orgId', {
        dataSource: orgList.map(item => ({
          label: item.orgName,
          value: item.id,
          disabled: item.orgStatus === ORG_STATUS.DISABLE,
        })),
      });
    }

    /** 选择工厂 */
    if (factoryList) {
      form.setFieldState('factoryId', {
        dataSource: factoryList
          .filter(factory => Number(factory.orgId) === Number(selectedOrgId))
          .map(factory => ({
            ...factory,
            label: factory.factorName,
            value: factory.id,
          })),
      });
    }
    /** 国家 */
    if (countryCodeList) {
      form.setFieldState('verification.country', {
        dataSource: countryCodeList?.map(item => ({
          ...item,
          label: item.dictLabel,
          value: item.dictValue,
        })),
      });
    }
  }, [orgList, factoryList, countryCodeList, selectedOrgId]);

  /** 工厂或实体变化后重新查询计划，丢弃过期请求的响应。 */
  useEffect(() => {
    let active = true;
    form.setFieldState('planId', { dataSource: savedPlan ? [savedPlan] : [] });
    if (selectedOrgId && selectedFactoryId) {
      getAccountingMonitorPlans({
        orgId: selectedOrgId,
        factoryId: selectedFactoryId,
      }).then(({ data }) => {
        if (!active) return;
        const options = (data?.data || []).map(plan => ({
          label: plan.planName,
          value: plan.id,
        }));
        if (
          savedPlan &&
          !options.some(option => option.value === savedPlan.value)
        )
          options.push(savedPlan);
        form.setFieldState('planId', { dataSource: options });
      });
    }
    return () => {
      active = false;
    };
  }, [form, selectedOrgId, selectedFactoryId, savedPlan]);

  /** 获取详情 */
  useEffect(() => {
    if (id) {
      getGeneralInfoDetail({ id }).then(({ data }) => {
        const result = data?.data || {};

        const values = {
          ...result,
        };
        form.setValues(values);

        setSelectedOrgId(result.orgId);
        setSelectedFactoryId(result.factoryId);
        if (result.planId) {
          setSavedPlan({
            value: result.planId,
            label: result.planName || String(result.planId),
          });
          form.setFieldState('orgId', { disabled: true });
          form.setFieldState('factoryId', { disabled: true });
        }
        form.setFieldState('planId', { disabled: true });

        if (isDetail) {
          const { startDate, endDate } = result;
          /** 修复详情显示错误 */
          form.setValues({
            ...values,
            startDate: dayjs(startDate, 'DD.MM.YYYY'),
            endDate: dayjs(endDate, 'DD.MM.YYYY'),
          });
        }
      });
    }
  }, [id, isDetail]);

  return (
    <div className={style.infoWrapper}>
      <Form form={form} previewTextPlaceholder='-'>
        <SchemaField schema={baseSchema()} />

        <InfoTitle title={I18N.cbam.factoryInformation} />
        <FormConsumer>
          {currentForm => {
            /** 工厂信息沿用灰底双列展示，详细地址读取中文地址。 */
            const factory = currentForm.getValuesIn('factory') as
              | Factory
              | undefined;
            const showInfoList = [
              { label: I18N.cbam.factoryName, value: factory?.factorName },
              {
                label: I18N.cbam.factoryNameInEnglish,
                value: factory?.factoryNameEn,
              },
              {
                label: I18N.carbonFootPrintLCA.detailedAddress,
                value: factory?.detailedAddress,
              },
              {
                label: I18N.cbam.economicActivity,
                value: factory?.economicActivity,
              },
              { label: I18N.cbam.postalCode, value: factory?.postalCode },
              { label: I18N.cbam.postOfficeBox, value: factory?.postOfficeBox },
              { label: I18N.cbam.city, value: factory?.city },
              {
                label: I18N.cbam.country,
                value:
                  countryCodeList?.find(
                    item => item.dictValue === factory?.country,
                  )?.dictLabel || factory?.countryName,
              },
              {
                label: I18N.cbamMonitor.locationCode,
                value: factory?.locationCode,
              },
              { label: I18N.cbam.longitude, value: factory?.longitude },
              { label: I18N.cbam.latitude, value: factory?.latitude },
              {
                label: I18N.cbam.authorizedRepresentativeSurname,
                value: factory?.authorizedRepresentative,
              },
              { label: I18N.cbam.eMail, value: factory?.email },
              { label: I18N.cbam.telephone, value: factory?.mobile },
            ];
            return (
              <div className={style.factoryInfoWrapper}>
                <Descriptions column={2}>
                  {showInfoList.map(showInfo => (
                    <Descriptions.Item
                      label={showInfo.label}
                      key={showInfo.label}
                    >
                      <div className={style.showText}>
                        <Tooltip title={showInfo.value} placement='topLeft'>
                          {showInfo.value || '-'}
                        </Tooltip>
                      </div>
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </div>
            );
          }}
        </FormConsumer>

        <div className={style.aHeader}>
          <InfoTitle title={I18N.cbam.verificationAgency} />
          <Button
            type='link'
            onClick={() => {
              setExpandOther(!expandOther);
            }}
          >
            {expandOther ? (
              <div className={style.expandBtn}>
                {I18N.cbam.putItAway}
                <UpOutlined />
              </div>
            ) : (
              <div className={style.expandBtn}>
                {I18N.cbam.open}
                <DownOutlined />
              </div>
            )}
          </Button>
        </div>
        <div hidden={!expandOther}>
          <SchemaField schema={verificationAgencySchema()} />
        </div>
      </Form>

      <FormActions
        place='center'
        buttons={compact([
          !isDetail && {
            title: I18N.Factors.saveNextStep,
            type: 'primary',
            loading: saveBtnLoading,
            onClick: async () => {
              const values = await form.submit<GeneralInfoValues>();

              setSaveBtnLoading(true);

              try {
                // 工厂信息仅展示，核算任务只提交关联工厂ID。
                const result = omitInfoFn(omit(values, ['factory']));

                const { data } = await saveApi(result);
                Toast('success', I18N.Factors.saveSuccessful);
                onClickNextStep({
                  reportId: isNumber(data?.data) ? data?.data : id,
                });
              } finally {
                setSaveBtnLoading(false);
              }
            },
          },
          (!isDetail || isCbamInfo) && {
            title: I18N.Factors.return,
            onClick: async () => {
              onClickBack();
            },
          },
        ])}
      />
    </div>
  );
};

export default GeneralInfo;
