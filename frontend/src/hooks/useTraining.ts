/**
 * Custom hook for managing nanochat training state and operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import TrainingService, { TrainingConfig, TrainingJob, TrainingLog } from '@/services/TrainingService';

interface UseTrainingOptions {
  pollInterval?: number; // Polling interval in milliseconds
  autoRefresh?: boolean; // Whether to automatically refresh job status
}

interface UseTrainingReturn {
  // State
  jobs: Record<string, TrainingJob>;
  activeJobs: string[];
  completedJobs: string[];
  templates: Record<string, any>;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startTraining: (config: Partial<TrainingConfig>) => Promise<string>;
  stopTraining: (jobId: string) => Promise<void>;
  refreshJobs: () => Promise<void>;
  refreshJobStatus: (jobId: string) => Promise<void>;
  getJobLogs: (jobId: string, limit?: number) => Promise<TrainingLog[]>;
  cleanupJobs: (maxAgeHours?: number) => Promise<void>;
  
  // Utilities
  getJob: (jobId: string) => TrainingJob | undefined;
  isJobActive: (jobId: string) => boolean;
  isJobCompleted: (jobId: string) => boolean;
  isJobFailed: (jobId: string) => boolean;
}

export const useTraining = (options: UseTrainingOptions = {}): UseTrainingReturn => {
  const { pollInterval = 5000, autoRefresh = true } = options;
  
  const [jobs, setJobs] = useState<Record<string, TrainingJob>>({});
  const [activeJobs, setActiveJobs] = useState<string[]>([]);
  const [completedJobs, setCompletedJobs] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const trainingService = useRef(new TrainingService());
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await trainingService.current.getTemplates();
        setTemplates(response.templates);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    };
    
    loadTemplates();
  }, []);

  // Refresh jobs list
  const refreshJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await trainingService.current.listJobs();
      setActiveJobs(response.jobs.active);
      setCompletedJobs(response.jobs.completed);
      
      // Refresh status for active jobs
      const activeJobPromises = response.jobs.active.map(async (jobId) => {
        try {
          const jobStatus = await trainingService.current.getTrainingStatus(jobId);
          return { jobId, jobStatus };
        } catch (err) {
          console.error(`Failed to get status for job ${jobId}:`, err);
          return null;
        }
      });
      
      const activeJobResults = await Promise.all(activeJobPromises);
      const validActiveJobs = activeJobResults.filter(Boolean) as Array<{ jobId: string; jobStatus: TrainingJob }>;
      
      setJobs(prevJobs => {
        const newJobs = { ...prevJobs };
        validActiveJobs.forEach(({ jobId, jobStatus }) => {
          newJobs[jobId] = jobStatus;
        });
        return newJobs;
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh jobs');
      console.error('Failed to refresh jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh specific job status
  const refreshJobStatus = useCallback(async (jobId: string) => {
    try {
      const jobStatus = await trainingService.current.getTrainingStatus(jobId);
      setJobs(prevJobs => ({
        ...prevJobs,
        [jobId]: jobStatus
      }));
      
      // Update active/completed lists if status changed
      if (jobStatus.status === 'completed' || jobStatus.status === 'failed' || jobStatus.status === 'stopped') {
        setActiveJobs(prev => prev.filter(id => id !== jobId));
        setCompletedJobs(prev => [...prev.filter(id => id !== jobId), jobId]);
      }
      
    } catch (err) {
      console.error(`Failed to refresh job status for ${jobId}:`, err);
    }
  }, []);

  // Start training
  const startTraining = useCallback(async (config: Partial<TrainingConfig>): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await trainingService.current.startTraining(config);
      
      // Add to active jobs
      setActiveJobs(prev => [...prev, response.job_id]);
      
      // Refresh jobs to get initial status
      await refreshJobs();
      
      return response.job_id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start training';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [refreshJobs]);

  // Stop training
  const stopTraining = useCallback(async (jobId: string): Promise<void> => {
    try {
      await trainingService.current.stopTraining(jobId);
      
      // Move from active to completed
      setActiveJobs(prev => prev.filter(id => id !== jobId));
      setCompletedJobs(prev => [...prev.filter(id => id !== jobId), jobId]);
      
      // Update job status
      setJobs(prevJobs => ({
        ...prevJobs,
        [jobId]: {
          ...prevJobs[jobId],
          status: 'stopped',
          end_time: new Date().toISOString()
        }
      }));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop training';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Get job logs
  const getJobLogs = useCallback(async (jobId: string, limit: number = 100): Promise<TrainingLog[]> => {
    try {
      const response = await trainingService.current.getTrainingLogs(jobId, limit);
      return response.logs;
    } catch (err) {
      console.error(`Failed to get logs for job ${jobId}:`, err);
      return [];
    }
  }, []);

  // Cleanup jobs
  const cleanupJobs = useCallback(async (maxAgeHours: number = 24): Promise<void> => {
    try {
      await trainingService.current.cleanupJobs(maxAgeHours);
      await refreshJobs();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cleanup jobs';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [refreshJobs]);

  // Utility functions
  const getJob = useCallback((jobId: string): TrainingJob | undefined => {
    return jobs[jobId];
  }, [jobs]);

  const isJobActive = useCallback((jobId: string): boolean => {
    return activeJobs.includes(jobId);
  }, [activeJobs]);

  const isJobCompleted = useCallback((jobId: string): boolean => {
    const job = jobs[jobId];
    return job?.status === 'completed';
  }, [jobs]);

  const isJobFailed = useCallback((jobId: string): boolean => {
    const job = jobs[jobId];
    return job?.status === 'failed';
  }, [jobs]);

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh && activeJobs.length > 0) {
      pollingInterval.current = setInterval(() => {
        activeJobs.forEach(jobId => {
          refreshJobStatus(jobId);
        });
      }, pollInterval);
    } else {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [autoRefresh, activeJobs, pollInterval, refreshJobStatus]);

  // Initial load
  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  return {
    // State
    jobs,
    activeJobs,
    completedJobs,
    templates,
    isLoading,
    error,
    
    // Actions
    startTraining,
    stopTraining,
    refreshJobs,
    refreshJobStatus,
    getJobLogs,
    cleanupJobs,
    
    // Utilities
    getJob,
    isJobActive,
    isJobCompleted,
    isJobFailed,
  };
};
