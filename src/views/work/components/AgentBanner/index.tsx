import I18N, { LocaleType } from '@src/lang/I18N';
import { Button, message as antdMessage } from 'antd';
import { useContext, useState } from 'react';

import carbonAgentLogo from '@/assets/images/mobileLanding/carbon-agent-logo.svg';
import { LocaleContext } from '@/components/LocaleProvider';
import { useMobile } from '@/hooks/use-mobile';

import style from './index.module.less';
import rightArrowSvg from '../../images/rightArrow.svg';
import { createAgentSsoTicket } from '../../service';

const serviceLocaleMap: Record<LocaleType, string> = {
  [LocaleType.enUS]: 'en-US',
  [LocaleType.zhCN]: 'zh-CN',
  [LocaleType.zhTW]: 'zh-TW',
};

export const AgentBanner = () => {
  const { locale } = useContext(LocaleContext);
  const isMobile = useMobile();
  const [entering, setEntering] = useState(false);

  const handleEnterAgent = async () => {
    if (entering) {
      return;
    }

    const agentWindow = window.open('', '_blank');

    if (!agentWindow) {
      antdMessage.error(I18N.workbench.agentBannerError);
      return;
    }

    agentWindow.opener = null;

    setEntering(true);
    try {
      const response = await createAgentSsoTicket({
        lang: serviceLocaleMap[locale] || 'zh-CN',
        source: 'CARBON_CLOUD_WORKBENCH',
      });
      const redirectUrl = response.data.data?.redirectUrl;

      if (!redirectUrl) {
        throw new Error('AGENT_SSO_REDIRECT_URL_MISSING');
      }

      agentWindow.location.replace(redirectUrl);
      setEntering(false);
    } catch {
      agentWindow.close();
      setEntering(false);
      antdMessage.error(I18N.workbench.agentBannerError);
    }
  };

  return (
    <section className={style.banner} aria-labelledby='agent-banner-title'>
      <div className={style.content}>
        <span className={style.avatarShell} aria-hidden='true'>
          <img src={carbonAgentLogo} alt='' />
        </span>
        <div className={style.copy}>
          <div className={style.headingRow}>
            <span className={style.badge}>
              {I18N.workbench.agentBannerBadge}
            </span>
            <h2 id='agent-banner-title'>{I18N.workbench.agentBannerTitle}</h2>
          </div>
          <p>{I18N.workbench.agentBannerDescription}</p>
        </div>
      </div>
      <Button
        className={style.action}
        loading={entering}
        size={isMobile ? 'middle' : 'large'}
        type='primary'
        onClick={handleEnterAgent}
      >
        <span>{I18N.workbench.agentBannerAction}</span>
        {!entering ? (
          <img className={style.actionIcon} src={rightArrowSvg} alt='' />
        ) : null}
      </Button>
    </section>
  );
};
