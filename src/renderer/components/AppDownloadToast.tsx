interface AppDownloadToastProps {
  title: string;
  progress: number;
  message: string;
}

export default function AppDownloadToast({ title, progress, message }: AppDownloadToastProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="download-toast">
      <div className="download-toast__header">
        <span>{title}</span>
        <span className="text-accent">{clampedProgress}%</span>
      </div>
      <div className="download-toast__message">{message}</div>
      <div
        className="download-toast__progress-track"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="download-toast__progress-bar"
          style={{ width: `${clampedProgress}%` }}
        ></div>
      </div>
    </div>
  );
}
