/**
 * Training Metrics Component
 * Displays training performance metrics and statistics
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Zap,
  Cpu,
  HardDrive
} from 'lucide-react';

interface TrainingMetricsProps {
  jobs: Array<{
    id: string;
    status: string;
    progress: number;
    start_time: string;
    end_time?: string;
    config: any;
    metrics: Record<string, any>;
  }>;
}

const TrainingMetrics: React.FC<TrainingMetricsProps> = ({ jobs }) => {
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');
  const activeJobs = jobs.filter(job => job.status === 'running');

  const getAverageDuration = () => {
    if (completedJobs.length === 0) return 'N/A';
    
    const totalMs = completedJobs.reduce((sum, job) => {
      const start = new Date(job.start_time);
      const end = new Date(job.end_time!);
      return sum + (end.getTime() - start.getTime());
    }, 0);
    
    const avgMs = totalMs / completedJobs.length;
    const avgMins = Math.floor(avgMs / 60000);
    const avgHours = Math.floor(avgMins / 60);
    
    if (avgHours > 0) {
      return `${avgHours}h ${avgMins % 60}m`;
    }
    return `${avgMins}m`;
  };

  const getSuccessRate = () => {
    const totalJobs = completedJobs.length + failedJobs.length;
    if (totalJobs === 0) return 0;
    return Math.round((completedJobs.length / totalJobs) * 100);
  };

  const getAverageProgress = () => {
    if (activeJobs.length === 0) return 0;
    return Math.round(activeJobs.reduce((sum, job) => sum + job.progress, 0) / activeJobs.length);
  };

  const getTrainingStageStats = () => {
    const stageStats: Record<string, { total: number; completed: number; failed: number }> = {};
    
    jobs.forEach(job => {
      const stage = job.config.training_stage;
      if (!stageStats[stage]) {
        stageStats[stage] = { total: 0, completed: 0, failed: 0 };
      }
      stageStats[stage].total++;
      
      if (job.status === 'completed') {
        stageStats[stage].completed++;
      } else if (job.status === 'failed') {
        stageStats[stage].failed++;
      }
    });
    
    return stageStats;
  };

  const getModelSizeStats = () => {
    const sizeStats: Record<string, { total: number; completed: number; failed: number }> = {};
    
    jobs.forEach(job => {
      const depth = job.config.model_depth;
      const sizeKey = `${depth}L`;
      
      if (!sizeStats[sizeKey]) {
        sizeStats[sizeKey] = { total: 0, completed: 0, failed: 0 };
      }
      sizeStats[sizeKey].total++;
      
      if (job.status === 'completed') {
        sizeStats[sizeKey].completed++;
      } else if (job.status === 'failed') {
        sizeStats[sizeKey].failed++;
      }
    });
    
    return sizeStats;
  };

  const stageStats = getTrainingStageStats();
  const sizeStats = getModelSizeStats();

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Jobs</p>
                <p className="text-2xl font-bold">{jobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold">{getSuccessRate()}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Avg Duration</p>
                <p className="text-lg font-bold">{getAverageDuration()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Active Progress</p>
                <p className="text-2xl font-bold">{getAverageProgress()}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Stage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Training Stage Statistics</CardTitle>
          <CardDescription>Performance breakdown by training stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stageStats).map(([stage, stats]) => {
              const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
              
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{stage.toUpperCase()}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {stats.total} total • {stats.completed} completed • {stats.failed} failed
                      </span>
                    </div>
                    <span className="text-sm font-medium">{successRate}% success</span>
                  </div>
                  <Progress value={successRate} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Model Size Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Model Size Statistics</CardTitle>
          <CardDescription>Performance breakdown by model depth</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(sizeStats).map(([size, stats]) => {
              const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
              
              return (
                <div key={size} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{size}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {stats.total} total • {stats.completed} completed • {stats.failed} failed
                      </span>
                    </div>
                    <span className="text-sm font-medium">{successRate}% success</span>
                  </div>
                  <Progress value={successRate} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Training Activity</CardTitle>
          <CardDescription>Latest training jobs and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {jobs.slice(0, 5).map((job) => {
              const getStatusIcon = (status: string) => {
                switch (status) {
                  case 'running':
                    return <Activity className="h-4 w-4 text-blue-500" />;
                  case 'completed':
                    return <CheckCircle className="h-4 w-4 text-green-500" />;
                  case 'failed':
                    return <XCircle className="h-4 w-4 text-red-500" />;
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

              return (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">
                        Job {job.id.substring(0, 8)}...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {job.config.training_stage} • {job.config.model_depth}L • {formatDuration(job.start_time, job.end_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(job.status)}
                    {job.status === 'running' && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{job.progress}%</span>
                        <Progress value={job.progress} className="w-16 h-2" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {jobs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No training jobs yet</p>
                <p className="text-sm">Start your first training job to see metrics here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resource Usage Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resource Usage Insights</CardTitle>
          <CardDescription>Training efficiency and resource utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">CPU Training</p>
                <p className="text-lg font-bold">
                  {stageStats.cpu_demo?.total || 0} jobs
                </p>
                <p className="text-xs text-muted-foreground">
                  {stageStats.cpu_demo ? Math.round((stageStats.cpu_demo.completed / stageStats.cpu_demo.total) * 100) : 0}% success
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">GPU Training</p>
                <p className="text-lg font-bold">
                  {(stageStats.single_gpu?.total || 0) + (stageStats.full?.total || 0)} jobs
                </p>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const gpuTotal = (stageStats.single_gpu?.total || 0) + (stageStats.full?.total || 0);
                    const gpuCompleted = (stageStats.single_gpu?.completed || 0) + (stageStats.full?.completed || 0);
                    return gpuTotal > 0 ? Math.round((gpuCompleted / gpuTotal) * 100) : 0;
                  })()}% success
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Data Efficiency</p>
                <p className="text-lg font-bold">
                  {(() => {
                    const avgRatio = jobs.length > 0 
                      ? Math.round(jobs.reduce((sum, job) => sum + job.config.target_param_data_ratio, 0) / jobs.length)
                      : 0;
                    return avgRatio;
                  })()}:1
                </p>
                <p className="text-xs text-muted-foreground">avg data:param ratio</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingMetrics;
