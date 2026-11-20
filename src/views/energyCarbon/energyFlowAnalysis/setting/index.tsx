import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：能流设置 - 按组织维护六阶段开关和能源、边界选择
 * 路由：/energyCarbon/energyFlowAnalysis/setting
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  Button,
  Card,
  Empty,
  Form,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Tree,
  Typography,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import { type Key, useEffect, useMemo, useState } from 'react';

import { z } from 'zod';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import type { OrgTree } from '@/views/energyCarbon/platform/types';

import {
  ENERGY_FLOW_SETTING_BUTTON_PERMISSION,
  ENERGY_FLOW_SETTING_PAGE_PERMISSION,
  getEnergyFlowStage,
} from './constant';
import { useEnergyFlowSettingDetail, useSaveEnergyFlowSetting } from './hooks';
import type {
  EnergyFlowOption,
  EnergyFlowSettingDetail,
  EnergyFlowSettingForm,
} from './types';

import { useEnergyEnum } from '../../hooks/useEnergyEnum';
import styles from './index.module.css';

const searchSchema = z.object({
  orgId: z.coerce.number().int().positive().optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_FLOW_SETTING_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyFlowSettingPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

const EMPTY_FORM: EnergyFlowSettingForm = {
  storageEnabled: false,
  storageBoundaryIds: [],
  energyTransmissionEnabled: false,
  energyConversionEnabled: false,
  conversionTransmissionEnabled: false,
  energyInputIds: [],
  energyTransmissionIds: [],
  energyConversionIds: [],
  conversionTransmissionIds: [],
  energyUseIds: [],
};

/** 将能流详情转换为表单字段，取消编辑时复用同一份服务端快照。 */
function getSettingFormValues(
  detail: EnergyFlowSettingDetail,
): EnergyFlowSettingForm {
  return {
    storageEnabled: detail.storageEnabled ?? false,
    storageBoundaryIds: detail.storageBoundaryIds ?? [],
    energyTransmissionEnabled: detail.energyTransmissionEnabled,
    energyConversionEnabled: detail.energyConversionEnabled,
    conversionTransmissionEnabled: detail.conversionTransmissionEnabled,
    energyInputIds: detail.energyInputIds,
    energyTransmissionIds: detail.energyTransmissionIds,
    energyConversionIds: detail.energyConversionIds,
    conversionTransmissionIds: detail.conversionTransmissionIds,
    energyUseIds: detail.energyUseIds,
  };
}

/** 在数据权限组织树中按 ID 查找组织。 */
function findOrgById(nodes: OrgTree[], orgId: number): OrgTree | null {
  for (const node of nodes) {
    if (node.id === orgId) return node;
    const child = node.children ? findOrgById(node.children, orgId) : null;
    if (child) return child;
  }
  return null;
}

/** 收集组织树根节点 ID，首次加载时默认展示前两层。 */
function getDefaultExpandedOrgKeys(nodes: OrgTree[]): Key[] {
  return nodes.map(node => String(node.id));
}

/** 能流设置组织树固定展示简称；缺少简称时回退组织名称。 */
function getOrgDisplayName(org: OrgTree): string {
  // 本期组织名称统一全称，保留上述历史简称说明。
  return org.name;
}

/** 转换组织树节点，禁用组织允许查看但不能保存。 */
function toTreeData(nodes: OrgTree[]): DataNode[] {
  return nodes.map(node => ({
    key: String(node.id),
    title: (
      <Typography.Text
        ellipsis={{ tooltip: getOrgDisplayName(node) }}
        className={node.orgStatus === 1 ? styles.disabledOrg : undefined}
      >
        <span data-testid={`energy-flow-setting-org-${node.id}`}>
          {getOrgDisplayName(node)}
        </span>
      </Typography.Text>
    ),
    children: toTreeData(node.children ?? []),
  }));
}

interface BoundaryStageProps {
  title: string;
  fieldName:
    | 'storageBoundaryIds'
    | 'energyTransmissionIds'
    | 'energyConversionIds'
    | 'conversionTransmissionIds'
    | 'energyUseIds';
  options: EnergyFlowOption[];
  enabled: boolean;
  disabled?: boolean;
  isEditing: boolean;
  switchName?:
    | 'storageEnabled'
    | 'energyTransmissionEnabled'
    | 'energyConversionEnabled'
    | 'conversionTransmissionEnabled';
}

/** 渲染边界阶段；编辑态使用开关维护状态，详情态显示文字状态，关闭后禁用选择器但不清空表单值。 */
function BoundaryStage({
  title,
  fieldName,
  options,
  enabled,
  disabled = false,
  isEditing,
  switchName,
}: BoundaryStageProps) {
  useLocale();
  return (
    <section className={styles.stage}>
      <div className={styles.stageHeading}>
        <span className={styles.stageTitle}>{title}</span>
        {switchName && isEditing ? (
          <Form.Item name={switchName} valuePropName='checked' noStyle>
            <Switch
              checkedChildren={I18N.common.actions.enable}
              unCheckedChildren={I18N.common.actions.close}
              disabled={disabled}
              data-testid={`energy-flow-setting-${fieldName}-switch`}
            />
          </Form.Item>
        ) : (
          <Tag color={enabled ? 'success' : undefined}>
            {enabled ? I18N.common.actions.enable : I18N.common.actions.close}
          </Tag>
        )}
      </div>
      <Form.Item name={fieldName} className={styles.stageField}>
        <Select
          mode='multiple'
          allowClear
          disabled={disabled || !enabled}
          placeholder={I18N.common.placeholder.select}
          options={options.map(option => ({
            label: (
              <Typography.Text ellipsis={{ tooltip: option.name }}>
                {option.name}
              </Typography.Text>
            ),
            value: option.id,
          }))}
          data-testid={`energy-flow-setting-${fieldName}`}
        />
      </Form.Item>
    </section>
  );
}

/**
 * 业务检索：能流设置 - 切换组织后独立加载并保存六阶段配置
 * 路由：/energyCarbon/energyFlowAnalysis/setting
 */
function EnergyFlowSettingPage() {
  useLocale();
  const stageEnums = useEnergyEnum('energyFlowStage');
  const navigate = useNavigate();
  const { orgId } = useEnergySearch(searchSchema);
  const [form] = Form.useForm<EnergyFlowSettingForm>();
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // 首先加载当前员工数据权限组织树，URL 组织失效时回退到第一个可见组织。
  const { data: orgTree = [], isLoading: orgTreeLoading } =
    useDataPermissionOrgTree();
  const selectedOrg = useMemo(
    () => (orgId === undefined ? null : findOrgById(orgTree, orgId)),
    [orgId, orgTree],
  );
  const treeData = useMemo(() => toTreeData(orgTree), [orgTree]);

  useEffect(() => {
    if (!orgTree.length) return;
    const targetOrg = selectedOrg ?? orgTree[0];
    if (!targetOrg || targetOrg.id === orgId) return;
    navigate({
      to: '/energyCarbon/energyFlowAnalysis/setting',
      replace: true,
      search: { orgId: targetOrg.id },
    });
  }, [navigate, orgId, orgTree, selectedOrg]);

  // 组织树首次返回时只展开根节点，默认展示前两层，深层组织由用户继续展开。
  useEffect(() => {
    if (!orgTree.length) return;
    setExpandedKeys(getDefaultExpandedOrgKeys(orgTree));
  }, [orgTree]);

  // 切换组织时立即清空旧表单，避免新接口返回前短暂显示上个组织的阶段选择。
  useEffect(() => {
    // 组织上下文变化后回到详情态，避免把上个组织的编辑权限带入新组织。
    setIsEditing(false);
    form.setFieldsValue(EMPTY_FORM);
  }, [form, orgId]);

  // 组织确定后独立请求其设置；响应同时提供能源和当前综合能耗边界选项。
  const { data: detail, isLoading: detailLoading } = useEnergyFlowSettingDetail(
    selectedOrg?.id,
    selectedOrg !== null,
  );
  useEffect(() => {
    if (!detail) return;
    form.setFieldsValue({
      ...getSettingFormValues(detail),
    });
  }, [detail, form]);

  const watchedStorageEnabled = Form.useWatch('storageEnabled', form);
  const storageEnabled = isEditing
    ? watchedStorageEnabled ?? false
    : detail?.storageEnabled ?? false;
  const watchedEnergyTransmissionEnabled = Form.useWatch(
    'energyTransmissionEnabled',
    form,
  );
  const watchedEnergyConversionEnabled = Form.useWatch(
    'energyConversionEnabled',
    form,
  );
  const watchedConversionTransmissionEnabled = Form.useWatch(
    'conversionTransmissionEnabled',
    form,
  );
  // 详情态的开关控件不挂载，状态必须取详情快照；编辑态才读取表单实时值。
  const energyTransmissionEnabled = isEditing
    ? watchedEnergyTransmissionEnabled ?? false
    : detail?.energyTransmissionEnabled ?? false;
  const energyConversionEnabled = isEditing
    ? watchedEnergyConversionEnabled ?? false
    : detail?.energyConversionEnabled ?? false;
  const conversionTransmissionEnabled = isEditing
    ? watchedConversionTransmissionEnabled ?? false
    : detail?.conversionTransmissionEnabled ?? false;
  const { mutate: saveSetting, isLoading: saving } = useSaveEnergyFlowSetting();
  const orgDisabled = selectedOrg?.orgStatus === 1;

  const cancelEditing = () => {
    // 取消只回退当前详情快照并退出编辑，不重新请求或写入服务端。
    form.resetFields();
    form.setFieldsValue(detail ? getSettingFormValues(detail) : EMPTY_FORM);
    setIsEditing(false);
  };

  return (
    <PageContainer
      title={I18N.energyCarbon.analysisFlowSettings}
      permissionKey={ENERGY_FLOW_SETTING_PAGE_PERMISSION}
      extra={
        <AuthButton permissionKey={ENERGY_FLOW_SETTING_BUTTON_PERMISSION.SAVE}>
          {isEditing ? (
            <Space size={8}>
              <Button
                htmlType='button'
                onClick={cancelEditing}
                data-testid='energy-flow-setting-cancel'
              >
                {I18N.common.actions.cancel}
              </Button>
              <Button
                type='primary'
                htmlType='submit'
                form='energy-flow-setting-form'
                disabled={!selectedOrg || orgDisabled}
                loading={saving}
                data-testid='energy-flow-setting-save'
              >
                {I18N.common.actions.save}
              </Button>
            </Space>
          ) : (
            <Button
              type='primary'
              htmlType='button'
              onClick={() => setIsEditing(true)}
              disabled={!selectedOrg || orgDisabled}
              data-testid='energy-flow-setting-edit'
            >
              {I18N.common.actions.edit}
            </Button>
          )}
        </AuthButton>
      }
    >
      <div className={styles.workspace}>
        <Card
          title={I18N.energyCarbon.organizationList}
          className={styles.treeCard}
        >
          <Spin spinning={orgTreeLoading}>
            {treeData.length ? (
              <Tree
                blockNode
                treeData={treeData}
                selectedKeys={selectedOrg ? [String(selectedOrg.id)] : []}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                onSelect={keys => {
                  const selectedId = Number(keys[0]);
                  if (!Number.isFinite(selectedId)) return;
                  navigate({
                    to: '/energyCarbon/energyFlowAnalysis/setting',
                    search: { orgId: selectedId },
                  });
                }}
                className={styles.tree}
                data-testid='energy-flow-setting-org-tree'
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={I18N.energyCarbon.noAccessibleOrganizations}
              />
            )}
          </Spin>
        </Card>

        <Card
          title={
            selectedOrg ? (
              <Typography.Text ellipsis={{ tooltip: selectedOrg.name }}>
                {selectedOrg.name}
              </Typography.Text>
            ) : (
              I18N.energyCarbon.analysisFlowStages
            )
          }
          className={styles.contentCard}
        >
          {selectedOrg ? (
            <Spin spinning={detailLoading}>
              <Form<EnergyFlowSettingForm>
                id='energy-flow-setting-form'
                form={form}
                initialValues={EMPTY_FORM}
                disabled={!isEditing}
                onFinish={values => {
                  // 只有编辑态且组织可写时才允许提交，防止详情态或禁用组织绕过按钮状态写入。
                  if (!isEditing || !selectedOrg || orgDisabled) return;
                  // 路由组织 ID 是当前业务上下文，数组空值统一为后端可识别的空集合。
                  saveSetting(
                    {
                      orgId: selectedOrg.id,
                      ...values,
                      storageEnabled: values.storageEnabled ?? false,
                      storageBoundaryIds: values.storageBoundaryIds ?? [],
                      energyInputIds: values.energyInputIds ?? [],
                      energyTransmissionIds: values.energyTransmissionIds ?? [],
                      energyConversionIds: values.energyConversionIds ?? [],
                      conversionTransmissionIds:
                        values.conversionTransmissionIds ?? [],
                      energyUseIds: values.energyUseIds ?? [],
                    },
                    {
                      // 保存成功后回到详情态，后续详情失效刷新负责反映服务端最终值。
                      onSuccess: () => setIsEditing(false),
                    },
                  );
                }}
              >
                <div className={styles.stageRail}>
                  <section className={styles.stage}>
                    <div className={styles.stageHeading}>
                      <span className={styles.stageTitle}>
                        {getEnergyFlowStage().ENERGY_INPUT}
                      </span>
                      <Tag color='success'>{I18N.common.actions.enable}</Tag>
                    </div>
                    <Form.Item
                      name='energyInputIds'
                      className={styles.stageField}
                    >
                      <Select
                        mode='multiple'
                        allowClear
                        disabled={!isEditing}
                        placeholder={I18N.common.placeholder.select}
                        options={(detail?.energyOptions ?? []).map(option => ({
                          label: (
                            <Typography.Text
                              ellipsis={{ tooltip: option.name }}
                            >
                              {option.name}
                            </Typography.Text>
                          ),
                          value: option.id,
                        }))}
                        data-testid='energy-flow-setting-energy-input'
                      />
                    </Form.Item>
                  </section>

                  <BoundaryStage
                    title={
                      stageEnums.data?.find(stage => Number(stage.code) === 7)
                        ?.name ?? I18N.energyCarbon.analysisEnergyStorage
                    }
                    fieldName='storageBoundaryIds'
                    switchName='storageEnabled'
                    enabled={storageEnabled}
                    disabled={!isEditing}
                    isEditing={isEditing}
                    options={detail?.boundaryOptions ?? []}
                  />
                  <BoundaryStage
                    title={getEnergyFlowStage().ENERGY_TRANSMISSION}
                    fieldName='energyTransmissionIds'
                    switchName='energyTransmissionEnabled'
                    enabled={energyTransmissionEnabled}
                    disabled={!isEditing}
                    isEditing={isEditing}
                    options={detail?.boundaryOptions ?? []}
                  />
                  <BoundaryStage
                    title={getEnergyFlowStage().ENERGY_CONVERSION}
                    fieldName='energyConversionIds'
                    switchName='energyConversionEnabled'
                    enabled={energyConversionEnabled}
                    disabled={!isEditing}
                    isEditing={isEditing}
                    options={detail?.boundaryOptions ?? []}
                  />
                  <BoundaryStage
                    title={getEnergyFlowStage().CONVERSION_TRANSMISSION}
                    fieldName='conversionTransmissionIds'
                    switchName='conversionTransmissionEnabled'
                    enabled={conversionTransmissionEnabled}
                    disabled={!isEditing}
                    isEditing={isEditing}
                    options={detail?.boundaryOptions ?? []}
                  />
                  <BoundaryStage
                    title={getEnergyFlowStage().ENERGY_USE}
                    fieldName='energyUseIds'
                    enabled
                    disabled={!isEditing}
                    isEditing={isEditing}
                    options={detail?.boundaryOptions ?? []}
                  />

                  <section className={styles.stage}>
                    <div className={styles.stageHeading}>
                      <span className={styles.stageTitle}>
                        {getEnergyFlowStage().USE_OR_LOSS}
                      </span>
                      <Tag color='success'>{I18N.common.actions.enable}</Tag>
                    </div>
                    <div className={styles.fixedResults}>
                      <Tag>{I18N.energyCarbon.analysisEffectiveUse}</Tag>
                      <Tag>{I18N.energyCarbon.analysisEnergyLoss}</Tag>
                    </div>
                  </section>
                </div>
              </Form>
            </Spin>
          ) : (
            <Empty description={I18N.energyCarbon.organizationRequired} />
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
