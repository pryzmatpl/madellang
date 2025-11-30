/**
 * Training Logs Component
 * Displays real-time training logs and job details
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  X, 
  RefreshCw, 
  Download, 
  Clock, 
  Activity, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Terminal,
  Info
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TrainingJob, TrainingLog } from '@/services/TrainingService';

interface TrainingLogsProps {
  jobId: string;
  job?: TrainingJob;
  onClose: () => void;
}

const TrainingLogs: React.FC<TrainingLogsProps> = ({ jobId, job, onClose }) => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch logs
  const fetchLogs = async () => {
    if (!jobId) return;
    
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`http://localhost:8000/training/logs/${jobId}?limit=200`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Auto-refresh logs for active jobs
  useEffect(() => {
    if (autoRefresh && job?.status === 'running') {
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, job?.status]);

  // Initial load
  useEffect(() => {
    fetchLogs();
  }, [jobId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'stopped':
        return <X className="h-4 w-4 text-gray-500" />;
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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${formatTimestamp(log.timestamp)}] ${log.command}\n` +
      `Return Code: ${log.return_code}\n` +
      `Execution Time: ${log.execution_time.toFixed(2)}s\n` +
      `STDOUT:\n${log.stdout}\n` +
      (log.stderr ? `STDERR:\n${log.stderr}\n` : '') +
      '---\n'
    ).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-logs-${jobId.substring(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Logs Downloaded",
      description: "Training logs have been downloaded to your device.",
    });
  };

  if (!job) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center space-x-2">
                {getStatusIcon(job.status)}
                <span>Training Job {jobId.substring(0, 8)}...</span>
              </DialogTitle>
              <DialogDescription>
                {job.config.training_stage} • {job.config.model_depth} layers • {job.config.device_batch_size} batch size
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusBadge(job.status)}
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Job Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(job.status)}
                      <span className="font-medium">{job.status}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-lg font-bold">{job.progress}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Stage</p>
                    <p className="font-medium">{job.current_stage}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{formatDuration(job.start_time, job.end_time)}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                {job.status === 'running' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{job.current_stage}</span>
                      <span>{job.progress}%</span>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                  </div>
                )}

                {/* Error Message */}
                {job.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{job.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Training Metrics */}
            {Object.keys(job.metrics).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Training Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(job.metrics).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-muted-foreground">
                          {key.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="font-medium">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            {/* Log Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={isLoadingLogs}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadLogs}
                  disabled={logs.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-muted-foreground">Auto-refresh</label>
                <Button
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? 'ON' : 'OFF'}
                </Button>
              </div>
            </div>

            {/* Logs Display */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Terminal className="h-5 w-5" />
                  <span>Training Logs ({logs.length} entries)</span>
                </CardTitle>
                <CardDescription>
                  Real-time training output and command execution logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full">
                  <div className="space-y-2">
                    {logs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No logs available yet</p>
                      </div>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant={log.return_code === 0 ? "secondary" : "destructive"}>
                                {log.return_code === 0 ? 'SUCCESS' : 'FAILED'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatTimestamp(log.timestamp)}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {log.execution_time.toFixed(2)}s
                            </span>
                          </div>
                          
                          <div className="font-mono text-sm bg-muted p-2 rounded">
                            {log.command}
                          </div>
                          
                          {log.stdout && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">STDOUT:</p>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                {log.stdout}
                              </pre>
                            </div>
                          )}
                          
                          {log.stderr && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-red-600">STDERR:</p>
                              <pre className="text-xs bg-red-50 p-2 rounded overflow-x-auto text-red-800">
                                {log.stderr}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Training Configuration</CardTitle>
                <CardDescription>
                  Configuration used for this training job
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Training Stage</p>
                    <p className="font-medium">{job.config.training_stage}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model Depth</p>
                    <p className="font-medium">{job.config.model_depth}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Device Batch Size</p>
                    <p className="font-medium">{job.config.device_batch_size}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max Sequence Length</p>
                    <p className="font-medium">{job.config.max_seq_len}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Number of Iterations</p>
                    <p className="font-medium">
                      {job.config.num_iterations === -1 ? 'Auto' : job.config.num_iterations}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data:Param Ratio</p>
                    <p className="font-medium">{job.config.target_param_data_ratio}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">W&B Run</p>
                    <p className="font-medium">{job.config.wandb_run}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Eval Every</p>
                    <p className="font-medium">{job.config.eval_every || 'Default'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Core Metric Every</p>
                    <p className="font-medium">{job.config.core_metric_every || 'Default'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TrainingLogs;
