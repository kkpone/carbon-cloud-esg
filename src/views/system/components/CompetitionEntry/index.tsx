import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Modal } from 'antd';
import activityBackground from '@/assets/images/carbonCompetition/activity-background.png';
import competitionLogo from '@/assets/images/carbonCompetition/banner-logo.png';
import activityGift from '@/assets/images/carbonCompetition/activity-gift.png';
import activityClose from '@/assets/images/carbonCompetition/activity-close.svg';
import flame from '@/assets/images/carbonCompetition/menu-flame.gif';
import competitionIcon from '@/assets/images/carbonCompetition/menu-trophy.svg';
import I18N from '@src/lang/I18N';
import { overview } from '../../carbonCompetition/service';
import type { Overview } from '../../carbonCompetition/types';
import style from './index.module.less';

export default function CompetitionEntry({
  welcomeOnly = false,
  collapsed = false,
}: {
  welcomeOnly?: boolean;
  collapsed?: boolean;
}) {
  const location = useLocation();
  const [event, setEvent] = useState<Overview>();
  const [welcome, setWelcome] = useState(false);
  useEffect(() => {
    let disposed = false;
    overview('current')
      .then(value => {
        if (disposed) return;
        setEvent(value);
        const key = `competition-welcome:${value.code}`;
        if (
          welcomeOnly &&
          value.registrationAvailable &&
          !localStorage.getItem(key) &&
          !new URLSearchParams(location.search).has('inviteCode')
        ) {
          setWelcome(true);
          localStorage.setItem(key, 'shown');
        }
      })
      .catch(() => {
        /* 赛事未开放时入口不显示，不影响工作台。 */
      });
    return () => {
      disposed = true;
    };
  }, [location.search, welcomeOnly]);
  if (!event) return null;
  const target = `/system/carbonCompetition/${event.code}`;
  return (
    <>
      {!welcomeOnly && (
        <Link
          className={`${style.entry} ${
            location.pathname.includes('/carbonCompetition/')
              ? style.active
              : ''
          }`}
          to={target}
          aria-label={I18N.carbonCompetition.design.title}
          title={I18N.carbonCompetition.design.title}
          aria-current={
            location.pathname.includes('/carbonCompetition/')
              ? 'page'
              : undefined
          }
        >
          <img className={style.icon} src={competitionIcon} alt='' />
          {!collapsed && (
            <span className={style.label}>
              <span className={style.title}>
                {I18N.carbonCompetition.design.title}
              </span>
              <img
                className={style.badge}
                src={flame}
                alt=''
                width={20}
                height={22}
              />
            </span>
          )}
        </Link>
      )}
      <Modal
        open={welcome}
        centered
        width={900}
        title={null}
        footer={null}
        className={style.welcomeModal}
        rootClassName={style.welcomeRoot}
        closeIcon={<img src={activityClose} alt='' />}
        onCancel={() => setWelcome(false)}
        aria-labelledby='competition-welcome-title'
      >
        <div className={style.welcomeContent}>
          <div className={style.welcomeArtwork} aria-hidden>
            <img src={activityBackground} alt='' />
          </div>
          <div className={style.welcomeCopy}>
            <div className={style.welcomeLogo}>
              <img src={competitionLogo} alt='CCMA' />
            </div>
            <h2 id='competition-welcome-title'>
              {I18N.carbonCompetition.design.welcomeTitle}
            </h2>
            <p>{I18N.carbonCompetition.design.welcomeSubtitle}</p>
            <div className={style.welcomePrize}>
              <img src={activityGift} alt='' width={28} height={28} />
              <span>{I18N.carbonCompetition.design.welcomeAwardsTitle}</span>
            </div>
            <div className={style.welcomeActions}>
              <Link
                className={style.joinButton}
                to={`${target}?compTab=register`}
                onClick={() => setWelcome(false)}
              >
                {I18N.carbonCompetition.design.welcomeRegister}
              </Link>
              <Link
                className={style.detailsButton}
                to={target}
                onClick={() => setWelcome(false)}
              >
                {I18N.carbonCompetition.design.welcomeDetails}
              </Link>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
