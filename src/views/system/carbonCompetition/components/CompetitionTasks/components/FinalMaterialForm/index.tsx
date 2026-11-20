import I18N from '@src/lang/I18N';
import {
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Form,
  Input,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Upload,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { call, mutation, prefix, statusLabel } from '../../../../service';
import type {
  FinalMaterial,
  FinalTaskCode,
  MaterialFile,
  Overview,
} from '../../../../types';
import clockIcon from '@/assets/images/carbonCompetition/task-clock.svg';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
const u = t.taskUi;
export default function FinalMaterialForm({
  event,
  task,
  material,
  canSubmit,
  reload,
}: {
  event: Overview;
  task: FinalTaskCode;
  material?: FinalMaterial;
  canSubmit: boolean;
  reload: () => Promise<void>;
}) {
  const [summary, setSummary] = useState('');
  const [files, setFiles] = useState<MaterialFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setSummary(material?.summaryText || '');
    setFiles(material?.files || []);
  }, [material]);
  const endpoint = `${prefix(event.id)}/final-materials/${task}`;
  const editable = canSubmit && !!material?.canEdit;
  const reasons: Record<string, string> = {
    CAPTAIN_REQUIRED: u.captainOnly,
    FINAL_QUALIFICATION_REQUIRED: u.qualification,
    PHASE_CLOSED: u.phaseClosed,
    SUBMITTED_READONLY: u.readonly,
    SUMMARY_REQUIRED: u.summaryRequired,
    FILE_FORBIDDEN: u.fileExpired,
    FILE_TOO_LARGE: u.tooLarge,
    VERSION_CONFLICT: u.versionConflict,
  };
  const failure = (e: unknown) => {
    const response = e as {
      message?: string;
      data?: { msg?: string };
      response?: { data?: { msg?: string } };
    };
    const key =
      response?.data?.msg ||
      response?.response?.data?.msg ||
      response?.message ||
      '';
    setError(reasons[key] || key || t.failed);
  };
  const save = async (submit: boolean) => {
    setBusy(true);
    setError('');
    try {
      await call<FinalMaterial>(`${endpoint}/${submit ? 'submit' : 'draft'}`, {
        ...mutation(event.code, material?.version || 0),
        summaryText: summary,
        files: files.map(({ fileKey, uploadReceipt }) => ({
          fileKey,
          uploadReceipt,
        })),
      });
      await reload();
      message.success(submit ? u.submittedHint : t.saved);
    } catch (e) {
      failure(e);
    } finally {
      setBusy(false);
    }
  };
  if (!material)
    return (
      <Spin tip={u.loading}>
        <div className={styles.loading} />
      </Spin>
    );
  return (
    <article className={styles.panel}>
      <header>
        <h3>{u.finalForms[task].title}</h3>
        <Tag>{statusLabel(material.status)}</Tag>
      </header>
      <p className={styles.schedule}>
        <img src={clockIcon} width={16} height={16} alt='' />
        {I18N.template(u.schedule, {
          start: material.opensAt
            ? dayjs(material.opensAt).format('YYYY-MM-DD HH:mm')
            : t.pending,
          end: material.closesAt
            ? dayjs(material.closesAt).format('YYYY-MM-DD HH:mm')
            : t.pending,
        })}
      </p>
      {material.reason && (
        <Alert
          type='info'
          showIcon
          message={reasons[material.reason] || t.later}
        />
      )}
      {error && <Alert type='error' showIcon message={error} />}
      <Form layout='vertical'>
        <Form.Item label={u.finalForms[task].label} required={editable}>
          {editable ? (
            <Input.TextArea
              aria-label={u.finalForms[task].label}
              rows={5}
              maxLength={20000}
              showCount
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder={u.finalForms[task].placeholder}
              disabled={busy}
            />
          ) : (
            <div className={styles.summary}>
              {material.summaryText || u.empty}
            </div>
          )}
        </Form.Item>
        <Form.Item label={u.files} extra={editable ? u.fileHint : undefined}>
          <Spin spinning={uploading}>
            <div className={styles.files}>
              {files.map(file => (
                <div className={styles.file} key={file.fileKey}>
                  <span>{file.fileName}</span>
                  <Space>
                    {!file.uploadReceipt && (
                      <Button
                        type='text'
                        icon={<DownloadOutlined />}
                        aria-label={file.fileName}
                        onClick={async () => {
                          try {
                            const result = await call<{ url: string }>(
                              `${endpoint}/files/download?fileKey=${encodeURIComponent(
                                file.fileKey,
                              )}`,
                            );
                            window.location.assign(result.url);
                          } catch (e) {
                            failure(e);
                          }
                        }}
                      />
                    )}
                    {editable && (
                      <Button
                        type='text'
                        danger
                        icon={<DeleteOutlined />}
                        disabled={busy || uploading}
                        aria-label={t.remove}
                        onClick={() =>
                          setFiles(old =>
                            old.filter(item => item.fileKey !== file.fileKey),
                          )
                        }
                      />
                    )}
                  </Space>
                </div>
              ))}
              {editable && (
                <Upload
                  accept='.pdf,.pptx,.doc,.docx,.png,.jpg,.jpeg'
                  showUploadList={false}
                  disabled={uploading || busy}
                  beforeUpload={file => {
                    if (file.size > 50 * 1024 * 1024) {
                      setError(u.tooLarge);
                      return false;
                    }
                    setUploading(true);
                    setError('');
                    const form = new FormData();
                    form.append('file', file);
                    call<MaterialFile>(`${endpoint}/files`, form)
                      .then(result => setFiles(old => [...old, result]))
                      .catch(failure)
                      .finally(() => setUploading(false));
                    return false;
                  }}
                >
                  <Button
                    icon={<UploadOutlined />}
                    disabled={uploading || busy}
                  >
                    {u.finalForms[task].upload}
                  </Button>
                </Upload>
              )}
            </div>
          </Spin>
        </Form.Item>
      </Form>
      {editable && (
        <Space className={styles.actions}>
          <Button disabled={busy || uploading} onClick={() => save(false)}>
            {t.saveDraft}
          </Button>
          <Popconfirm title={u.confirm} onConfirm={() => save(true)}>
            <Button
              type='primary'
              disabled={busy || uploading || !summary.trim()}
              loading={busy}
            >
              {t.submitMaterial}
            </Button>
          </Popconfirm>
        </Space>
      )}
    </article>
  );
}
