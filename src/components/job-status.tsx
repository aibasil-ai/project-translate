import type { JobPublicView } from '@/lib/jobs/types';

export interface TreeFileItem {
  path: string;
  size: number;
}

interface JobStatusProps {
  job: JobPublicView | null;
  files: TreeFileItem[];
  errorMessage: string | null;
}

const statusLabelMap: Record<string, string> = {
  queued: '排隊中',
  running: '翻譯中',
  completed: '完成',
  failed: '失敗',
};

function toProgressPercent(job: JobPublicView) {
  if (job.progress.totalFiles <= 0) {
    return job.status === 'completed' ? 100 : 0;
  }

  return Math.round((job.progress.processedFiles / job.progress.totalFiles) * 100);
}

export function JobStatus({ job, files, errorMessage }: JobStatusProps) {
  if (!job) {
    return (
      <section className="panel">
        <h2>任務狀態</h2>
        <p>尚未建立任務。</p>
      </section>
    );
  }

  const progressPercent = toProgressPercent(job);

  return (
    <section className="panel">
      <h2>任務狀態</h2>
      <p>
        <strong>Job ID：</strong>
        {job.id}
      </p>
      <p>
        <strong>狀態：</strong>
        {statusLabelMap[job.status] ?? job.status}
      </p>
      <p>
        <strong>輸出資料夾：</strong>
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
          <strong>目前檔案：</strong>
          {job.progress.currentFile}
        </p>
      ) : null}

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
      {job.lastError ? <p className="error">{job.lastError}</p> : null}

      {job.status === 'completed' && job.downloadUrl ? (
        <p>
          <a href={job.downloadUrl}>下載翻譯 ZIP</a>
        </p>
      ) : null}

      {job.errors.length > 0 ? (
        <div>
          <h3>翻譯錯誤</h3>
          <ul className="files">
            {job.errors.map((error) => (
              <li key={`${error.relativePath}:${error.message}`}>
                {error.relativePath}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {files.length > 0 ? (
        <div>
          <h3>翻譯結果檔案</h3>
          <ul className="files">
            {files.map((file) => (
              <li key={file.path}>
                {file.path} ({file.size} bytes)
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
