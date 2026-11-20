import { useState } from 'react';
import classNames from 'classnames';
import styles from './index.module.less';

interface Props {
  value: string;
  multiline?: boolean;
}

export function AnalysisText({ value, multiline = false }: Props) {
  const [overflow, setOverflow] = useState(false);
  return (
    <span
      className={classNames(styles.text, { [styles.multiline]: multiline })}
      title={overflow ? value : undefined}
      onMouseEnter={({ currentTarget }) => {
        setOverflow(
          currentTarget.scrollWidth > currentTarget.clientWidth ||
            currentTarget.scrollHeight > currentTarget.clientHeight,
        );
      }}
    >
      {value}
    </span>
  );
}
