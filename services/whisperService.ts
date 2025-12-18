// API base URL - can be configured via environment variable
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export class WhisperService {
  async transcribeAudio(base64Data: string, mimeType: string, language: string = 'auto'): Promise<string> {
    try {
      // Convert base64 to Blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', blob, 'audio.mp3');
      if (language && language !== 'auto') {
        formData.append('language', language);
      }

      // Call Python API
      const response = await fetch(`${API_BASE_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.text || "No speech detected.";
    } catch (error) {
      console.error("Transcription failed:", error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          "Failed to connect to transcription server. " +
          "Please ensure the Python backend is running on http://localhost:8000"
        );
      }
      
      throw new Error(error instanceof Error ? error.message : "Failed to transcribe audio.");
    }
  }
}

export const whisperService = new WhisperService();
