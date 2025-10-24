/**
 * Training Configuration Form Component
 * Form for configuring and starting nanochat training jobs
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TrainingConfig } from '@/services/TrainingService';
import { AlertCircle, Info, Zap, Clock, Cpu } from 'lucide-react';

interface TrainingConfigFormProps {
  templates: Record<string, any>;
  onSubmit: (config: Partial<TrainingConfig>) => void;
  onCancel: () => void;
}

const TrainingConfigForm: React.FC<TrainingConfigFormProps> = ({
  templates,
  onSubmit,
  onCancel,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [config, setConfig] = useState<Partial<TrainingConfig>>({
    training_stage: 'cpu_demo',
    model_depth: 4,
    device_batch_size: 1,
    max_seq_len: 1024,
    num_iterations: 50,
    target_param_data_ratio: 20,
    wandb_run: 'dummy',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update config when template changes
  useEffect(() => {
    if (selectedTemplate && templates[selectedTemplate]) {
      const template = templates[selectedTemplate];
      setConfig({
        training_stage: template.training_stage,
        model_depth: template.model_depth,
        device_batch_size: template.device_batch_size,
        max_seq_len: template.max_seq_len,
        num_iterations: template.num_iterations,
        target_param_data_ratio: template.target_param_data_ratio || 20,
        wandb_run: 'dummy',
      });
    }
  }, [selectedTemplate, templates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(config);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEstimatedDuration = () => {
    const stage = config.training_stage;
    const iterations = config.num_iterations || 0;
    
    switch (stage) {
      case 'cpu_demo':
        return '~30 minutes';
      case 'single_gpu':
        return '~4-8 hours';
      case 'full':
        return '~24-48 hours';
      default:
        return 'Unknown';
    }
  };

  const getEstimatedModelSize = () => {
    const depth = config.model_depth || 4;
    const seqLen = config.max_seq_len || 1024;
    
    // Rough estimation based on nanochat architecture
    const vocabSize = 65536;
    const modelDim = depth * 64;
    const numHeads = Math.max(1, Math.ceil(modelDim / 128));
    
    // Approximate parameter count
    const embeddingParams = vocabSize * modelDim;
    const transformerParams = depth * (
      modelDim * modelDim * 4 + // attention
      modelDim * modelDim * 2 + // feedforward
      modelDim * seqLen * 2      // positional encoding
    );
    const totalParams = embeddingParams + transformerParams;
    
    if (totalParams > 1e9) {
      return `${(totalParams / 1e9).toFixed(1)}B parameters`;
    } else if (totalParams > 1e6) {
      return `${(totalParams / 1e6).toFixed(1)}M parameters`;
    } else {
      return `${(totalParams / 1e3).toFixed(1)}K parameters`;
    }
  };

  const getResourceRequirements = () => {
    const stage = config.training_stage;
    
    switch (stage) {
      case 'cpu_demo':
        return { cpu: 'High', memory: '8GB+', gpu: 'None' };
      case 'single_gpu':
        return { cpu: 'Medium', memory: '16GB+', gpu: '8GB+ VRAM' };
      case 'full':
        return { cpu: 'Low', memory: '32GB+', gpu: '8xH100' };
      default:
        return { cpu: 'Unknown', memory: 'Unknown', gpu: 'Unknown' };
    }
  };

  const requirements = getResourceRequirements();

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start Nanochat Training</DialogTitle>
          <DialogDescription>
            Configure and start a new nanochat training job. Choose a template or customize the settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-4">
            <Label htmlFor="template">Training Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a training template" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templates).map(([key, template]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between w-full">
                      <span>{key.replace('_', ' ').toUpperCase()}</span>
                      <Badge variant="outline" className="ml-2">
                        {template.model_depth}L
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedTemplate && templates[selectedTemplate] && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {templates[selectedTemplate].description}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Configuration Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Settings</CardTitle>
                <CardDescription>Core training parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="training_stage">Training Stage</Label>
                  <Select
                    value={config.training_stage}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, training_stage: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpu_demo">CPU Demo</SelectItem>
                      <SelectItem value="single_gpu">Single GPU</SelectItem>
                      <SelectItem value="full">Full Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="model_depth">Model Depth (Layers)</Label>
                  <Input
                    id="model_depth"
                    type="number"
                    min="1"
                    max="64"
                    value={config.model_depth}
                    onChange={(e) => setConfig(prev => ({ ...prev, model_depth: parseInt(e.target.value) || 4 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="device_batch_size">Device Batch Size</Label>
                  <Input
                    id="device_batch_size"
                    type="number"
                    min="1"
                    max="64"
                    value={config.device_batch_size}
                    onChange={(e) => setConfig(prev => ({ ...prev, device_batch_size: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="max_seq_len">Max Sequence Length</Label>
                  <Input
                    id="max_seq_len"
                    type="number"
                    min="512"
                    max="4096"
                    step="512"
                    value={config.max_seq_len}
                    onChange={(e) => setConfig(prev => ({ ...prev, max_seq_len: parseInt(e.target.value) || 1024 }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Advanced Settings</CardTitle>
                <CardDescription>Fine-tuning parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="num_iterations">Number of Iterations</Label>
                  <Input
                    id="num_iterations"
                    type="number"
                    min="-1"
                    value={config.num_iterations}
                    onChange={(e) => setConfig(prev => ({ ...prev, num_iterations: parseInt(e.target.value) || -1 }))}
                    placeholder="-1 for auto-calculate"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    -1 to auto-calculate based on data:param ratio
                  </p>
                </div>

                <div>
                  <Label htmlFor="target_param_data_ratio">Data:Param Ratio</Label>
                  <Input
                    id="target_param_data_ratio"
                    type="number"
                    min="1"
                    max="100"
                    value={config.target_param_data_ratio}
                    onChange={(e) => setConfig(prev => ({ ...prev, target_param_data_ratio: parseInt(e.target.value) || 20 }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Chinchilla optimal is 20
                  </p>
                </div>

                <div>
                  <Label htmlFor="wandb_run">Weights & Biases Run</Label>
                  <Input
                    id="wandb_run"
                    value={config.wandb_run}
                    onChange={(e) => setConfig(prev => ({ ...prev, wandb_run: e.target.value }))}
                    placeholder="dummy"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    "dummy" to disable logging
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Training Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Training Preview</CardTitle>
              <CardDescription>Estimated training details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Estimated Duration</p>
                    <p className="text-lg font-bold">{getEstimatedDuration()}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Model Size</p>
                    <p className="text-lg font-bold">{getEstimatedModelSize()}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Resource Requirements</p>
                    <div className="text-sm">
                      <p>CPU: {requirements.cpu}</p>
                      <p>Memory: {requirements.memory}</p>
                      <p>GPU: {requirements.gpu}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {config.training_stage === 'full' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Full training requires significant computational resources (8xH100 GPUs) 
                and may take 24-48 hours to complete. Make sure you have adequate resources.
              </AlertDescription>
            </Alert>
          )}

          {config.training_stage === 'single_gpu' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Single GPU training requires an AMD GPU with ROCm support or NVIDIA GPU with CUDA.
                Training will take 4-8 hours depending on your hardware.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Starting...' : 'Start Training'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TrainingConfigForm;
