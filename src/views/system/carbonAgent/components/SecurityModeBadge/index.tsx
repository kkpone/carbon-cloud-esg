import { FileProtectOutlined, SettingOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import classNames from 'classnames';

import { useMobile } from '@/hooks/use-mobile';
import { withCurrentLocalePrefix } from '@/router/localePath';

import securityIcon from '../../team/assets/security.svg';
import { TEAM_PATH } from '../../team/helpers';
import { teamText } from '../../team/i18n';
import {
  getWorkspaceSecurityPolicy,
  getZeroRetentionAgreementPath,
  isSecurityModeActive,
} from '../../team/securityHelpers';
import { useWorkspace } from '../../team/workspace';
import style from './index.module.less';

const SecurityModeBadge = () => {
  const { access } = useWorkspace();
  const isMobile = useMobile();

  if (!isSecurityModeActive(access)) return null;

  const policy = getWorkspaceSecurityPolicy(access)!;
  const regionLabel =
    policy.modelRegion === 'OVERSEAS'
      ? teamText('securityBannerRegionOverseas')
      : teamText('securityBannerRegionDomestic');
  const desensitizationLabel =
    typeof policy.desensitizationWordCount === 'number' &&
    policy.desensitizationWordCount > 0
      ? teamText('securityBannerDesensitizationActive', {
          value0: policy.desensitizationWordCount,
        })
      : teamText('securityBannerDesensitizationReady');
  const shareLabel = policy.allowSessionShare
    ? teamText('securityBannerShareAllowed')
    : teamText('securityBannerShareBlocked');
  const agreementHref = withCurrentLocalePrefix(
    getZeroRetentionAgreementPath(policy.modelRegion),
  );
  const settingsHref = withCurrentLocalePrefix(`${TEAM_PATH}/security`);

  const popoverContent = (
    <div className={style.popover}>
      <div className={style.popoverHeader}>
        <img className={style.popoverIcon} src={securityIcon} alt='' />
        <div>
          <strong>{teamText('securityBannerPopoverTitle')}</strong>
          <p>{teamText('securityBannerPopoverSubtitle')}</p>
        </div>
      </div>
      <ul className={style.detailList}>
        <li className={style.detailRow}>
          <span className={style.detailLabel}>
            {teamText('securityBannerModelLabel')}
          </span>
          <span className={style.detailValue}>{regionLabel}</span>
        </li>
        <li className={style.detailRow}>
          <span className={style.detailLabel}>
            {teamText('securityBannerDesensitizationLabel')}
          </span>
          <span className={style.detailValue}>{desensitizationLabel}</span>
        </li>
        <li className={style.detailRow}>
          <span className={style.detailLabel}>
            {teamText('securityBannerShareLabel')}
          </span>
          <span className={style.detailValue}>{shareLabel}</span>
        </li>
      </ul>
      <div className={style.popoverActions}>
        <a
          className={style.popoverLink}
          href={agreementHref}
          target='_blank'
          rel='noopener noreferrer'
        >
          <FileProtectOutlined />
          <span>{teamText('securityViewAgreement')}</span>
        </a>
        {access?.canManage && !isMobile ? (
          <a
            className={style.popoverLink}
            href={settingsHref}
            target='_blank'
            rel='noopener noreferrer'
          >
            <SettingOutlined />
            <span>{teamText('securityBannerGoSettings')}</span>
          </a>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      className={classNames(style.bannerWrap, {
        [style.mobileWrap]: isMobile,
      })}
      role='status'
      aria-live='polite'
    >
      <Popover
        content={popoverContent}
        placement='bottom'
        trigger={isMobile ? 'click' : ['hover', 'click']}
      >
        <button
          type='button'
          className={classNames(style.bannerButton, {
            [style.mobileButton]: isMobile,
          })}
        >
          <img className={style.bannerIcon} src={securityIcon} alt='' />
          <span className={style.bannerText}>
            {teamText('securityBannerTitle')}
          </span>
        </button>
      </Popover>
    </div>
  );
};

export default SecurityModeBadge;
