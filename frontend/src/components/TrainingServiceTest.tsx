/**
 * Test component to verify training service integration
 * This can be used for development and testing purposes
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import TrainingService from '@/services/TrainingService';

const TrainingServiceTest: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [templates, setTemplates] = useState<any>(null);
  const [jobs, setJobs] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trainingService = new TrainingService();

  const checkConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const connected = await trainingService.checkHealth();
      setIsConnected(connected);
      
      if (connected) {
        // Load templates and jobs
        const templatesData = await trainingService.getTemplates();
        setTemplates(templatesData.templates);
        
        const jobsData = await trainingService.listJobs();
        setJobs(jobsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const getStatusIcon = () => {
    if (isConnected === null) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    if (isConnected) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (isConnected === null) return 'Checking...';
    if (isConnected) return 'Connected';
    return 'Disconnected';
  };

  const getStatusBadge = () => {
    if (isConnected === null) return <Badge variant="secondary">Unknown</Badge>;
    if (isConnected) return <Badge variant="default">Connected</Badge>;
    return <Badge variant="destructive">Disconnected</Badge>;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Training Service Test</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Backend Status:</span>
            {getStatusBadge()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkConnection}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Service Information */}
        {isConnected && (
          <div className="space-y-4">
            {/* Templates */}
            {templates && (
              <div>
                <h3 className="font-semibold mb-2">Available Templates:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {Object.entries(templates).map(([key, template]: [string, any]) => (
                    <Badge key={key} variant="outline" className="justify-center">
                      {key.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Jobs */}
            {jobs && (
              <div>
                <h3 className="font-semibold mb-2">Training Jobs:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{jobs.active_jobs}</p>
                    <p className="text-sm text-blue-600">Active Jobs</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{jobs.completed_jobs}</p>
                    <p className="text-sm text-green-600">Completed Jobs</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Test */}
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Quick Test:</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Test the training service by starting a CPU demo training job.
              </p>
              <Button
                onClick={async () => {
                  try {
                    const result = await trainingService.startTraining({
                      training_stage: 'cpu_demo',
                      num_iterations: 5,
                      model_depth: 4,
                      device_batch_size: 1,
                      max_seq_len: 1024,
                      target_param_data_ratio: 20,
                      wandb_run: 'test'
                    });
                    alert(`Training started! Job ID: ${result.job_id}`);
                    checkConnection(); // Refresh data
                  } catch (err) {
                    alert(`Failed to start training: ${err instanceof Error ? err.message : 'Unknown error'}`);
                  }
                }}
                className="w-full"
              >
                Start CPU Demo Training (5 iterations)
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Make sure the backend service is running on <code>http://localhost:8000</code> 
              and the training endpoints are available.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingServiceTest;
