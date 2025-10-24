/**
 * Training Page Component
 * Main page for nanochat training functionality
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Zap, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrainingDashboard from '@/components/TrainingDashboard';
import TrainingServiceTest from '@/components/TrainingServiceTest';

const TrainingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Translation
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-2">
                <Brain className="h-8 w-8 text-purple-500" />
                <span>Nanochat Training</span>
              </h1>
              <p className="text-muted-foreground">
                Train your own ChatGPT-like models locally with AMD GPU acceleration
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-green-600">
              <Zap className="h-3 w-3 mr-1" />
              AMD GPU Ready
            </Badge>
          </div>
        </div>

        {/* Quick Start Guide */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <span>Quick Start Guide</span>
            </CardTitle>
            <CardDescription>
              Get started with nanochat training in just a few steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <span className="font-medium">Choose Template</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Select from CPU demo, single GPU, or full training templates
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <span className="font-medium">Configure Settings</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Customize model depth, batch size, and training parameters
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <span className="font-medium">Monitor Progress</span>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Track training progress, logs, and metrics in real-time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Training Modes Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span>CPU Demo</span>
              </CardTitle>
              <CardDescription>Perfect for testing and learning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">~30 minutes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model Size</span>
                  <span className="font-medium">4 layers, ~1M params</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Resources</span>
                  <span className="font-medium">CPU only</span>
                </div>
              </div>
              <Badge variant="outline" className="w-full justify-center">
                Educational
              </Badge>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Zap className="h-5 w-5 text-purple-500" />
                <span>Single GPU</span>
              </CardTitle>
              <CardDescription>Production-ready training</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">~4-8 hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model Size</span>
                  <span className="font-medium">20 layers, ~500M params</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Resources</span>
                  <span className="font-medium">AMD/NVIDIA GPU</span>
                </div>
              </div>
              <Badge variant="default" className="w-full justify-center">
                Recommended
              </Badge>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Full Training</span>
              </CardTitle>
              <CardDescription>State-of-the-art models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">~24-48 hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model Size</span>
                  <span className="font-medium">32 layers, ~1.9B params</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Resources</span>
                  <span className="font-medium">8xH100 GPUs</span>
                </div>
              </div>
              <Badge variant="secondary" className="w-full justify-center">
                Research
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* System Requirements Alert */}
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>System Requirements:</strong> AMD GPU with ROCm support recommended for GPU training. 
            CPU training requires 8GB+ RAM. Ensure you have 50GB+ free disk space for datasets and models.
            <Button
              variant="link"
              size="sm"
              className="ml-2 p-0 h-auto"
              onClick={() => window.open('https://github.com/karpathy/nanochat', '_blank')}
            >
              Learn more about nanochat <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </AlertDescription>
        </Alert>

        {/* Service Test (Development) */}
        <div className="mb-6">
          <TrainingServiceTest />
        </div>

        {/* Main Training Dashboard */}
        <TrainingDashboard />
      </div>
    </div>
  );
};

export default TrainingPage;
