import I18N from '@src/lang/I18N';
import { Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { FC } from 'react';

import { getYear, uuid } from '@/utils';

import styles from './index.module.less';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_RATING_OPTIONS,
  DEFAULT_STANDARD_OPTIONS,
} from '../../mockService';
import { PreResearchProject } from '../../types';

export interface ICreateProjectModalProps {
  open: boolean;
  onCancel: () => void;
  onCreate: (project: PreResearchProject) => void;
}

type CreateFormValues = {
  projectName: string;
  companyName: string;
  period: string;
  industry: string;
  listingType: string;
  standards: string[];
  ratings: string[];
};

export const CreateProjectModal: FC<ICreateProjectModalProps> = ({
  open,
  onCancel,
  onCreate,
}) => {
  const [form] = Form.useForm<CreateFormValues>();

  const handleOk = async () => {
    const values = await form.validateFields();
    const project: PreResearchProject = {
      id: `pr-${uuid().slice(0, 8)}`,
      projectName: values.projectName.trim(),
      companyName: values.companyName.trim(),
      period: values.period,
      industry: values.industry.trim(),
      listingType: values.listingType,
      status: 'draft',
      updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
      selfMaterials: [],
      websiteHighlights: '',
      annualReportClues: '',
      departments: DEFAULT_DEPARTMENTS,
      standards: values.standards || [],
      ratings: values.ratings || [],
      peers: [],
      gapItems: [],
      benchmarkRows: [],
      highlightCases: [],
      interviewQuestions: [],
    };
    onCreate(project);
    form.resetFields();
  };

  return (
    <Modal
      title={I18N.esg.preResearchCreateModalTitle}
      open={open}
      width={620}
      destroyOnClose
      onCancel={onCancel}
      onOk={handleOk}
    >
      <Form
        form={form}
        className={styles.form}
        layout='vertical'
        initialValues={{
          period: String(new Date().getFullYear() - 1),
          listingType: 'A股上市公司（上交所主板）',
          standards: [DEFAULT_STANDARD_OPTIONS[0], DEFAULT_STANDARD_OPTIONS[2]],
          ratings: [DEFAULT_RATING_OPTIONS[0], DEFAULT_RATING_OPTIONS[2]],
        }}
      >
        <Form.Item
          name='companyName'
          label={I18N.esg.preResearchCompanyName}
          rules={[{ required: true }]}
        >
          <Input
            placeholder={I18N.esg.pleaseEnterTheCompany}
            onChange={e => {
              const curName = form.getFieldValue('projectName');
              const period = form.getFieldValue('period') || '';
              if (!curName) {
                form.setFieldValue(
                  'projectName',
                  `${e.target.value} ${period} ESG Stage 1`,
                );
              }
            }}
          />
        </Form.Item>
        <Form.Item
          name='projectName'
          label={I18N.esg.preResearchProjectName}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <div className={styles.gridRow}>
          <Form.Item
            name='period'
            label={I18N.esg.preResearchPeriod}
            rules={[{ required: true }]}
          >
            <Select
              options={getYear(2015, new Date().getFullYear()).map(y => ({
                label: String(y),
                value: String(y),
              }))}
            />
          </Form.Item>
          <Form.Item
            name='listingType'
            label={I18N.esg.preResearchListingType}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                {
                  label: 'A-Share (SSE / SZSE)',
                  value: 'A股上市公司（上交所主板）',
                },
                { label: 'HKEX Listed', value: '港股上市公司（HKEX）' },
                { label: 'A+H Dual Listed', value: 'A+H股两地上市公司' },
                {
                  label: 'Non-listed / Supply Chain',
                  value: '非上市 / 供应链出海企业',
                },
              ]}
            />
          </Form.Item>
        </div>
        <Form.Item
          name='industry'
          label={I18N.esg.preResearchIndustry}
          rules={[{ required: true }]}
        >
          <Input placeholder={I18N.esg.preResearchIndustry} />
        </Form.Item>
        <Form.Item name='standards' label={I18N.esg.referenceStandards}>
          <Select
            mode='multiple'
            options={DEFAULT_STANDARD_OPTIONS.map(s => ({
              label: s,
              value: s,
            }))}
          />
        </Form.Item>
        <Form.Item name='ratings' label={I18N.esg.esgRating}>
          <Select
            mode='multiple'
            options={DEFAULT_RATING_OPTIONS.map(r => ({ label: r, value: r }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
