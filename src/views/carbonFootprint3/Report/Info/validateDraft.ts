import { Field, Form, isField } from '@formily/core';
import { isEmpty } from '@formily/shared';

/** 草稿只放宽未填写的必填项，保留已填写内容的原校验规则。 */
export async function validateDraft(form: Form): Promise<void> {
  const optionalFields: Field[] = [];
  form.query('*').forEach(field => {
    if (isField(field) && field.required && isEmpty(field.value)) {
      optionalFields.push(field);
      field.setRequired(false);
    }
  });
  try {
    await form.validate();
  } finally {
    optionalFields.forEach(field => field.setRequired(true));
  }
}
