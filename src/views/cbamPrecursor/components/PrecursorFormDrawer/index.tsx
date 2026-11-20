import I18N from '@src/lang/I18N';
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Select,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';

import CbamFieldLabel from '@/components/CbamFieldLabel';
import FileUpload from '@/components/FileUpload';
import {
  CbamDrawerClose,
  CbamDrawerTitle,
} from '@/components/CbamDrawerHeader';
import { Dicts } from '@/hooks';

import { isIndirectEmissionRequired } from '../../emissionRules';
import { createPrecursor } from '../../service';
import { PrecursorCnCard, PrecursorFileObject } from '../../types';
import styles from './index.module.less';

interface FormValues {
  cnCode: string;
  precursorName: string;
  supplierName: string;
  sourceFacility: string;
  countryValue: string;
  directEmission: string;
  indirectEmission?: string;
  electricityUsage?: string;
  electricityFactor?: string;
  verifierName: string;
  reportNo: string;
  reportYear: number;
  issueDate: Dayjs;
  expiryDate: Dayjs;
  verificationRange: [Dayjs, Dayjs];
}

interface Props {
  open: boolean;
  cnOptions: PrecursorCnCard[];
  countryOptions: Dicts[];
  initialCn?: PrecursorCnCard;
  onClose: () => void;
  onSaved: (cn: PrecursorCnCard) => void;
}
const maxNineDecimalRule = {
  validator: (_: unknown, value?: string | number | null) => {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      /^\d+(?:\.\d{1,9})?$/.test(String(value))
    ) {
      return Promise.resolve();
    }
    return Promise.reject(new Error(I18N.cbamPrecursor.maxNineDecimalPlaces));
  },
};

export const PrecursorFormDrawer = ({
  open,
  cnOptions,
  countryOptions,
  initialCn,
  onClose,
  onSaved,
}: Props) => {
  const [form] = Form.useForm<FormValues>();
  const [files, setFiles] = useState<PrecursorFileObject[]>([]);
  const [saving, setSaving] = useState(false);
  const selectedCnCode = Form.useWatch('cnCode', form);
  const selectedCn = useMemo(
    () => cnOptions.find(item => item.cnCode === selectedCnCode),
    [cnOptions, selectedCnCode],
  );
  useEffect(() => {
    if (!open) return;
    const china = countryOptions.find(
      item =>
        item.relatedValue?.toUpperCase() === 'CN' || item.dictLabel === '中国',
    );
    form.resetFields();
    setFiles([]);
    form.setFieldsValue({
      cnCode: initialCn?.cnCode || cnOptions[0]?.cnCode,
      countryValue: china?.dictValue,
      reportYear: dayjs().year(),
    });
  }, [cnOptions, countryOptions, form, initialCn, open]);
  const submit = async () => {
    const values = await form.validateFields();
    if (!files.length) {
      message.error(I18N.cbamPrecursor.reportFilesRequired);
      return;
    }
    if (!selectedCn) return;
    setSaving(true);
    try {
      await createPrecursor({
        ...values,
        issueDate: values.issueDate.format('YYYY-MM-DD'),
        expiryDate: values.expiryDate.format('YYYY-MM-DD'),
        verificationStartDate: values.verificationRange[0].format('YYYY-MM-DD'),
        verificationEndDate: values.verificationRange[1].format('YYYY-MM-DD'),
        files,
      });
      onSaved(selectedCn);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Drawer
      rootClassName={styles.drawer}
      title={<CbamDrawerTitle>{I18N.cbamPrecursor.add}</CbamDrawerTitle>}
      width={604}
      open={open}
      closable={false}
      destroyOnClose
      onClose={onClose}
      extra={<CbamDrawerClose onClick={onClose} />}
      footer={
        <div className={styles.footer}>
          <Button onClick={onClose}>{I18N.cbamPrecursor.cancel}</Button>
          <Button type='primary' loading={saving} onClick={submit}>
            {I18N.cbamPrecursor.confirm}
          </Button>
        </div>
      }
    >
      <Form className={styles.form} form={form} layout='vertical' requiredMark>
        <section className={styles.section}>
          <h3>{I18N.cbamPrecursor.basicInfo}</h3>
          <div className={styles.sectionFields}>
            <Form.Item name='cnCode' label={I18N.cbamPrecursor.cnCode}>
              <Select
                showSearch
                optionFilterProp='label'
                placeholder={I18N.cbamPrecursor.select}
                options={cnOptions.map(item => ({
                  value: item.cnCode,
                  label: `${item.cnCode} / ${item.cnName || '-'}`,
                }))}
              />
            </Form.Item>
            <div className={styles.grid}>
              <Form.Item
                name='precursorName'
                label={I18N.cbamPrecursor.precursorName}
                rules={[{ required: true }, { max: 40 }]}
              >
                <Input maxLength={40} placeholder={I18N.cbamPrecursor.input} />
              </Form.Item>
              <Form.Item
                name='supplierName'
                label={I18N.cbamPrecursor.supplier}
                rules={[{ required: true }, { max: 40 }]}
              >
                <Input maxLength={40} placeholder={I18N.cbamPrecursor.input} />
              </Form.Item>
              <Form.Item
                name='sourceFacility'
                label={I18N.cbamPrecursor.sourceFacility}
                rules={[{ required: true }, { max: 40 }]}
              >
                <Input maxLength={40} placeholder={I18N.cbamPrecursor.input} />
              </Form.Item>
              <Form.Item
                name='countryValue'
                label={I18N.cbamPrecursor.sourceCountry}
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp='label'
                  placeholder={I18N.cbamPrecursor.input}
                  options={countryOptions.map(item => ({
                    value: item.dictValue,
                    label: item.dictLabel,
                  }))}
                />
              </Form.Item>
            </div>
          </div>
        </section>
        <section className={styles.section}>
          <h3>{I18N.cbamPrecursor.emissionInfo}</h3>
          <div className={styles.grid}>
            <Form.Item
              name='directEmission'
              label={I18N.cbamPrecursor.directEmission}
              rules={[{ required: true }, maxNineDecimalRule]}
            >
              <InputNumber
                stringMode
                min='0'
                maxLength={40}
                controls={false}
                addonAfter='tCO₂e/t'
                placeholder={I18N.cbamPrecursor.input}
                className={styles.full}
              />
            </Form.Item>
            <Form.Item
              name='indirectEmission'
              label={
                <CbamFieldLabel hint={I18N.cbamPrecursor.indirectEmissionHint}>
                  {I18N.cbamPrecursor.indirectEmission}
                </CbamFieldLabel>
              }
              dependencies={['cnCode']}
              rules={[
                { required: isIndirectEmissionRequired(selectedCnCode) },
                maxNineDecimalRule,
              ]}
            >
              <InputNumber
                stringMode
                min='0'
                maxLength={40}
                controls={false}
                addonAfter='tCO₂e/t'
                placeholder={I18N.cbamPrecursor.input}
                className={styles.full}
              />
            </Form.Item>
            <Form.Item
              name='electricityUsage'
              label={I18N.cbamPrecursor.electricityUsage}
              rules={[maxNineDecimalRule]}
            >
              <InputNumber
                stringMode
                min='0'
                maxLength={40}
                controls={false}
                addonAfter='MWh'
                placeholder={I18N.cbamPrecursor.input}
                className={styles.full}
              />
            </Form.Item>
            <Form.Item
              name='electricityFactor'
              label={I18N.cbamPrecursor.electricityFactor}
              rules={[maxNineDecimalRule]}
            >
              <InputNumber
                stringMode
                min='0'
                maxLength={40}
                controls={false}
                addonAfter='tCO₂e/MWh'
                placeholder={I18N.cbamPrecursor.input}
                className={styles.full}
              />
            </Form.Item>
          </div>
        </section>
        <section className={styles.section}>
          <h3>{I18N.cbamPrecursor.verificationInfo}</h3>
          <div className={styles.grid}>
            <Form.Item
              name='verifierName'
              label={I18N.cbamPrecursor.verifierName}
              rules={[{ required: true }, { max: 40 }]}
            >
              <Input maxLength={40} placeholder={I18N.cbamPrecursor.input} />
            </Form.Item>
            <Form.Item
              name='reportNo'
              label={I18N.cbamPrecursor.reportNo}
              rules={[{ required: true }, { max: 40 }]}
            >
              <Input maxLength={40} placeholder={I18N.cbamPrecursor.input} />
            </Form.Item>
            <Form.Item
              name='reportYear'
              label={I18N.cbamPrecursor.reportYear}
              rules={[{ required: true }]}
            >
              <InputNumber
                min={1900}
                max={9999}
                precision={0}
                controls={false}
                placeholder={I18N.cbamPrecursor.input}
                className={styles.full}
              />
            </Form.Item>
            <Form.Item
              name='issueDate'
              label={I18N.cbamPrecursor.issueDate}
              rules={[{ required: true }]}
            >
              <DatePicker
                placeholder={I18N.cbamPrecursor.select}
                className={styles.full}
              />
            </Form.Item>
            <Form.Item
              name='expiryDate'
              label={I18N.cbamPrecursor.expiryDate}
              rules={[{ required: true }]}
            >
              <DatePicker
                placeholder={I18N.cbamPrecursor.select}
                className={styles.full}
              />
            </Form.Item>
            <Form.Item
              className={styles.fullRow}
              name='verificationRange'
              label={I18N.cbamPrecursor.verificationPeriod}
              rules={[{ required: true }]}
            >
              <DatePicker.RangePicker className={styles.full} />
            </Form.Item>
          </div>
          <Form.Item
            className={styles.uploadField}
            label={I18N.cbamPrecursor.reportFiles}
            required
          >
            <div className={styles.uploadTip}>
              {I18N.cbamPrecursor.uploadTip}
            </div>
            <FileUpload
              detailed
              singleColumn
              showDownload={false}
              buttonClassName={styles.uploadButton}
              buttonText={I18N.cbamPrecursor.uploadFile}
              fileList={files.map((file, index) => ({
                ...file,
                uid: `${file.url || file.name || index}-${index}`,
                name: file.name || '',
                size: Number(file.size),
                displaySize: file.size
                  ? `${(Number(file.size) / 1024).toFixed(2)} KB`
                  : undefined,
              }))}
              fileSize={20}
              fileCount={10}
              fileTypeList={['pdf', 'doc', 'docx']}
              uploadAction='/file/file/uploadOSS'
              onChange={items =>
                setFiles(
                  items.map(item => ({
                    name: item.name,
                    size: item.size ? `${item.size}` : undefined,
                    unit: item.size ? 'B' : undefined,
                    url: item.url,
                    uploadTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  })),
                )
              }
            />
          </Form.Item>
        </section>
      </Form>
    </Drawer>
  );
};
