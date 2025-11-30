# Nanochat Training UI Integration

This document describes the frontend UI components and integration for the nanochat training functionality in Madellang.

## 🎯 Overview

The nanochat training UI provides a comprehensive interface for managing ChatGPT-like model training jobs locally. It includes real-time monitoring, configuration management, and progress tracking.

## 📁 File Structure

```
frontend/src/
├── services/
│   └── TrainingService.ts          # API service for training operations
├── hooks/
│   └── useTraining.ts             # Custom hook for training state management
├── components/
│   ├── TrainingDashboard.tsx      # Main training dashboard
│   ├── TrainingConfigForm.tsx     # Training configuration form
│   ├── TrainingLogs.tsx           # Real-time logs viewer
│   ├── TrainingMetrics.tsx        # Training metrics and statistics
│   └── TrainingServiceTest.tsx    # Development test component
└── pages/
    └── Training.tsx               # Training page component
```

## 🔧 Components

### 1. TrainingService (`services/TrainingService.ts`)

**Purpose**: Handles all API communication with the backend training service.

**Key Methods**:
- `startTraining(config)` - Start a new training job
- `getTrainingStatus(jobId)` - Get job status and progress
- `getTrainingLogs(jobId)` - Retrieve training logs
- `stopTraining(jobId)` - Stop a running job
- `listJobs()` - List all training jobs
- `getTemplates()` - Get configuration templates
- `cleanupJobs()` - Clean up old jobs

**Usage**:
```typescript
import TrainingService from '@/services/TrainingService';

const service = new TrainingService();
const job = await service.startTraining({
  training_stage: 'cpu_demo',
  num_iterations: 50
});
```

### 2. useTraining Hook (`hooks/useTraining.ts`)

**Purpose**: Custom React hook for managing training state and operations.

**Features**:
- Real-time job status polling
- Automatic refresh of active jobs
- Error handling and loading states
- Utility functions for job management

**Usage**:
```typescript
import { useTraining } from '@/hooks/useTraining';

const {
  jobs,
  activeJobs,
  startTraining,
  stopTraining,
  isLoading,
  error
} = useTraining({ pollInterval: 5000 });
```

### 3. TrainingDashboard (`components/TrainingDashboard.tsx`)

**Purpose**: Main interface for managing training jobs.

**Features**:
- Job listing with status indicators
- Real-time progress tracking
- Quick actions (start, stop, view logs)
- Statistics overview
- Template management
- Metrics visualization

**Key Sections**:
- **Header**: Title, quick actions, refresh button
- **Stats Cards**: Active jobs, completed jobs, failed jobs, templates
- **Jobs List**: Detailed job cards with progress bars
- **Tabs**: Jobs, Templates, Metrics
- **Modals**: Configuration form, logs viewer

### 4. TrainingConfigForm (`components/TrainingConfigForm.tsx`)

**Purpose**: Form for configuring and starting training jobs.

**Features**:
- Template selection
- Custom configuration options
- Real-time parameter validation
- Training preview with estimates
- Resource requirement warnings

**Configuration Options**:
- Training stage (CPU demo, single GPU, full)
- Model depth (layers)
- Device batch size
- Max sequence length
- Number of iterations
- Data:parameter ratio
- Weights & Biases run name

### 5. TrainingLogs (`components/TrainingLogs.tsx`)

**Purpose**: Real-time logs viewer for training jobs.

**Features**:
- Real-time log streaming
- Command execution details
- Error highlighting
- Log download functionality
- Auto-refresh toggle
- Job status overview

**Tabs**:
- **Overview**: Job status, progress, metrics
- **Logs**: Real-time command output
- **Configuration**: Job settings

### 6. TrainingMetrics (`components/TrainingMetrics.tsx`)

**Purpose**: Training performance metrics and statistics.

**Features**:
- Overall statistics (success rate, avg duration)
- Training stage breakdown
- Model size statistics
- Recent activity timeline
- Resource usage insights

### 7. TrainingPage (`pages/Training.tsx`)

**Purpose**: Main training page with navigation and overview.

**Features**:
- Quick start guide
- Training modes overview
- System requirements
- Service test component
- Main training dashboard

## 🚀 Usage Guide

### Starting a Training Job

1. **Navigate to Training Page**:
   ```typescript
   navigate('/training');
   ```

2. **Click "Start Training"** button

3. **Select Template** or customize settings:
   - CPU Demo: 4 layers, ~30 minutes
   - Single GPU: 20 layers, ~4-8 hours
   - Full Training: 32 layers, ~24-48 hours

4. **Configure Parameters**:
   - Model depth (1-64 layers)
   - Batch size (1-64)
   - Sequence length (512-4096)
   - Iterations (-1 for auto)

5. **Review Preview** and click "Start Training"

### Monitoring Progress

1. **Real-time Updates**: Jobs automatically refresh every 3 seconds
2. **Progress Bars**: Visual progress indicators
3. **Status Badges**: Running, completed, failed, stopped
4. **Logs**: Click eye icon to view real-time logs
5. **Metrics**: Switch to Metrics tab for statistics

### Managing Jobs

- **Stop Job**: Click stop button on active jobs
- **View Logs**: Click eye icon for detailed logs
- **Download Logs**: Use download button in logs modal
- **Cleanup**: Remove old completed jobs

## 🎨 UI Features

### Status Indicators

| Status | Icon | Color | Badge |
|--------|------|-------|-------|
| Running | Activity | Blue | Default |
| Completed | CheckCircle | Green | Secondary |
| Failed | XCircle | Red | Destructive |
| Stopped | Square | Gray | Outline |
| Starting | Clock | Yellow | Secondary |

### Progress Visualization

- **Progress Bars**: Real-time completion percentage
- **Stage Indicators**: Current training stage
- **Duration Tracking**: Elapsed time display
- **Resource Usage**: CPU/GPU utilization

### Responsive Design

- **Mobile**: Single column layout
- **Tablet**: 2-column grid
- **Desktop**: 3-4 column grid
- **Cards**: Adaptive sizing and spacing

## 🔌 API Integration

### Backend Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/training/start` | Start training job |
| GET | `/training/status/{job_id}` | Get job status |
| GET | `/training/logs/{job_id}` | Get job logs |
| POST | `/training/stop/{job_id}` | Stop job |
| GET | `/training/jobs` | List all jobs |
| GET | `/training/config/templates` | Get templates |
| POST | `/training/cleanup` | Cleanup old jobs |

### Error Handling

- **Network Errors**: Automatic retry with exponential backoff
- **API Errors**: User-friendly error messages
- **Validation Errors**: Real-time form validation
- **Timeout Errors**: Graceful degradation

## 🧪 Testing

### Development Testing

Use the `TrainingServiceTest` component for:
- Connection verification
- Template loading
- Job listing
- Quick training tests

### Manual Testing

1. **Start Backend**: Ensure training service is running
2. **Open Training Page**: Navigate to `/training`
3. **Test Connection**: Verify service test shows "Connected"
4. **Start CPU Demo**: Test with 5 iterations
5. **Monitor Progress**: Check real-time updates
6. **View Logs**: Verify log streaming works

## 🚨 Troubleshooting

### Common Issues

1. **Service Not Connected**:
   - Check backend is running on port 8000
   - Verify training endpoints are available
   - Check CORS settings

2. **Jobs Not Updating**:
   - Check polling interval settings
   - Verify WebSocket connections
   - Check browser console for errors

3. **Logs Not Loading**:
   - Verify job ID is correct
   - Check log endpoint availability
   - Ensure job is still active

4. **Configuration Errors**:
   - Validate parameter ranges
   - Check template availability
   - Verify required fields

### Debug Mode

Enable debug logging:
```typescript
const { useTraining } = useTraining({ 
  pollInterval: 1000, // Faster polling
  debug: true 
});
```

## 📈 Performance Considerations

### Optimization

- **Polling**: Configurable intervals (default 5s)
- **Caching**: Job data cached locally
- **Debouncing**: Form input debounced
- **Lazy Loading**: Components loaded on demand

### Memory Management

- **Cleanup**: Automatic cleanup of old jobs
- **Limits**: Log entries limited to 200
- **Pagination**: Large datasets paginated

## 🔮 Future Enhancements

### Planned Features

- **Real-time Charts**: Training loss/metrics visualization
- **Model Comparison**: Side-by-side model evaluation
- **Export Models**: Download trained models
- **Training Schedules**: Automated training jobs
- **Resource Monitoring**: GPU/CPU usage graphs
- **Training History**: Long-term training analytics

### Integration Opportunities

- **Weights & Biases**: Enhanced logging integration
- **Model Hub**: Share trained models
- **A/B Testing**: Compare different configurations
- **Automated Tuning**: Hyperparameter optimization

## 📚 Related Documentation

- [Backend Training Service](../backend/README.md#nanochat-training)
- [API Documentation](../backend/README.md#api-endpoints)
- [Setup Guide](../NANOCHAT_SETUP_GUIDE.md)
- [Test Plan](../NANOCHAT_TEST_PLAN.md)
- [Integration Plan](../NANOCHAT_INTEGRATION_PLAN.md)
