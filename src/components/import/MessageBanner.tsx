import type { ImportMessage } from './types';

interface MessageBannerProps {
  message: ImportMessage | null;
}

export function MessageBanner({ message }: MessageBannerProps) {
  if (!message) return null;

  const styles =
    message.type === 'success'
      ? 'bg-green-100 border border-green-400 text-green-700'
      : 'bg-red-100 border border-red-400 text-red-700';

  return <div className={`mb-4 p-4 rounded ${styles}`}>{message.text}</div>;
}
