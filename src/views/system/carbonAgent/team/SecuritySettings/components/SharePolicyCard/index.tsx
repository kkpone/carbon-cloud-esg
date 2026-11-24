import { Switch } from 'antd';
import classNames from 'classnames';

import { teamText } from '../../../i18n';
import style from './index.module.less';

type SharePolicyCardProps = {
  allowSessionShare: boolean;
  disabled: boolean;
  saving: boolean;
  onChange: (checked: boolean) => void;
};

const SharePolicyCard = ({
  allowSessionShare,
  disabled,
  saving,
  onChange,
}: SharePolicyCardProps) => (
  <section
    className={classNames(style.card, { [style.cardDisabled]: disabled })}
  >
    <div className={style.row}>
      <div className={style.info}>
        <h3>{teamText('securityShareSectionTitle')}</h3>
        <p>{teamText('securityShareSectionDescription')}</p>
      </div>
      <div className={style.control}>
        <span>{teamText('securityShareSwitchLabel')}</span>
        <Switch
          checked={allowSessionShare}
          disabled={disabled}
          loading={saving}
          aria-label={teamText('securityShareSwitchLabel')}
          onChange={onChange}
        />
      </div>
    </div>
    <p className={style.hint}>
      {allowSessionShare
        ? teamText('securityShareEnabledHint')
        : teamText('securityShareDisabledHint')}
    </p>
  </section>
);

export default SharePolicyCard;
