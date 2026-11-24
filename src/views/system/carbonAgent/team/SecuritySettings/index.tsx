import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Modal, Switch, Tag, message } from 'antd';
import { useState } from 'react';

import { teamApi } from '../api';
import securityIcon from '../assets/security.svg';
import { errorText } from '../errors';
import { teamText } from '../i18n';
import type { SecurityConfig, SecurityConfigUpdate } from '../types';
import { PageTitle, QueryState } from '../ui';
import { useWorkspace } from '../workspace';
import DesensitizationWordList from './components/DesensitizationWordList';
import ModelRegionCard from './components/ModelRegionCard';
import SharePolicyCard from './components/SharePolicyCard';
import style from './index.module.less';

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enabled: false,
  modelRegion: 'DOMESTIC',
  allowSessionShare: false,
  version: 0,
};

export const SecuritySettings = () => {
  const { key, refresh } = useWorkspace();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const configQuery = useQuery(
    [...key, 'security-config'],
    teamApi.securityConfig,
  );

  const config = configQuery.data || DEFAULT_SECURITY_CONFIG;

  const updateConfig = async (
    patch: Partial<Omit<SecurityConfigUpdate, 'version'>>,
  ) => {
    if (saving || !configQuery.data) return;
    const payload: SecurityConfigUpdate = {
      enabled: patch.enabled ?? config.enabled,
      modelRegion: patch.modelRegion ?? config.modelRegion,
      allowSessionShare: patch.allowSessionShare ?? config.allowSessionShare,
      version: config.version,
    };
    setSaving(true);
    try {
      const saved = await teamApi.saveSecurityConfig(payload);
      queryClient.setQueryData([...key, 'security-config'], saved);
      refresh();
      message.success(teamText('securityConfigSaved'));
    } catch (failure) {
      message.error(errorText(failure));
      configQuery.refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMaster = (nextEnabled: boolean) => {
    Modal.confirm({
      title: nextEnabled
        ? teamText('securityModeToggleEnableTitle')
        : teamText('securityModeToggleDisableTitle'),
      content: nextEnabled
        ? teamText('securityModeToggleEnableContent')
        : teamText('securityModeToggleDisableContent'),
      onOk: () => updateConfig({ enabled: nextEnabled }),
    });
  };

  return (
    <div className={style.page}>
      <PageTitle
        title={teamText('securitySettings')}
        description={teamText('securitySettingsDescription')}
      />
      <QueryState query={configQuery}>
        <section className={style.masterCard}>
          <div className={style.masterInfo}>
            <img className={style.masterIcon} src={securityIcon} alt='' />
            <div>
              <div className={style.masterTitleRow}>
                <h2>{teamText('securityModeTitle')}</h2>
                <Tag color={config.enabled ? 'cyan' : 'default'}>
                  {config.enabled
                    ? teamText('securityModeEnabledTag')
                    : teamText('securityModeDisabledTag')}
                </Tag>
              </div>
              <p className={style.masterDesc}>
                {teamText('securityModeDescription')}
              </p>
            </div>
          </div>
          <Switch
            checked={config.enabled}
            loading={saving}
            aria-label={teamText('securityModeTitle')}
            onChange={handleToggleMaster}
          />
        </section>

        {!config.enabled ? (
          <Alert
            className={style.disabledAlert}
            type='info'
            showIcon
            message={teamText('securityModeDisabledNotice')}
          />
        ) : null}

        <ModelRegionCard
          disabled={!config.enabled}
          saving={saving}
          value={config.modelRegion}
          onChange={modelRegion => updateConfig({ modelRegion })}
        />

        <DesensitizationWordList disabled={!config.enabled} />

        <SharePolicyCard
          allowSessionShare={config.allowSessionShare}
          disabled={!config.enabled}
          saving={saving}
          onChange={allowSessionShare => updateConfig({ allowSessionShare })}
        />
      </QueryState>
    </div>
  );
};

export default SecuritySettings;
