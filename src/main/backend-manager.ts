import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';

export class BackendManager {
  private process: ChildProcess | null = null;
  private readonly port = 8000;
  private readonly healthUrl = `http://localhost:${this.port}/models`;

  /**
   * Check if the backend API is responding
   */
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(this.healthUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the path to the backend directory
   */
  private getBackendPath(): string {
    if (app.isPackaged) {
      // In production, backend is in resources
      return path.join(process.resourcesPath, 'backend');
    }
    // In development, use the project directory
    return path.join(__dirname, '../../backend');
  }

  /**
   * Start the backend if not already running
   */
  async ensureRunning(): Promise<void> {
    if (await this.checkHealth()) {
      console.log('Backend already running');
      return;
    }

    console.log('Starting backend...');

    const backendPath = this.getBackendPath();
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    this.process = spawn(pythonCmd, ['main.py'], {
      cwd: backendPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    this.process.stdout?.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    this.process.stderr?.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    this.process.on('error', (error) => {
      console.error('Failed to start backend:', error);
    });

    this.process.on('exit', (code, signal) => {
      console.log(`Backend exited with code ${code}, signal ${signal}`);
      this.process = null;
    });

    // Wait for backend to be ready
    await this.waitForReady();
  }

  /**
   * Wait for the backend to respond to health checks
   */
  private async waitForReady(maxAttempts = 30, intervalMs = 500): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (await this.checkHealth()) {
        console.log('Backend is ready');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error('Backend failed to start within timeout');
  }

  /**
   * Gracefully shutdown the backend
   */
  async shutdown(): Promise<void> {
    if (!this.process) {
      return;
    }

    console.log('Shutting down backend...');

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        // Force kill if graceful shutdown takes too long
        this.process?.kill('SIGKILL');
        resolve();
      }, 5000);

      this.process.once('exit', () => {
        clearTimeout(timeout);
        this.process = null;
        resolve();
      });

      // Send graceful shutdown signal
      if (process.platform === 'win32') {
        this.process.kill();
      } else {
        this.process.kill('SIGTERM');
      }
    });
  }

  /**
   * Check if the backend process is managed by us
   */
  isManaged(): boolean {
    return this.process !== null;
  }
}
