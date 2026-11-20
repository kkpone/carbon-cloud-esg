import { request, ResponseData } from '@/api/request';
import I18N, { getCurrentLocale, LocaleType } from '@/lang/I18N';
import { ExclamationCircleFilled, LoadingOutlined } from '@ant-design/icons';
import { Button, Form, message, Modal, Segmented, Table, Tag } from 'antd';
import { get } from 'lodash-es';
import {
  createContext,
  ReactNode,
  Key,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
} from 'react';
import type { FormInstance } from 'antd';
import type { TranslationGroup, TranslationTask } from './types';
import styles from './index.module.less';
import globalAiIcon from './global-ai.svg';
import globalIconBackground from './global-icon-background.svg';
import globalFold from './global-fold.svg';
import modalClose from './modal-close.svg';
import confirmStyles from '@/views/cbamMonitor/deleteConfirm.module.less';

interface TranslationContextValue {
  groups: TranslationGroup[];
  english: Record<string, boolean>;
  readonly: boolean;
  busy: boolean;
  setLanguage: (groupId: string, english: boolean) => void;
  translate: (groupId: string) => Promise<void>;
  globalDisabled: boolean;
  globalStatus: TranslationGroup['operationStatus'];
  openGlobal: () => Promise<void>;
  write: (fieldId: string, value: string) => void;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);
const TranslationScope = createContext<{
  path: (string | number)[];
  form: FormInstance;
} | null>(null);

/** 在更新 React 状态前拒绝不完整回执，避免空字段组触发渲染崩溃。 */
function validateTranslationTask(task: TranslationTask) {
  if (
    !task ||
    !Array.isArray(task.groups) ||
    task.groups.some(group => !group || !Array.isArray(group.fields))
  ) {
    throw new Error(I18N.cbamMonitor.translationInvalidTask);
  }
}

/** 全局任务只在所有组成功时显示完成，部分失败仍提示失败。 */
function getTaskStatus(
  task: TranslationTask,
): TranslationGroup['operationStatus'] {
  if (task.running) return 'RUNNING';
  if (task.groups.some(group => group.operationStatus === 'FAILED'))
    return 'FAILED';
  return task.groups.length ? 'COMPLETED' : 'NOT_STARTED';
}

/** 抽屉中的英文先保留在抽屉Form，取消不写回父页面。 */
export function CbamTranslationInputScope({
  path,
  form,
  children,
}: {
  path: (string | number)[];
  form: FormInstance;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ path, form }), [path, form]);
  return (
    <TranslationScope.Provider value={value}>
      {children}
    </TranslationScope.Provider>
  );
}

/** 全局翻译执行中仍可打开任务弹框查看逐组进度。 */
export function CbamTranslationGlobalButton() {
  const context = useContext(TranslationContext);
  if (!context) return null;
  const translating = context.globalStatus === 'RUNNING';
  return (
    <span className={styles.globalActions}>
      <Button
        className={`${styles.globalButton} ${
          translating ? styles.translatingButton : ''
        }`}
        disabled={context.globalDisabled}
        onClick={context.openGlobal}
      >
        <span className={styles.globalButtonIcon} aria-hidden='true'>
          <img
            className={styles.globalIconBackground}
            src={globalIconBackground}
            alt=''
          />
          <img className={styles.globalFold} src={globalFold} alt='' />
          {translating ? (
            <LoadingOutlined className={styles.globalLoadingIcon} spin />
          ) : (
            <img className={styles.globalAiIcon} src={globalAiIcon} alt='' />
          )}
        </span>
        <span className={styles.globalButtonLabel}>
          {I18N.cbamMonitor.translationGlobal}
        </span>
      </Button>
    </span>
  );
}

/** 固定组的语言切换与同步翻译，字段名称保持原页面语言。 */
export function CbamTranslationControls({ groupId }: { groupId?: string }) {
  const context = useContext(TranslationContext);
  const group = context?.groups.find(item => item.groupId === groupId);
  if (!context || !groupId) return null;
  const translating = group?.operationStatus === 'RUNNING';
  return (
    <span className={styles.actions} onClick={event => event.stopPropagation()}>
      {!context.readonly && group?.fields.some(field => field.editable) && (
        <Button
          className={`${styles.aiButton} ${
            translating ? styles.translatingButton : ''
          }`}
          loading={translating}
          disabled={context.busy}
          onClick={() => context.translate(groupId)}
        >
          {I18N.cbamMonitor.translationLocal}
        </Button>
      )}
      <Segmented
        className={styles.languageSwitch}
        disabled={!group}
        value={context.english[groupId] ? 'en' : 'zh'}
        options={[
          { label: I18N.cbamMonitor.translationChinese, value: 'zh' },
          { label: I18N.cbamMonitor.translationEnglish, value: 'en' },
        ]}
        onChange={value => context.setLanguage(groupId, value === 'en')}
      />
    </span>
  );
}

/** 保存适配器由各页面提供，避免翻译组件重写业务草稿或日期转换。 */
export default function CbamTranslation({
  module,
  id,
  form,
  getPayload,
  writeEnglish,
  onVersion,
  readonly = false,
  showGlobalButton = true,
  children,
}: {
  module: 'monitor' | 'operation';
  id?: string | number;
  form: FormInstance;
  getPayload: () => unknown;
  writeEnglish: (fieldId: string, value: string) => void;
  onVersion: (version: number) => void;
  readonly?: boolean;
  showGlobalButton?: boolean;
  children: ReactNode;
}) {
  Form.useWatch([], { form, preserve: true });
  const callbacks = useRef({ getPayload, writeEnglish, onVersion });
  callbacks.current = { getPayload, writeEnglish, onVersion };
  const [storedGroups, setGroups] = useState<TranslationGroup[]>([]);
  // 未手动切换的字段组跟随登录界面语言，保留各组的手动选择。
  const defaultEnglish = getCurrentLocale() === LocaleType.enUS;
  const [english, setEnglish] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Key[]>([]);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [globalStatus, setGlobalStatus] =
    useState<TranslationGroup['operationStatus']>('NOT_STARTED');
  // 局部执行结果不落库，单独保存以免被历史全局任务的轮询回执覆盖。
  const [localOperations, setLocalOperations] = useState<
    Record<string, Pick<TranslationGroup, 'operationStatus' | 'error'>>
  >({});
  const applied = useRef(new Set<string>());
  const waiting = useRef(false);
  const observedTask = useRef<string>();
  // 新任务启动时唤醒查询，完成或 Redis 状态过期后不再轮询。
  const resumePolling = useRef<() => void>(() => {});
  const base = `/cbam2/translation/${module}/${id}`;
  // 观察Form是为了反映英文手工编辑；不因每次输入重新请求后端。
  const payload = callbacks.current.getPayload();
  // 行数、适用性及自定义频次变化时刷新字段清单；普通文本输入只更新本地状态。
  const shape = JSON.stringify(payload, (key, value) => {
    if (typeof value === 'string') return key === 'frequency' ? value : '';
    if (typeof value === 'number') return 0;
    return value;
  });
  const groups = storedGroups.map(group => {
    const fields = group.fields.map(field => ({
      ...field,
      text: get(payload, field.fieldId, field.text),
      textEn: get(payload, `${field.fieldId}En`, field.textEn),
    }));
    const required = fields.filter(field => String(field.text || '').trim());
    const completed = required.filter(field =>
      String(field.textEn || '').trim(),
    ).length;
    const status: TranslationGroup['status'] =
      completed === required.length
        ? 'TRANSLATED'
        : completed
        ? 'PARTIAL'
        : 'UNTRANSLATED';
    return { ...group, ...localOperations[group.groupId], fields, status };
  });

  const api = async <T,>(suffix: string, body?: unknown) => {
    const response = await request<ResponseData<T>>({
      url: `${base}/${suffix}`,
      method: body === undefined ? 'GET' : 'POST',
      data: body,
    });
    if (!response.data || response.data.code !== 200)
      throw new Error(response.data?.msg || I18N.cbamMonitor.translationFailed);
    return response.data.data;
  };
  const body = (groupIds: string[] = []) => ({
    groupIds,
    [module]: callbacks.current.getPayload(),
  });
  const refresh = async () => {
    const result = await api<TranslationGroup[]>('groups', body());
    setGroups(current =>
      (result || []).map(group => ({
        ...group,
        operationStatus:
          current.find(value => value.groupId === group.groupId)
            ?.operationStatus || group.operationStatus,
      })),
    );
    return result || [];
  };
  const apply = (group: TranslationGroup) => {
    group.fields.forEach(field => {
      if (
        field.editable &&
        field.textEn &&
        !get(callbacks.current.getPayload(), `${field.fieldId}En`)
      )
        callbacks.current.writeEnglish(field.fieldId, field.textEn);
    });
    setEnglish(current => ({ ...current, [group.groupId]: true }));
  };

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    let timer: number | undefined;
    let inFlight = false;
    let continuePolling = false;
    applied.current.clear();
    observedTask.current = undefined;
    setLocalOperations({});
    setGlobalStatus('NOT_STARTED');
    const poll = async () => {
      if (!active || inFlight) return;
      window.clearTimeout(timer);
      inFlight = true;
      try {
        const response = await request<ResponseData<TranslationTask | null>>({
          url: `${base}/tasks/current`,
          method: 'GET',
        });
        if (!active || response.data?.code !== 200) return;
        const task = response.data.data;
        if (!task) {
          continuePolling = false;
          waiting.current = false;
          setRunning(false);
          setGlobalStatus('NOT_STARTED');
          return;
        }
        continuePolling = task.running;
        // 同一份历史回执只处理一次，避免覆盖局部执行和本次提交失败的反馈。
        const taskToken = JSON.stringify(task);
        if (observedTask.current === taskToken) return;
        observedTask.current = taskToken;
        validateTranslationTask(task);
        if (task.running) waiting.current = true;
        else if (waiting.current) {
          waiting.current = false;
          if (task.groups.some(group => group.operationStatus === 'FAILED'))
            message.error(I18N.cbamMonitor.translationFailed);
          else message.success(I18N.cbamMonitor.translationCompleted);
        }
        setRunning(task.running);
        setGlobalStatus(getTaskStatus(task));
        setGroups(current => {
          const next = [...current];
          task.groups.forEach(group => {
            const index = next.findIndex(
              value => value.groupId === group.groupId,
            );
            if (index < 0) next.push(group);
            else next[index] = group;
          });
          return next;
        });
        task.groups
          .filter(group => group.operationStatus === 'COMPLETED')
          .forEach(group => {
            const token = `${group.groupId}:${JSON.stringify(
              group.fields.map(field => [field.fieldId, field.textEn]),
            )}`;
            if (!applied.current.has(token)) {
              // 只补页面尚为空的英文，不覆盖用户刚手工输入的英文。
              group.fields.forEach(field => {
                if (
                  field.editable &&
                  field.textEn &&
                  !get(callbacks.current.getPayload(), `${field.fieldId}En`) &&
                  get(callbacks.current.getPayload(), field.fieldId) ===
                    field.text
                ) {
                  callbacks.current.writeEnglish(field.fieldId, field.textEn);
                }
              });
              // 全局任务只补写英文，保留用户当前语言，避免自动切换后误以为中文内容丢失。
              applied.current.add(token);
            }
          });
        if (
          task.dataVersion !== undefined &&
          task.dataVersion >
            Number(get(callbacks.current.getPayload(), 'dataVersion', -1))
        )
          callbacks.current.onVersion(task.dataVersion);
      } catch (error) {
        // 暂时无法查询不等于任务已停止，保留运行状态防止重复提交。
        if (
          error instanceof Error &&
          error.message === I18N.cbamMonitor.translationInvalidTask
        ) {
          continuePolling = false;
          message.error(error.message);
        }
      } finally {
        inFlight = false;
        if (active && continuePolling) {
          timer = window.setTimeout(poll, 2000);
        }
      }
    };
    resumePolling.current = () => {
      continuePolling = true;
      poll();
    };
    poll();
    return () => {
      active = false;
      resumePolling.current = () => {};
      window.clearTimeout(timer);
    };
    // 任务按模块与记录隔离；通过ref读取最新页面保存适配器。
  }, [base, id]);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      api<TranslationGroup[]>('groups', body())
        .then(result => {
          if (active)
            setGroups(current =>
              (result || []).map(group => ({
                ...group,
                operationStatus:
                  current.find(value => value.groupId === group.groupId)
                    ?.operationStatus || group.operationStatus,
              })),
            );
        })
        .catch(error => {
          if (active)
            message.error(
              error instanceof Error
                ? error.message
                : I18N.cbamMonitor.translationFailed,
            );
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [base, id, shape]);

  const translate = async (groupId: string) => {
    if (busy || running) return;
    setBusy(true);
    setLocalOperations(current => ({
      ...current,
      [groupId]: { operationStatus: 'RUNNING' },
    }));
    setGroups(current =>
      current.map(group =>
        group.groupId === groupId
          ? { ...group, operationStatus: 'RUNNING' }
          : group,
      ),
    );
    try {
      const group = await api<TranslationGroup>('translate', body([groupId]));
      apply(group);
      setLocalOperations(current => ({
        ...current,
        [groupId]: { operationStatus: group.operationStatus },
      }));
      setGroups(current => [
        ...current.filter(value => value.groupId !== groupId),
        group,
      ]);
      message.success(I18N.cbamMonitor.translationCompleted);
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : I18N.cbamMonitor.translationFailed;
      setLocalOperations(current => ({
        ...current,
        [groupId]: { operationStatus: 'FAILED', error: errorText },
      }));
      message.error(errorText);
      setGroups(current =>
        current.map(group =>
          group.groupId === groupId
            ? { ...group, operationStatus: 'FAILED' }
            : group,
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const start = async () => {
    setBusy(true);
    setGlobalStatus('RUNNING');
    try {
      const task = await api<TranslationTask>(
        'tasks',
        body(selected.map(String)),
      );
      validateTranslationTask(task);
      waiting.current = task.running;
      setLocalOperations(current =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([groupId]) =>
              !task.groups.some(group => group.groupId === groupId),
          ),
        ),
      );
      setGlobalStatus(getTaskStatus(task));
      setRunning(task.running);
      setGroups(current =>
        current.map(
          group =>
            task.groups.find(value => value.groupId === group.groupId) || group,
        ),
      );
      setSelected([]);
      if (task.running) resumePolling.current();
    } catch (error) {
      setGlobalStatus('FAILED');
      message.error(
        error instanceof Error
          ? error.message
          : I18N.cbamMonitor.translationFailed,
      );
    } finally {
      setBusy(false);
    }
  };
  const confirmTranslation = (
    action: () => Promise<void>,
    title = I18N.cbamMonitor.translationLocal,
  ) => {
    // 复用监测计划删除确认的样式，长提示完整换行，确认操作仍沿用翻译流程。
    Modal.confirm({
      className: confirmStyles.deleteConfirmModal,
      wrapClassName: confirmStyles.deleteConfirmWrap,
      centered: true,
      width: 444,
      icon: null,
      closable: true,
      title,
      content: (
        <div
          className={`${confirmStyles.deleteConfirmContent} ${confirmStyles.multilineContent}`}
        >
          <ExclamationCircleFilled
            className={confirmStyles.deleteConfirmIcon}
          />
          <span>{I18N.cbamMonitor.translationSkipExisting}</span>
        </div>
      ),
      okText: I18N.cbamMonitor.confirm,
      cancelText: I18N.cbamMonitor.cancel,
      onOk: action,
    });
  };
  const contentLabels = {
    UNTRANSLATED: I18N.cbamMonitor.translationUntranslated,
    PARTIAL: I18N.cbamMonitor.translationPartial,
    TRANSLATED: I18N.cbamMonitor.translationTranslated,
  };
  // 字段组名称复用所属页面的标题文案，避免直接展示后端固定的中文名称。
  const groupNames: Record<string, string> =
    module === 'monitor'
      ? {
          PLAN_IDENTITY: I18N.cbamMonitor.planDateAndVersion,
          FACILITY: I18N.cbamMonitor.operatorFacilityIdentification,
          PRODUCT_COMPOSITION: I18N.cbamMonitor.productListComposition,
          PRECURSOR_SUPPLIER_ORIGIN: I18N.cbamMonitor.purchasedPrecursors,
          PROCESS_GOODS: I18N.cbamMonitor.processGoodsMapping,
          NON_CBAM_GOODS: I18N.cbamMonitor.nonCbamGoodsAllocation,
          SYSTEM_BOUNDARY: I18N.cbamMonitor.systemBoundaryDiagram,
          DATA_MONITOR_METHOD: I18N.cbamMonitor.processMonitoringMethods,
          FACTOR_SAMPLING: I18N.cbamMonitor.calculationFactorsSampling,
          PFC_MONITOR: I18N.cbamMonitor.pfcMonitoring,
          ZERO_RATED_FUEL: I18N.cbamMonitor.zeroRatedFuels,
          MEASURABLE_HEAT: I18N.cbamMonitor.measurableHeatFlows,
          ELECTRICITY_FACTOR: I18N.cbamMonitor.completionElectricityFactor,
          FACILITY_ELECTRICITY: I18N.cbamMonitor.onsiteElectricityEvidence,
          WASTE_GAS: I18N.cbamMonitor.wasteGasTransfers,
          CO2_STAGE: I18N.cbamMonitor.co2CaptureUse,
          MANAGEMENT: I18N.cbamMonitor.managementResponsibilitiesEvaluation,
          DATA_FLOW: I18N.cbamMonitor.dataFlowActivities,
          CONTROL_ACTIVITY: I18N.cbamMonitor.controlActivities,
          OTHER_PROCEDURE: I18N.cbamMonitor.otherProcedures,
        }
      : {
          REPORT_INFO: I18N.cbamOperationReport.reportInformation,
          OPERATOR_INFO: I18N.cbamOperationReport.operatorInformation,
          PROCESS_BOUNDARY: I18N.cbamOperationReport.onsiteProcessBoundary,
          PROCESS_INFO: I18N.cbamOperationReport.productionProcessInformation,
          CBAM_PRODUCT: I18N.cbamOperationReport.cbamProducts,
          PRECURSOR: I18N.cbamOperationReport.purchasedCbamPrecursors,
          DIRECT_EMISSION: I18N.cbamOperationReport.directEmissions,
          NON_CBAM_PRODUCT: I18N.cbamOperationReport.nonCbamProducts,
          ELECTRICITY: I18N.cbamOperationReport.electricityConsumption,
          HEAT_FLOW: I18N.cbamOperationReport.heatFlows,
          WASTE_GAS: I18N.cbamOperationReport.wasteGas,
          ZERO_RATED_FUEL: I18N.cbamOperationReport.zeroRatedFuels,
          FACILITY_ELECTRICITY:
            I18N.cbamOperationReport.onsiteElectricityGeneration,
          CO2_STAGE: I18N.cbamOperationReport.co2CaptureTransferUseStorage,
          INDUSTRY: I18N.cbamOperationReport.industryParameters,
          QUALITY: I18N.cbamOperationReport.preparationAndReview,
          DATA_GAP: I18N.cbamOperationReport.dataGaps,
        };
  // 页面工具栏与默认入口共用选择逻辑，不改变全局异步翻译流程。
  const openGlobal = async () => {
    try {
      const result = await refresh();
      setSelected(
        result
          .filter(
            group =>
              group.status === 'UNTRANSLATED' &&
              group.operationStatus !== 'RUNNING' &&
              group.fields.some(
                field =>
                  field.editable && field.text?.trim() && !field.textEn?.trim(),
              ),
          )
          .map(group => group.groupId),
      );
      setOpen(true);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : I18N.cbamMonitor.translationFailed,
      );
    }
  };
  const contextValue = useMemo<TranslationContextValue>(
    () => ({
      groups,
      english: Object.fromEntries(
        groups.map(group => [
          group.groupId,
          english[group.groupId] ?? defaultEnglish,
        ]),
      ),
      readonly,
      busy: busy || running || !id,
      setLanguage: (groupId, value) =>
        setEnglish(current => ({ ...current, [groupId]: value })),
      translate,
      globalDisabled: !id,
      globalStatus,
      openGlobal,
      write: (fieldId, value) => callbacks.current.writeEnglish(fieldId, value),
    }),
    [
      groups,
      english,
      defaultEnglish,
      readonly,
      busy,
      running,
      id,
      globalStatus,
    ],
  );
  return (
    <TranslationContext.Provider value={contextValue}>
      {showGlobalButton && (
        <div className={styles.toolbar}>
          <CbamTranslationGlobalButton />
        </div>
      )}
      {children}
      <Modal
        title={I18N.cbamMonitor.translationGlobal}
        open={open}
        className={styles.translationModal}
        closeIcon={<img src={modalClose} alt='' />}
        width={764}
        onCancel={() => setOpen(false)}
        confirmLoading={busy}
        okText={I18N.cbamMonitor.translationSubmit}
        okButtonProps={{ disabled: readonly || !selected.length || running }}
        onOk={() =>
          confirmTranslation(start, I18N.cbamMonitor.translationGlobal)
        }
      >
        <Table
          className={styles.translationTable}
          rowKey='groupId'
          pagination={false}
          dataSource={groups}
          rowSelection={{
            columnWidth: 48,
            selectedRowKeys: selected,
            onChange: setSelected,
            getCheckboxProps: group => ({
              disabled:
                readonly ||
                group.operationStatus === 'RUNNING' ||
                !group.fields.some(
                  field =>
                    field.editable &&
                    field.text?.trim() &&
                    !field.textEn?.trim(),
                ),
            }),
          }}
          columns={[
            {
              title: I18N.cbamMonitor.translationGroup,
              dataIndex: 'groupName',
              render: (name: string, group) =>
                groupNames[group.groupId] ?? name,
              width: 352,
            },
            {
              title: I18N.cbamMonitor.translationStatus,
              render: (_, group) => (
                <Tag
                  className={`${styles.translationStatus} ${
                    group.status === 'TRANSLATED'
                      ? styles.translatedStatus
                      : styles.untranslatedStatus
                  }`}
                  title={group.error}
                >
                  {group.operationStatus === 'RUNNING'
                    ? I18N.cbamMonitor.translationRunning
                    : group.operationStatus === 'FAILED'
                    ? I18N.cbamMonitor.translationFailed
                    : contentLabels[group.status]}
                </Tag>
              ),
            },
          ]}
        />
      </Modal>
    </TranslationContext.Provider>
  );
}

/** 常规输入框在组切换为英文时改读写英文属性，保留共享数值和原有中文校验。 */
export function useTranslationInput(fieldId?: string, controlId?: string) {
  const context = useContext(TranslationContext);
  const scope = useContext(TranslationScope);
  Form.useWatch([], { form: scope?.form, preserve: true });
  if (!context) return undefined;
  const scopedId =
    scope && controlId
      ? [...scope.path, ...controlId.split('_')].join('.')
      : undefined;
  const localPath =
    controlId
      ?.split('_')
      .map(part => (/^\d+$/.test(part) ? Number(part) : part)) || [];
  if (localPath.length)
    localPath[localPath.length - 1] = `${localPath[localPath.length - 1]}En`;
  for (const group of context.groups) {
    const field = group.fields.find(
      value =>
        value.fieldId === fieldId ||
        value.fieldId === scopedId ||
        Boolean(
          controlId &&
            (controlId === value.fieldId.replaceAll('.', '_') ||
              controlId.endsWith(`_${value.fieldId.replaceAll('.', '_')}`)),
        ),
    );
    if (field)
      return {
        english: Boolean(context.english[group.groupId]),
        translating:
          group.operationStatus === 'RUNNING' &&
          field.editable &&
          Boolean(field.text?.trim()) &&
          !field.textEn?.trim(),
        field:
          scope && controlId
            ? {
                ...field,
                textEn: scope.form.getFieldValue(localPath) ?? field.textEn,
              }
            : field,
        readonly: context.readonly || !field.editable,
        write: (value: string) => {
          if (scope && controlId) scope.form.setFieldValue(localPath, value);
          else context.write(field.fieldId, value);
        },
      };
  }
  return undefined;
}

/** 表格显示与输入框沿用同一个字段组语言，标签和枚举保持不变。 */
export function useCbamTranslationValue() {
  const context = useContext(TranslationContext);
  return (fieldId: string, fallback: string): string => {
    const group = context?.groups.find(item =>
      item.fields.some(field => field.fieldId === fieldId),
    );
    return group && context?.english[group.groupId]
      ? group.fields.find(field => field.fieldId === fieldId)?.textEn || ''
      : fallback;
  };
}

/** 只读来源信息根据当前组切换显示，英文仍由监测计划维护。 */
export function useCbamTranslationText() {
  const context = useContext(TranslationContext);
  return (groupId: string, text: unknown, textEn: unknown): string =>
    String((context?.english[groupId] ? textEn : text) || '');
}

/** 固定枚举复用所属字段组的英文状态，枚举编码和业务数据保持原值。 */
export function useCbamTranslationEnglish(groupId: string) {
  const context = useContext(TranslationContext);
  return Boolean(context?.english[groupId]);
}
