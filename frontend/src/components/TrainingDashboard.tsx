/**
 * Nanochat Training Dashboard Component
 * Main interface for managing nanochat training jobs
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Settings, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Trash2,
  Download,
  Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useTraining } from '@/hooks/useTraining';
import TrainingConfigForm from './TrainingConfigForm';
import TrainingLogs from './TrainingLogs';
import TrainingMetrics from './TrainingMetrics';

interface TrainingDashboardProps {
  className?: string;
}

const TrainingDashboard: React.FC<TrainingDashboardProps> = ({ className }) => {
  const { toast } = useToast();
  const {
    jobs,
    activeJobs,
    completedJobs,
    templates,
    isLoading,
    error,
    startTraining,
    stopTraining,
    refreshJobs,
    getJobLogs,
    cleanupJobs,
    getJob,
    isJobActive,
    isJobCompleted,
    isJobFailed,
  } = useTraining({ pollInterval: 3000 });

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);

  const handleStartTraining = async (config: any) => {
    try {
      const jobId = await startTraining(config);
      toast({
        title: "Training Started",
        description: `Training job ${jobId.substring(0, 8)}... has been started.`,
      });
      setShowConfigForm(false);
    } catch (error) {
      toast({
        title: "Failed to Start Training",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleStopTraining = async (jobId: string) => {
    try {
      await stopTraining(jobId);
      toast({
        title: "Training Stopped",
        description: `Training job ${jobId.substring(0, 8)}... has been stopped.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Stop Training",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleCleanupJobs = async () => {
    try {
      await cleanupJobs(24);
      toast({
        title: "Jobs Cleaned Up",
        description: "Old completed jobs have been cleaned up.",
      });
    } catch (error) {
      toast({
        title: "Failed to Cleanup Jobs",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'stopped':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      running: 'default' as const,
      completed: 'secondary' as const,
      failed: 'destructive' as const,
      stopped: 'outline' as const,
      starting: 'secondary' as const,
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  const allJobs = [...activeJobs, ...completedJobs].map(jobId => ({
    id: jobId,
    ...getJob(jobId)
  })).filter(Boolean);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Nanochat Training</h2>
          <p className="text-muted-foreground">
            Train your own ChatGPT-like models locally
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowConfigForm(true)}
            disabled={isLoading}
          >
            <Settings className="h-4 w-4 mr-2" />
            Start Training
          </Button>
          <Button
            variant="outline"
            onClick={refreshJobs}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Active Jobs</p>
                <p className="text-2xl font-bold">{activeJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{completedJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Failed</p>
                <p className="text-2xl font-bold">
                  {allJobs.filter(job => isJobFailed(job.id)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Templates</p>
                <p className="text-2xl font-bold">{Object.keys(templates).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Training Jobs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {/* Jobs List */}
          <div className="space-y-4">
            {allJobs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Training Jobs</h3>
                  <p className="text-muted-foreground mb-4">
                    Start your first training job to begin training a nanochat model.
                  </p>
                  <Button onClick={() => setShowConfigForm(true)}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Training
                  </Button>
                </CardContent>
              </Card>
            ) : (
              allJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(job.status)}
                        <div>
                          <h3 className="font-semibold">
                            Job {job.id.substring(0, 8)}...
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {job.config.training_stage} • {job.config.model_depth} layers
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(job.status)}
                        <div className="flex space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedJobId(job.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isJobActive(job.id) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStopTraining(job.id)}
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    {isJobActive(job.id) && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{job.current_stage}</span>
                          <span>{job.progress}%</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                      </div>
                    )}

                    {/* Job Info */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {formatDuration(job.start_time, job.end_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Model Depth</p>
                        <p className="font-medium">{job.config.model_depth}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Batch Size</p>
                        <p className="font-medium">{job.config.device_batch_size}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stage</p>
                        <p className="font-medium">{job.config.training_stage}</p>
                      </div>
                    </div>

                    {/* Error Message */}
                    {job.error && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{job.error}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Cleanup Button */}
          {completedJobs.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={handleCleanupJobs}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Cleanup Old Jobs
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(templates).map(([key, template]) => (
              <Card key={key} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{key.replace('_', ' ').toUpperCase()}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Depth</p>
                      <p className="font-medium">{template.model_depth}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Batch Size</p>
                      <p className="font-medium">{template.device_batch_size}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Seq Length</p>
                      <p className="font-medium">{template.max_seq_len}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Iterations</p>
                      <p className="font-medium">
                        {template.num_iterations === -1 ? 'Auto' : template.num_iterations}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => {
                      setShowConfigForm(true);
                      // Pre-fill form with template
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <TrainingMetrics jobs={allJobs} />
        </TabsContent>
      </Tabs>

      {/* Configuration Form Modal */}
      {showConfigForm && (
        <TrainingConfigForm
          templates={templates}
          onSubmit={handleStartTraining}
          onCancel={() => setShowConfigForm(false)}
        />
      )}

      {/* Job Details Modal */}
      {selectedJobId && (
        <TrainingLogs
          jobId={selectedJobId}
          job={getJob(selectedJobId)}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </div>
  );
};

export default TrainingDashboard;
