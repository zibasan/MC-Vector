interface AppDownloadToastProps {
  title: string;
  progress: number;
  message: string;
}

export default function AppDownloadToast({ title, progress, message }: AppDownloadToastProps) {
  return (
    <div className="download-toast">
      <div className="download-toast__header">
        <span>{title}</span>
        <span className="text-accent">{progress}%</span>
      </div>
      <div className="download-toast__message">{message}</div>
      <div className="download-toast__progress-track">
        <div className="download-toast__progress-bar" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}
