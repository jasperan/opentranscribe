
export interface TranscriptionHistoryItem {
  id: string;
  timestamp: number;
  fileName: string;
  text: string;
  duration?: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  TRANSCRIBING = 'TRANSCRIBING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
