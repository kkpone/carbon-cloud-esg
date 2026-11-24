import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import classNames from 'classnames';
import { useLocation } from 'react-router-dom';

import { useTitle } from '@/hooks';
import { teamText } from '@/views/system/carbonAgent/team/i18n';

import style from './index.module.less';

const ZeroRetentionAgreement = () => {
  const location = useLocation();
  const regionParam = new URLSearchParams(location.search)
    .get('region')
    ?.toUpperCase();
  const activeRegion =
    regionParam === 'DOMESTIC' || regionParam === 'OVERSEAS'
      ? regionParam
      : undefined;

  const pageTitle = teamText('securityAgreementPageTitle');
  useTitle(pageTitle);

  const activeRegionLabel =
    activeRegion === 'DOMESTIC'
      ? teamText('securityModelDomesticTitle')
      : activeRegion === 'OVERSEAS'
      ? teamText('securityModelOverseasTitle')
      : undefined;

  return (
    <div className={style.page}>
      <article className={style.container}>
        <header className={style.header}>
          <div className={style.badgeRow}>
            <span className={style.badge}>
              <SafetyCertificateOutlined />
              <span>{teamText('securityModeTitle')}</span>
            </span>
            {activeRegionLabel ? (
              <span className={style.regionTag}>
                {teamText('securityAgreementCurrentRegion', {
                  value0: activeRegionLabel,
                })}
              </span>
            ) : null}
          </div>
          <h1 className={style.title}>{pageTitle}</h1>
          <p className={style.subtitle}>
            {teamText('securityAgreementSubtitle')}
          </p>
          <p className={style.updatedAt}>
            {teamText('securityAgreementUpdatedAt')}
          </p>
        </header>

        <section className={style.section}>
          <h2>{teamText('securityAgreementSection1Title')}</h2>
          <p>{teamText('securityAgreementSection1Body')}</p>
        </section>

        <section className={style.section}>
          <h2>{teamText('securityAgreementSection2Title')}</h2>
          <p>{teamText('securityAgreementSection2Body')}</p>
        </section>

        <section className={style.section}>
          <h2>{teamText('securityAgreementSection3Title')}</h2>
          <div className={style.regionGrid}>
            <div
              className={classNames(style.regionCard, {
                [style.regionCardActive]: activeRegion === 'DOMESTIC',
              })}
            >
              <h3>{teamText('securityModelDomesticTitle')}</h3>
              <p>{teamText('securityAgreementSection3Domestic')}</p>
            </div>
            <div
              className={classNames(style.regionCard, {
                [style.regionCardActive]: activeRegion === 'OVERSEAS',
              })}
            >
              <h3>{teamText('securityModelOverseasTitle')}</h3>
              <p>{teamText('securityAgreementSection3Overseas')}</p>
            </div>
          </div>
        </section>

        <section className={style.section}>
          <h2>{teamText('securityAgreementSection4Title')}</h2>
          <p>{teamText('securityAgreementSection4Body')}</p>
        </section>

        <section className={style.section}>
          <h2>{teamText('securityAgreementSection5Title')}</h2>
          <p>{teamText('securityAgreementSection5Body')}</p>
        </section>

        <footer className={style.footer}>
          <Button onClick={() => window.close()}>
            {teamText('securityAgreementBackButton')}
          </Button>
        </footer>
      </article>
    </div>
  );
};

export default ZeroRetentionAgreement;
