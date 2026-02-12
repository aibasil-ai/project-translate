import type { JobPublicView } from '@/lib/jobs/types';

export interface TreeFileItem {
  path: string;
  size: number;
}

interface JobStatusProps {
  job: JobPublicView | null;
  files: TreeFileItem[];
  errorMessage: string | null;
  canStopJob?: boolean;
  isStoppingJob?: boolean;
  onStopJob?: () => void;
}

const statusLabelMap: Record<string, string> = {
  queued: '排隊中',
  running: '翻譯中',
  completed: '完成',
  failed: '失敗',
  cancelled: '已停止',
};

const statusBadgeMap: Record<string, string> = {
  queued: 'status-queued',
  running: 'status-running',
  completed: 'status-completed',
  failed: 'status-failed',
  cancelled: 'status-cancelled',
};

function toProgressPercent(job: JobPublicView) {
  if (job.progress.totalFiles <= 0) {
    return job.status === 'completed' ? 100 : 0;
  }

  return Math.round((job.progress.processedFiles / job.progress.totalFiles) * 100);
}

export function JobStatus({
  job,
  files,
  errorMessage,
  canStopJob = false,
  isStoppingJob = false,
  onStopJob,
}: JobStatusProps) {
  if (!job) {
    return (
      <section className="panel">
        <h2>任務執行狀態</h2>
        <p>目前尚未建立翻譯任務。</p>
        {errorMessage ? <p className="error">{errorMessage}</p> : null}
      </section>
    );
  }

  const progressPercent = toProgressPercent(job);
  const showTranslatedFiles = job.status === 'completed' && files.length > 0;
  const statusLabel = statusLabelMap[job.status] ?? job.status;
  const statusBadgeClassName = statusBadgeMap[job.status] ?? 'status-queued';

  return (
    <section className="panel">
      <h2>任務執行狀態</h2>
      <p>
        <strong>任務 ID：</strong>
        {job.id}
      </p>
      <p>
        <strong>任務狀態：</strong>
        <span className={`status-badge ${statusBadgeClassName}`}>{statusLabel}</span>
      </p>
      <p>
        <strong>使用模型：</strong>
        {job.model}
      </p>
      {canStopJob ? (
        <button type="button" onClick={onStopJob} disabled={isStoppingJob}>
          {isStoppingJob ? '停止中...' : '停止任務'}
        </button>
      ) : null}
      <p>
        <strong>輸出目錄：</strong>
        {job.outputFolder}
      </p>

      <div className="progress-container">
        <div className="progress-header">
          <strong>翻譯進度</strong>
          <span>{progressPercent}%</span>
        </div>
        <progress
          aria-label="翻譯進度"
          className="progress-bar"
          max={Math.max(job.progress.totalFiles, 1)}
          value={job.progress.processedFiles}
        />
        <small className="hint">
          {job.progress.processedFiles}/{job.progress.totalFiles}（失敗 {job.progress.failedFiles}）
        </small>
      </div>

      {job.progress.currentFile ? (
        <p>
          <strong>目前處理檔案：</strong>
          {job.progress.currentFile}
        </p>
      ) : null}

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {job.lastError ? <p className="error">{job.lastError}</p> : null}

      {job.status === 'completed' && job.downloadUrl ? (
        <p>
          <a href={job.downloadUrl}>下載翻譯結果 ZIP</a>
        </p>
      ) : null}

      {job.errors.length > 0 ? (
        <div>
          <h3>錯誤明細</h3>
          <ul className="files">
            {job.errors.map((error) => (
              <li key={`${error.relativePath}:${error.message}`}>
                {error.relativePath}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {job.status === 'queued' || job.status === 'running' ? (
        <p className="hint">翻譯進行中，完成後將顯示輸出檔案清單。</p>
      ) : null}

      {showTranslatedFiles ? (
        <div>
          <h3>輸出檔案清單</h3>
          <ul className="files">
            {files.map((file) => (
              <li key={file.path}>
                {file.path} ({file.size} 位元組)
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
