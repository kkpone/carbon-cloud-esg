import { Input } from 'antd';
import I18N from '@/lang/I18N';
import type { ComponentProps } from 'react';
import { useTranslationInput } from './index';
import styles from './index.module.less';

type ExtraProps = { translationFieldId?: string };

/** 保留原中文输入行为，英文模式只更新英文值。 */
function BilingualInput({
  translationFieldId,
  ...props
}: ComponentProps<typeof Input> & ExtraProps) {
  const translation = useTranslationInput(translationFieldId, props.id);
  const feedbackProps = {
    className: [
      props.className,
      translation?.translating ? styles.fieldTranslating : undefined,
    ]
      .filter(Boolean)
      .join(' '),
    'aria-busy': translation?.translating || undefined,
    title: translation?.translating
      ? I18N.cbamMonitor.translationInProgress
      : props.title,
  };
  if (!translation?.english) return <Input {...props} {...feedbackProps} />;
  return (
    <Input
      {...props}
      {...feedbackProps}
      maxLength={undefined}
      value={translation.field.textEn || ''}
      readOnly={props.readOnly || translation.readonly}
      onChange={event => translation.write(event.target.value)}
    />
  );
}

/** 多行输入采用同样的组语言状态。 */
function BilingualTextArea({
  translationFieldId,
  ...props
}: ComponentProps<typeof Input.TextArea> & ExtraProps) {
  const translation = useTranslationInput(translationFieldId, props.id);
  const feedbackProps = {
    className: [
      props.className,
      translation?.translating ? styles.fieldTranslating : undefined,
    ]
      .filter(Boolean)
      .join(' '),
    'aria-busy': translation?.translating || undefined,
    title: translation?.translating
      ? I18N.cbamMonitor.translationInProgress
      : props.title,
  };
  if (!translation?.english)
    return <Input.TextArea {...props} {...feedbackProps} />;
  return (
    <Input.TextArea
      {...props}
      {...feedbackProps}
      maxLength={undefined}
      value={translation.field.textEn || ''}
      readOnly={props.readOnly || translation.readonly}
      onChange={event => translation.write(event.target.value)}
    />
  );
}

export default Object.assign(BilingualInput, { TextArea: BilingualTextArea });
