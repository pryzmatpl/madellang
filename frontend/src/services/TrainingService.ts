/**
 * Training Service for Nanochat Training Integration
 * Handles API communication with the backend training service
 */

export interface TrainingConfig {
  model_depth: number;
  device_batch_size: number;
  max_seq_len: number;
  num_iterations: number;
  target_param_data_ratio: number;
  wandb_run: string;
  training_stage: string;
  eval_every?: number;
  eval_tokens?: number;
  core_metric_every?: number;
  sample_every?: number;
}

export interface TrainingJob {
  job_id: string;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'stopped';
  progress: number;
  current_stage: string;
  start_time: string;
  end_time?: string;
  error?: string;
  metrics: Record<string, any>;
  config: TrainingConfig;
}

export interface TrainingLog {
  command: string;
  stdout: string;
  stderr: string;
  return_code: number;
  execution_time: number;
  timestamp: string;
}

export interface TrainingTemplate {
  training_stage: string;
  model_depth: number;
  device_batch_size: number;
  max_seq_len: number;
  num_iterations: number;
  target_param_data_ratio?: number;
  description: string;
}

class TrainingService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Start a new training job
   */
  async startTraining(config: Partial<TrainingConfig>): Promise<{ job_id: string; status: string; config: TrainingConfig }> {
    const response = await fetch(`${this.baseUrl}/training/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to start training: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get training status for a job
   */
  async getTrainingStatus(jobId: string): Promise<TrainingJob> {
    const response = await fetch(`${this.baseUrl}/training/status/${jobId}`);

    if (!response.ok) {
      throw new Error(`Failed to get training status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get training logs for a job
   */
  async getTrainingLogs(jobId: string, limit: number = 100): Promise<{ job_id: string; logs: TrainingLog[] }> {
    const response = await fetch(`${this.baseUrl}/training/logs/${jobId}?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Failed to get training logs: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Stop a training job
   */
  async stopTraining(jobId: string): Promise<{ job_id: string; status: string }> {
    const response = await fetch(`${this.baseUrl}/training/stop/${jobId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to stop training: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * List all training jobs
   */
  async listJobs(): Promise<{ active_jobs: number; completed_jobs: number; jobs: { active: string[]; completed: string[] } }> {
    const response = await fetch(`${this.baseUrl}/training/jobs`);

    if (!response.ok) {
      throw new Error(`Failed to list jobs: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get training configuration templates
   */
  async getTemplates(): Promise<{ templates: Record<string, TrainingTemplate> }> {
    const response = await fetch(`${this.baseUrl}/training/config/templates`);

    if (!response.ok) {
      throw new Error(`Failed to get templates: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Cleanup old jobs
   */
  async cleanupJobs(maxAgeHours: number = 24): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/training/cleanup?max_age_hours=${maxAgeHours}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to cleanup jobs: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check if the training service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default TrainingService;
