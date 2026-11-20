import I18N from '@src/lang/I18N';
import {
  Alert,
  Button,
  Descriptions,
  // Collapse,
  Input,
  Popconfirm,
  Select,
  Space,
  Spin,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCompetitionModels,
  openCompetitionResult,
  getCompetitionSubmission,
  mutation,
  resetCompetitionMaterial,
  resolveCompetitionModel,
  retryCompetitionSnapshot,
  saveCompetitionMaterial,
  statusLabel,
  submitCompetitionMaterial,
} from '../../../../service';
import type {
  Model,
  ModelRef,
  Overview,
  Page,
  PreparedModel,
  Submission,
  Task,
} from '../../../../types';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
export default function MaterialSubmission({
  event,
  task,
  reload,
  readOnly = false,
}: {
  event: Overview;
  task: Task;
  reload: () => Promise<void>;
  readOnly?: boolean;
}) {
  const [models, setModels] = useState<Page<Model>>();
  const [modelsLoading, setModelsLoading] = useState(false);
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<PreparedModel>();
  const [selectionChanged, setSelectionChanged] = useState(false);
  const [submission, setSubmission] = useState<Submission>();
  const [keyword, setKeyword] = useState('');
  const modelRequest = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const modelLabels = useRef(new Map<string, string>());
  const [year, setYear] = useState('');
  // 暂停分享链接解析入口，恢复时一并启用状态与 Collapse。
  // const [shareUrl, setShareUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable =
    !readOnly &&
    task.status === 'DRAFT' &&
    task.phaseStatus === 'OPEN' &&
    (!submission || submission.status === 'DRAFT');
  const canSubmit = !!selected || (!selectionChanged && !!submission?.model);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  };
  const refresh = useCallback(async () => {
    if (task.submissionId)
      setSubmission(
        await getCompetitionSubmission(event.id, task.submissionId),
      );
  }, [event.id, task.submissionId]);
  useEffect(() => {
    setSelected(undefined);
    setSelectionChanged(false);
    setChoices([]);
    run(refresh);
  }, [refresh, task.submissionVersion]);
  useEffect(
    () => () => {
      clearTimeout(searchTimer.current);
      modelRequest.current += 1;
    },
    [],
  );
  const query = async (pageNum = 1, search = keyword, modelYear = year) => {
    modelRequest.current += 1;
    const revision = modelRequest.current;
    setModelsLoading(true);
    try {
      const result = await getCompetitionModels(event.id, task.taskCode, {
        pageNum,
        pageSize: 10,
        keyword: search,
        year: modelYear,
      });
      if (revision !== modelRequest.current) return;
      result.rows.forEach(model =>
        modelLabels.current.set(JSON.stringify(model.model), model.title),
      );
      setModels(previous => ({
        ...result,
        rows:
          pageNum === 1
            ? result.rows
            : [...(previous?.rows || []), ...result.rows],
      }));
    } catch (reason) {
      if (revision === modelRequest.current)
        setError(
          reason instanceof Error && reason.message ? reason.message : t.failed,
        );
    } finally {
      if (revision === modelRequest.current) setModelsLoading(false);
    }
  };
  const searchModels = (value: string) => {
    clearTimeout(searchTimer.current);
    modelRequest.current += 1;
    setKeyword(value);
    setModels(undefined);
    setModelsLoading(true);
    searchTimer.current = setTimeout(() => query(1, value), 300);
  };
  const selectModels = async (value: string | string[]) => {
    const values = Array.isArray(value) ? value : [value];
    setChoices(values);
    setSelected(undefined);
    setSelectionChanged(true);
    if (!values.length) return;
    const refs: ModelRef[] = values.map(v => JSON.parse(v));
    if (
      task.taskCode === 'C_ENTERPRISE' &&
      refs.length === 1 &&
      !refs[0].computationIds
    ) {
      const selectedYear = refs[0].year || '';
      setYear(selectedYear);
      setChoices([]);
      clearTimeout(searchTimer.current);
      setKeyword('');
      await query(1, '', selectedYear);
      return;
    }
    if (
      task.taskCode === 'C_ENTERPRISE' &&
      refs.some(ref => ref.year !== refs[0].year)
    )
      throw new Error(t.sameYear);
    const model: ModelRef =
      task.taskCode === 'C_PRODUCT'
        ? refs[0]
        : {
            year: refs[0].year,
            computationIds: refs.flatMap(ref => ref.computationIds || []),
          };
    setSelected(
      await resolveCompetitionModel(event.id, task.taskCode, { model }),
    );
  };
  const saveSelectedModel = async () => {
    if (!selected) return submission;
    const saved = await saveCompetitionMaterial(event.id, task.taskCode, {
      ...mutation(event.code, submission?.version ?? task.submissionVersion),
      model: selected.model,
      sourceVersion: selected.sourceVersion,
    });
    setSubmission(saved);
    setSelected(undefined);
    setSelectionChanged(false);
    return saved;
  };
  if (!task.submissionId)
    return (
      <section className={styles.panel}>
        <label htmlFor={`competition-model-${task.taskCode}`}>
          {t.taskUi.modelLabel}
        </label>
        <Select
          id={`competition-model-${task.taskCode}`}
          disabled
          placeholder={t.taskUi.modelLabel}
          aria-label={t.taskUi.modelLabel}
        />
      </section>
    );
  return (
    <section className={styles.panel}>
      {error && <Alert role='alert' type='error' showIcon message={error} />}
      {task.status === 'SUBMITTED' && (
        <p className={styles.hint}>{t.taskUi.submittedHint}</p>
      )}
      {editable && (
        <>
          <label htmlFor={`competition-model-${task.taskCode}`}>
            {t.taskUi.modelLabel}
          </label>
          <Select
            id={`competition-model-${task.taskCode}`}
            showSearch
            filterOption={false}
            onSearch={searchModels}
            onDropdownVisibleChange={open => {
              if (open && !models && !busy && !modelsLoading) query();
            }}
            onPopupScroll={e => {
              const list = e.currentTarget;
              if (
                !modelsLoading &&
                models &&
                models.rows.length < models.total &&
                list.scrollTop + list.clientHeight >= list.scrollHeight - 24
              )
                query(models.pageNum + 1);
            }}
            loading={modelsLoading}
            notFoundContent={modelsLoading ? <Spin size='small' /> : undefined}
            placeholder={t.taskUi.modelSearchPlaceholder}
            labelRender={({ value, label }) =>
              label || modelLabels.current.get(String(value))
            }
            aria-label={t.taskUi.modelLabel}
            mode={task.taskCode === 'C_ENTERPRISE' ? 'multiple' : undefined}
            value={task.taskCode === 'C_ENTERPRISE' ? choices : choices[0]}
            disabled={busy}
            options={models?.rows.map(model => ({
              value: JSON.stringify(model.model),
              label: model.title,
            }))}
            onChange={value => run(() => selectModels(value))}
          />
          {task.taskCode === 'C_ENTERPRISE' && (
            <Input
              aria-label={t.modelYear}
              placeholder={t.modelYear}
              value={year}
              disabled={busy}
              onChange={e => setYear(e.target.value)}
              onBlur={() => {
                clearTimeout(searchTimer.current);
                query();
              }}
              onPressEnter={() => {
                clearTimeout(searchTimer.current);
                query();
              }}
            />
          )}
          {/* 暂停分享链接解析，保留实现供后续恢复。
          <Collapse
            ghost
            className={styles.tools}
            items={[
              {
                key: 'tools',
                label: t.taskUi.modelTools,
                children: (
                  <div className={styles.toolFields}>
                    <Space wrap>
                      <Input
                        aria-label={t.modelShareLink}
                        placeholder={t.modelShareLink}
                        value={shareUrl}
                        onChange={e => setShareUrl(e.target.value)}
                      />
                      <Button
                        disabled={busy || !shareUrl.trim()}
                        onClick={() =>
                          run(async () => {
                            clearTimeout(searchTimer.current);
                            modelRequest.current += 1;
                            setModelsLoading(false);
                            setSelected(undefined);
                            setSelectionChanged(true);
                            setChoices([]);
                            const resolved = await resolveCompetitionModel(
                              event.id,
                              task.taskCode,
                              { shareUrl: shareUrl.trim() },
                            );
                            if (resolved.candidates)
                              setModels(resolved.candidates);
                            else setSelected(resolved);
                          })
                        }
                      >
                        {t.resolveModel}
                      </Button>
                    </Space>
                  </div>
                ),
              },
            ]}
          />
          */}
          {selected && (
            <Descriptions size='small' column={1} title={t.selectedModel}>
              <Descriptions.Item label={t.modelName}>
                {selected.summary.title}
              </Descriptions.Item>
            </Descriptions>
          )}
        </>
      )}
      {submission?.model && (
        <Descriptions size='small' column={1} title={t.savedModel}>
          <Descriptions.Item label={t.modelName}>
            {submission.summary?.title || t.noModel}
          </Descriptions.Item>
          <Descriptions.Item label={t.status}>
            {statusLabel(submission.status)}
          </Descriptions.Item>
          {submission.snapshotErrorCode && (
            <Descriptions.Item label={t.reason}>
              {submission.snapshotErrorCode}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
      <Space wrap className={styles.actions}>
        {editable && (
          <Button
            disabled={busy || !selected}
            onClick={() =>
              run(async () => {
                await saveSelectedModel();
                await reload();
              })
            }
          >
            {t.saveDraft}
          </Button>
        )}
        {editable && (
          <Popconfirm
            title={t.confirmMaterial}
            disabled={busy || !canSubmit}
            onConfirm={() =>
              run(async () => {
                if (!canSubmit) return;
                // 先保存当前选择，再用返回的版本和内容摘要提交，用户无需手动保存草稿。
                const draft = await saveSelectedModel();
                if (!draft?.model) return;
                setSubmission(
                  await submitCompetitionMaterial(event.id, draft.id, {
                    ...mutation(event.code, draft.version),
                    contentHash: draft.contentHash,
                  }),
                );
                await reload();
              })
            }
          >
            <Button type='primary' loading={busy} disabled={busy || !canSubmit}>
              {t.submitMaterial}
            </Button>
          </Popconfirm>
        )}
        {!readOnly && task.status === 'SNAPSHOTTING' && (
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                setSubmission(
                  await retryCompetitionSnapshot(
                    event.id,
                    task.submissionId!,
                    mutation(event.code),
                  ),
                );
                await reload();
              })
            }
          >
            {t.retrySnapshot}
          </Button>
        )}
        {!readOnly && submission?.canReset && task.phaseStatus === 'OPEN' && (
          <Popconfirm
            title={t.resetDraftHint}
            onConfirm={() =>
              run(async () => {
                setSubmission(
                  await resetCompetitionMaterial(
                    event.id,
                    task.submissionId!,
                    mutation(event.code, submission.version),
                  ),
                );
                await reload();
              })
            }
          >
            <Button disabled={busy}>{t.resetDraft}</Button>
          </Popconfirm>
        )}
        {task.status === 'SUBMITTED' && (
          <Button
            disabled={busy}
            onClick={() =>
              run(() => openCompetitionResult(event.id, task.submissionId!))
            }
          >
            {t.viewSnapshot}
          </Button>
        )}
      </Space>
    </section>
  );
}
