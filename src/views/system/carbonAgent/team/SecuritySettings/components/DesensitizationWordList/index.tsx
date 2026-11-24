import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import classNames from 'classnames';
import { useMemo, useState } from 'react';

import { teamApi } from '../../../api';
import { errorText } from '../../../errors';
import { dateTimeText, downloadCsv } from '../../../helpers';
import { teamText } from '../../../i18n';
import {
  DESENSITIZATION_BATCH_MAX_COUNT,
  DESENSITIZATION_REPLACEMENT_MAX_LENGTH,
  DESENSITIZATION_TOTAL_MAX_COUNT,
  DESENSITIZATION_WORD_MAX_LENGTH,
  DESENSITIZATION_WORD_MIN_LENGTH,
  parseBatchDesensitizationWords,
} from '../../../securityHelpers';
import type {
  DesensitizationWord,
  DesensitizationWordInput,
} from '../../../types';
import { QueryState } from '../../../ui';
import { useWorkspace } from '../../../workspace';
import style from './index.module.less';

type DesensitizationWordListProps = {
  disabled: boolean;
};

const CATEGORY_KEYS = [
  'securityCategoryCompany',
  'securityCategoryCustomer',
  'securityCategoryProject',
  'securityCategoryCustom',
] as const;

const DesensitizationWordList = ({
  disabled,
}: DesensitizationWordListProps) => {
  const { key, refresh } = useWorkspace();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [editingWord, setEditingWord] = useState<
    DesensitizationWord | 'new' | undefined
  >(undefined);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRaw, setBatchRaw] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string>('');
  const [form] = Form.useForm<DesensitizationWordInput>();

  const wordsQuery = useQuery(
    [...key, 'security-words', keyword, pageNum],
    () =>
      teamApi.desensitizationWords({
        keyword: keyword || undefined,
        pageNum,
        pageSize: 10,
      }),
  );

  const categoryOptions = CATEGORY_KEYS.map(itemKey => ({
    value: teamText(itemKey),
    label: teamText(itemKey),
  }));

  const batchPreview = useMemo(
    () =>
      parseBatchDesensitizationWords(
        batchRaw,
        (wordsQuery.data?.rows || []).map(item => item.word),
      ),
    [batchRaw, wordsQuery.data?.rows],
  );

  const invalidateWords = () => {
    queryClient.invalidateQueries({ queryKey: [...key, 'security-words'] });
    refresh();
  };

  const openSingleModal = (target: DesensitizationWord | 'new') => {
    setEditingWord(target);
    form.resetFields();
    if (target === 'new') {
      form.setFieldsValue({
        category: teamText('securityCategoryCustom'),
        enabled: true,
      });
      return;
    }
    form.setFieldsValue({
      word: target.word,
      replacement: target.replacement || '',
      category: target.category || teamText('securityCategoryCustom'),
      enabled: target.enabled,
    });
  };

  const handleSaveSingle = async () => {
    if (saving || !editingWord) return;
    let values: DesensitizationWordInput;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload: DesensitizationWordInput = {
      word: values.word.trim(),
      replacement: values.replacement?.trim() || undefined,
      category: values.category?.trim() || undefined,
      enabled: values.enabled ?? true,
    };
    setSaving(true);
    try {
      if (editingWord === 'new') {
        await teamApi.createDesensitizationWords([payload]);
      } else {
        await teamApi.updateDesensitizationWord(editingWord.id, payload);
      }
      message.success(teamText('securityWordSaved'));
      setEditingWord(undefined);
      invalidateWords();
    } catch (failure) {
      message.error(errorText(failure));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBatch = async () => {
    if (saving) return;
    if (!batchPreview.items.length) {
      message.warning(teamText('securityBatchEmptyWarning'));
      return;
    }
    if (batchPreview.items.length > DESENSITIZATION_BATCH_MAX_COUNT) {
      message.warning(
        teamText('securityBatchLimitWarning', {
          value0: DESENSITIZATION_BATCH_MAX_COUNT,
        }),
      );
      return;
    }
    setSaving(true);
    try {
      await teamApi.createDesensitizationWords(batchPreview.items);
      message.success(
        teamText('securityWordAddedCount', {
          value0: batchPreview.items.length,
        }),
      );
      setBatchOpen(false);
      setBatchRaw('');
      setPageNum(1);
      invalidateWords();
    } catch (failure) {
      message.error(errorText(failure));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (
    row: DesensitizationWord,
    enabled: boolean,
  ) => {
    if (togglingId) return;
    setTogglingId(row.id);
    try {
      await teamApi.updateDesensitizationWord(row.id, {
        word: row.word,
        replacement: row.replacement,
        category: row.category,
        enabled,
      });
      invalidateWords();
    } catch (failure) {
      message.error(errorText(failure));
    } finally {
      setTogglingId('');
    }
  };

  const handleDelete = async (row: DesensitizationWord) => {
    try {
      await teamApi.deleteDesensitizationWord(row.id);
      message.success(teamText('securityWordDeleted'));
      invalidateWords();
    } catch (failure) {
      message.error(errorText(failure));
    }
  };

  const handleExport = () => {
    const rows = wordsQuery.data?.rows || [];
    downloadCsv(teamText('securityDesensitizationSectionTitle'), rows, [
      { title: teamText('securityWordColumn'), value: row => row.word },
      {
        title: teamText('securityReplacementColumn'),
        value: row => row.replacement || '',
      },
      {
        title: teamText('securityCategoryColumn'),
        value: row => row.category || '',
      },
      {
        title: teamText('securityWordStatusColumn'),
        value: row =>
          row.enabled ? teamText('enabled') : teamText('disabled'),
      },
      {
        title: teamText('securityWordUpdatedAtColumn'),
        value: row => dateTimeText(row.updateTime),
      },
    ]);
  };

  const totalCount = wordsQuery.data?.total ?? 0;

  return (
    <section
      className={classNames(style.card, { [style.cardDisabled]: disabled })}
    >
      <div className={style.header}>
        <div>
          <h3>{teamText('securityDesensitizationSectionTitle')}</h3>
          <p>{teamText('securityDesensitizationSectionDescription')}</p>
        </div>
        <span className={style.countBadge}>
          {teamText('securityWordCountSummary', {
            value0: totalCount,
            value1: DESENSITIZATION_TOTAL_MAX_COUNT,
          })}
        </span>
      </div>

      <div className={style.toolbar}>
        <Input
          className={style.searchInput}
          allowClear
          prefix={<SearchOutlined />}
          placeholder={teamText('securitySearchWords')}
          aria-label={teamText('securitySearchWords')}
          value={searchInput}
          onChange={event => {
            const next = event.target.value;
            setSearchInput(next);
            if (!next) {
              setKeyword('');
              setPageNum(1);
            }
          }}
          onPressEnter={() => {
            setKeyword(searchInput.trim());
            setPageNum(1);
          }}
        />
        <div className={style.toolbarActions}>
          <Button
            icon={<DownloadOutlined />}
            disabled={!wordsQuery.data?.rows?.length}
            onClick={handleExport}
          >
            {teamText('securityExportWords')}
          </Button>
          <Button
            disabled={disabled}
            onClick={() => {
              setBatchRaw('');
              setBatchOpen(true);
            }}
          >
            {teamText('securityBatchAddWords')}
          </Button>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            disabled={disabled}
            onClick={() => openSingleModal('new')}
          >
            {teamText('securityAddWord')}
          </Button>
        </div>
      </div>

      <QueryState query={wordsQuery}>
        <Table<DesensitizationWord>
          rowKey='id'
          scroll={{ x: 760 }}
          dataSource={wordsQuery.data?.rows || []}
          locale={{
            emptyText: <Empty description={teamText('securityWordsEmpty')} />,
          }}
          pagination={{
            current: pageNum,
            pageSize: 10,
            total: totalCount,
            showSizeChanger: false,
            showTotal: total => teamText('valueRecords', { value0: total }),
            onChange: setPageNum,
          }}
          columns={[
            {
              title: teamText('securityWordColumn'),
              dataIndex: 'word',
              width: 220,
            },
            {
              title: teamText('securityReplacementColumn'),
              dataIndex: 'replacement',
              render: (value?: string) =>
                value || (
                  <span className={style.autoPlaceholder}>
                    {teamText('securityReplacementAuto')}
                  </span>
                ),
            },
            {
              title: teamText('securityCategoryColumn'),
              dataIndex: 'category',
              width: 140,
              render: (value?: string) => (value ? <Tag>{value}</Tag> : '—'),
            },
            {
              title: teamText('securityWordStatusColumn'),
              dataIndex: 'enabled',
              width: 100,
              render: (enabled: boolean, row) => (
                <Switch
                  size='small'
                  checked={enabled}
                  disabled={disabled}
                  loading={togglingId === row.id}
                  onChange={next => handleToggleEnabled(row, next)}
                />
              ),
            },
            {
              title: teamText('securityWordUpdatedAtColumn'),
              dataIndex: 'updateTime',
              width: 180,
              render: dateTimeText,
            },
            {
              title: teamText('actions'),
              width: 130,
              render: (_, row) => (
                <Space size={12}>
                  <Button
                    type='link'
                    icon={<EditOutlined />}
                    disabled={disabled}
                    onClick={() => openSingleModal(row)}
                  >
                    {teamText('edit')}
                  </Button>
                  <Popconfirm
                    title={teamText('securityDeleteWordConfirm', {
                      value0: row.word,
                    })}
                    disabled={disabled}
                    onConfirm={() => handleDelete(row)}
                  >
                    <Button
                      type='link'
                      danger
                      icon={<DeleteOutlined />}
                      disabled={disabled}
                    >
                      {teamText('securityDeleteWord')}
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </QueryState>

      <Modal
        title={
          editingWord === 'new'
            ? teamText('securityAddWord')
            : teamText('securityEditWord')
        }
        open={Boolean(editingWord)}
        confirmLoading={saving}
        onOk={handleSaveSingle}
        onCancel={() => setEditingWord(undefined)}
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            name='word'
            label={teamText('securityWordColumn')}
            rules={[
              {
                required: true,
                whitespace: true,
                min: DESENSITIZATION_WORD_MIN_LENGTH,
                max: DESENSITIZATION_WORD_MAX_LENGTH,
                message: teamText('securityWordRequired'),
              },
            ]}
          >
            <Input
              maxLength={DESENSITIZATION_WORD_MAX_LENGTH}
              placeholder={teamText('securityWordPlaceholder')}
            />
          </Form.Item>
          <Form.Item
            name='replacement'
            label={teamText('securityReplacementColumn')}
          >
            <Input
              maxLength={DESENSITIZATION_REPLACEMENT_MAX_LENGTH}
              placeholder={teamText('securityReplacementPlaceholder')}
            />
          </Form.Item>
          <Form.Item name='category' label={teamText('securityCategoryColumn')}>
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item
            name='enabled'
            label={teamText('securityWordStatusColumn')}
            valuePropName='checked'
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={teamText('securityBatchAddWords')}
        open={batchOpen}
        confirmLoading={saving}
        onOk={handleSaveBatch}
        onCancel={() => setBatchOpen(false)}
      >
        <p className={style.batchHint}>
          {teamText('securityBatchInputHint', {
            value0: DESENSITIZATION_BATCH_MAX_COUNT,
          })}
        </p>
        <Input.TextArea
          rows={7}
          value={batchRaw}
          aria-label={teamText('securityBatchInputLabel')}
          placeholder={teamText('securityBatchInputPlaceholder')}
          onChange={event => setBatchRaw(event.target.value)}
        />
        {batchRaw.trim() ? (
          <div className={style.batchSummary}>
            {teamText('securityBatchValidationSummary', {
              value0: batchPreview.items.length,
              value1: batchPreview.duplicateWords.length,
              value2: batchPreview.invalidWords.length,
            })}
          </div>
        ) : null}
      </Modal>
    </section>
  );
};

export default DesensitizationWordList;
