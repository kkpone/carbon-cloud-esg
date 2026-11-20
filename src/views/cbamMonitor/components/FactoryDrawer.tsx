import CbamFieldLabel from '@/components/CbamFieldLabel';
import I18N, { getCurrentLocale, serviceLangMap } from '@src/lang/I18N';
import { Button, Cascader, Drawer, Form, Input, message, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';

import {
  CbamDrawerClose,
  CbamDrawerTitle,
} from '@/components/CbamDrawerHeader';

import { useCityInfo } from '@/hooks/useCityInfo';
import {
  getCompanyOrgInfo,
  getUserList,
} from '@/views/dashborad/organization/services';
import { getAreaCode } from '@/views/system/login/service';

import styles from '../index.module.less';
import {
  createMonitorFactory,
  getMonitorFactory,
  getMonitorOrgTree,
  MonitorOrgOption,
  updateMonitorFactory,
} from '../service';
import { FactoryOption } from '../types';
import FactoryLocationFields from './FactoryLocationFields';

interface RegionNode {
  label: string;
  value: string;
  children?: RegionNode[];
}

interface FactoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  factoryId?: number;
  countryOptions: Array<{
    label: string;
    value: string;
    relatedValue?: string;
  }>;
}

const flattenLastValue = (value?: number[]) => value?.[value.length - 1];
const findOrgPath = (
  options: MonitorOrgOption[],
  target?: number,
  parent: number[] = [],
): number[] | undefined => {
  const matched = options.reduce<number[] | undefined>((result, option) => {
    if (result) return result;
    const path = [...parent, option.id];
    if (option.id === target) return path;
    return findOrgPath(option.children || [], target, path);
  }, undefined);
  return matched;
};

export const FactoryDrawer = ({
  open,
  onClose,
  onSaved,
  factoryId,
  countryOptions,
}: FactoryDrawerProps) => {
  const [form] = Form.useForm<
    FactoryOption & { orgPath?: number[]; phoneAreaCode?: string }
  >();
  const [orgOptions, setOrgOptions] = useState<MonitorOrgOption[]>([]);
  const [saving, setSaving] = useState(false);
  const touched = useRef(new Set<string>());
  const selectedOrg = Form.useWatch('orgPath', form);
  const selectedOrgId = flattenLastValue(selectedOrg);
  const cityOptions = useCityInfo();
  const cityOptionsKey = JSON.stringify(cityOptions);
  const countryOptionsKey = JSON.stringify(countryOptions);
  const [phoneCodes, setPhoneCodes] = useState<
    { label: string; value: string }[]
  >([]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    getAreaCode({ lang: serviceLangMap[getCurrentLocale()] })
      .then(items => {
        if (active)
          setPhoneCodes(
            items.map(item => ({
              label: item.areaContent,
              value: item.areaContent,
            })),
          );
      })
      .catch(() => {
        if (active) message.error(I18N.cbamMonitor.loadOrgDefaultsFailed);
      });
    return () => {
      active = false;
    };
  }, [open]);

  // 每次选实体更新未手动修改的字段；重新打开后已保存的非空字段受保护。
  useEffect(() => {
    if (!open || !selectedOrgId) return undefined;
    let active = true;
    Promise.all([getCompanyOrgInfo({ id: selectedOrgId }), getUserList()])
      .then(([response, users]) => {
        if (!active) return;
        const org = response.data.data;
        const contact = users.data?.find(
          user =>
            user.id === org.linkmanUserid || user.userId === org.linkmanUserid,
        );
        // 未设置地区的存量实体可能返回字符串 "null"，按空地区处理。
        const area: string[] = org.orgArea ? JSON.parse(org.orgArea) ?? [] : [];
        let nodes = JSON.parse(cityOptionsKey) as RegionNode[];
        const labels: string[] = [];
        area.forEach(code => {
          const node = nodes.find(item => String(item.value) === String(code));
          if (node) {
            labels.push(node.label);
            nodes = node.children || [];
          }
        });
        const countries = JSON.parse(countryOptionsKey) as {
          label: string;
          value: string;
          relatedValue?: string;
        }[];
        // 海外取二级国家，其他分支统一匹配中国；城市只取非海外分支的二级。
        const rootCode = String(area[0] ?? '');
        const overseas = rootCode === '900000';
        const country =
          labels.length > 0
            ? countries.find(item =>
                overseas
                  ? item.label === labels[1]
                  : item.relatedValue === 'CN',
              )
            : undefined;
        const phone = contact?.employPhone || '';
        const phoneMatch = phone.match(/^(\+\d{1,4})[ -](.*)$/);
        const defaults = {
          country: country?.value,
          city: overseas ? '' : labels[1] ?? '',
          detailedAddress: org.addrDetail,
          authorizedRepresentative: contact?.employName,
          email: contact?.employEmail,
          mobile: phoneMatch ? phoneMatch[2] : phone,
          phoneAreaCode: phoneMatch?.[1] || '+86',
        };
        (Object.keys(defaults) as Array<keyof typeof defaults>).forEach(key => {
          const value = defaults[key];
          if (!touched.current.has(key) && value !== undefined)
            form.setFieldValue(key, value);
        });
      })
      .catch(() => {
        if (active) message.error(I18N.cbamMonitor.loadOrgDefaultsFailed);
      });
    return () => {
      active = false;
    };
  }, [open, selectedOrgId, form, cityOptionsKey, countryOptionsKey]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    form.resetFields();
    touched.current.clear();
    form.setFieldValue('phoneAreaCode', '+86');
    if (!factoryId) {
      form.setFieldsValue({ factoryCode: `${Date.now()}` });
    }
    getMonitorOrgTree().then(async ({ data }) => {
      if (!active) return;
      const options = data?.data || [];
      setOrgOptions(options);
      if (factoryId) {
        const detail = (await getMonitorFactory(factoryId)).data?.data;
        if (!active) return;
        Object.entries(detail || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && String(value).trim())
            touched.current.add(key);
        });
        const phoneMatch = detail?.mobile?.match(/^(\+\d{1,4})[ -](.*)$/);
        if (detail?.mobile) touched.current.add('phoneAreaCode');
        form.setFieldsValue({
          ...detail,
          mobile: phoneMatch ? phoneMatch[2] : detail?.mobile,
          phoneAreaCode: phoneMatch?.[1] || '+86',
          orgPath: findOrgPath(options, detail?.orgId),
        });
      }
    });
    return () => {
      active = false;
    };
  }, [factoryId, form, open]);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const { orgPath, phoneAreaCode, ...factoryValues } = values;
      const payload = {
        ...factoryValues,
        mobile: values.mobile
          ? `${phoneAreaCode || '+86'} ${values.mobile}`
          : '',
        id: factoryId,
        orgId: flattenLastValue(orgPath),
        factoryCode: values.factoryCode || `${Date.now()}`,
      };
      if (factoryId) await updateMonitorFactory(payload);
      else await createMonitorFactory(payload);
      message.success(
        factoryId
          ? I18N.cbamMonitor.factoryUpdated
          : I18N.cbamMonitor.factoryCreated,
      );
      form.resetFields();
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      className={styles.factoryDrawer}
      width={564}
      title={
        <CbamDrawerTitle>
          {factoryId
            ? I18N.cbamMonitor.editFactory
            : I18N.cbamMonitor.addFactory}
        </CbamDrawerTitle>
      }
      open={open}
      closable={false}
      destroyOnClose
      onClose={onClose}
      extra={
        <CbamDrawerClose label={I18N.cbamMonitor.close} onClick={onClose} />
      }
      footer={
        <div className={styles.drawerFooter}>
          <Button onClick={onClose}>{I18N.cbamMonitor.cancel}</Button>
          <Button type='primary' loading={saving} onClick={submit}>
            {I18N.cbamMonitor.confirm}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout='vertical'
        requiredMark
        onValuesChange={changed =>
          Object.keys(changed)
            .filter(key => key !== 'orgPath')
            .forEach(key => touched.current.add(key))
        }
      >
        <div className={styles.drawerSectionTitle}>
          {I18N.cbamMonitor.relatedInformation}
        </div>
        <Form.Item name='orgPath' label={I18N.cbamMonitor.relatedEntity}>
          <Cascader
            className={styles.factoryOrgCascader}
            popupClassName={styles.factoryOrgCascaderPopup}
            fieldNames={{ label: 'name', value: 'id' }}
            options={orgOptions}
          />
        </Form.Item>
        <div className={styles.drawerSectionTitle}>
          {I18N.cbamMonitor.factoryIdentificationAndAddress}
        </div>
        <div className={styles.drawerGrid}>
          <Form.Item
            name='factorName'
            label={I18N.cbamMonitor.factoryName}
            rules={[{ required: true, max: 40 }]}
          >
            <Input placeholder={I18N.cbamMonitor.enter} />
          </Form.Item>
          <Form.Item
            name='factoryNameEn'
            label={I18N.cbam.factoryNameInEnglish}
            rules={[{ max: 100 }]}
          >
            <Input maxLength={100} placeholder={I18N.cbamMonitor.enter} />
          </Form.Item>
          <Form.Item
            name='factoryCode'
            label={
              <CbamFieldLabel hint={I18N.cbamMonitor.uniqueIdentifierHint}>
                {I18N.cbamMonitor.uniqueIdentifier}
              </CbamFieldLabel>
            }
            rules={[{ required: true, max: 40 }]}
          >
            <Input placeholder={I18N.cbamMonitor.enter} />
          </Form.Item>
          <Form.Item
            name='locationCode'
            label={
              <CbamFieldLabel hint={I18N.cbamMonitor.locationCodeHint}>
                {I18N.cbamMonitor.locationCode}
              </CbamFieldLabel>
            }
            rules={[{ required: true, max: 20 }]}
          >
            <Input placeholder={I18N.cbamMonitor.enter} />
          </Form.Item>
          <Form.Item
            name='postalCode'
            label={I18N.cbamMonitor.postalCode}
            rules={[{ required: true, max: 40 }]}
          >
            <Input placeholder={I18N.cbamMonitor.enter} />
          </Form.Item>
          <Form.Item
            name='country'
            label={I18N.cbamMonitor.country}
            rules={[{ required: true, max: 40 }]}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp='label'
              options={countryOptions}
              placeholder={I18N.carbonFootprint.pleaseSelect}
            />
          </Form.Item>
          <Form.Item
            name='city'
            label={I18N.cbamMonitor.city}
            rules={[{ required: true, max: 40 }]}
          >
            <Input placeholder={I18N.cbamMonitor.enter} />
          </Form.Item>
          <Form.Item
            name='detailedAddress'
            label={I18N.cbamMonitor.chineseAddress}
            rules={[{ required: true, max: 200 }]}
          >
            <Input placeholder={I18N.cbamMonitor.enter} />
          </Form.Item>
          <Form.Item
            name='addressEn'
            label={I18N.cbamMonitor.englishAddress}
            rules={[{ required: true, max: 200 }]}
          >
            <Input placeholder={I18N.cbamMonitor.enter} />
          </Form.Item>
          <FactoryLocationFields
            form={form}
            open={open}
            factoryId={factoryId}
            disabled={saving}
          />
          <Form.Item
            name='economicActivity'
            label={I18N.cbamMonitor.economicActivity}
            rules={[{ max: 20 }]}
          >
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item
            name='postOfficeBox'
            label={I18N.cbamMonitor.postOfficeBox}
            rules={[{ max: 20 }]}
          >
            <Input maxLength={20} />
          </Form.Item>
        </div>
        <div className={styles.drawerSectionTitle}>
          {I18N.cbamMonitor.contactInformation}
        </div>
        <div className={styles.drawerGrid}>
          <Form.Item
            name='authorizedRepresentative'
            label={I18N.cbamMonitor.authorizedRepresentative}
            rules={[{ max: 20 }]}
          >
            <Input maxLength={20} />
          </Form.Item>
          <Form.Item
            name='email'
            label={I18N.cbamMonitor.factoryEmail}
            rules={[{ type: 'email' }, { max: 40 }]}
          >
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item
            name='mobile'
            label={I18N.cbamMonitor.factoryPhone}
            rules={[{ max: 20 }]}
          >
            <Input
              maxLength={20}
              addonBefore={
                <Form.Item name='phoneAreaCode' noStyle>
                  <Select
                    showSearch
                    options={
                      phoneCodes.length
                        ? phoneCodes
                        : [{ label: '+86', value: '+86' }]
                    }
                    style={{ width: 90 }}
                  />
                </Form.Item>
              }
            />
          </Form.Item>
        </div>
      </Form>
    </Drawer>
  );
};
