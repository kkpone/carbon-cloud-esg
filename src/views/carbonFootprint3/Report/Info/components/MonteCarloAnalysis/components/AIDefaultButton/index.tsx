import { Button } from 'antd';
import I18N from '@src/lang/I18N';
import background from '@/assets/images/carbonFootprint3/uncertainty-analysis/ai-default-background.svg';
import mark from '@/assets/images/carbonFootprint3/uncertainty-analysis/ai-default-mark.svg';
import styles from './index.module.less';

interface Props {
  loading: boolean;
  progress: number;
  disabled: boolean;
  onClick: () => void;
}

export function AIDefaultButton({
  loading,
  progress,
  disabled,
  onClick,
}: Props) {
  return (
    <Button
      type='primary'
      className={styles.button}
      loading={loading}
      disabled={disabled}
      aria-label={I18N.carbonFootprint3.mcAiDefaultsAction}
      aria-busy={loading}
      onClick={onClick}
    >
      {!loading && (
        <span className={styles.artwork} aria-hidden>
          <img src={background} className={styles.background} alt='' />
          <span className={styles.mark}>
            <img src={mark} alt='' />
          </span>
        </span>
      )}
      <span className={styles.label}>
        {I18N.carbonFootprint3.mcAiDefaults}
        {loading && ` ${progress}%`}
      </span>
    </Button>
  );
}
