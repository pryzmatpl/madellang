"""
Unit tests for nanochat training service
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from nanochat_training_service import NanochatTrainingService, TrainingConfig, TrainingJob


class TestTrainingConfig:
    """Test TrainingConfig validation"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = TrainingConfig()
        assert config.model_depth == 20
        assert config.device_batch_size == 32
        assert config.max_seq_len == 2048
        assert config.num_iterations == -1
        assert config.target_param_data_ratio == 20
        assert config.wandb_run == "dummy"
        assert config.training_stage == "cpu_demo"
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = TrainingConfig(
            model_depth=4,
            device_batch_size=1,
            training_stage="single_gpu",
            num_iterations=100
        )
        assert config.model_depth == 4
        assert config.device_batch_size == 1
        assert config.training_stage == "single_gpu"
        assert config.num_iterations == 100
    
    def test_config_serialization(self):
        """Test configuration serialization"""
        config = TrainingConfig(model_depth=8)
        config_dict = config.dict()
        assert isinstance(config_dict, dict)
        assert config_dict["model_depth"] == 8
        assert "device_batch_size" in config_dict


class TestTrainingJob:
    """Test TrainingJob functionality"""
    
    def test_job_creation(self):
        """Test training job creation"""
        config = TrainingConfig(training_stage="cpu_demo")
        job = TrainingJob("test-job-id", config)
        
        assert job.job_id == "test-job-id"
        assert job.config == config
        assert job.status == "starting"
        assert job.progress == 0
        assert job.current_stage == "initializing"
        assert job.logs == []
        assert job.start_time is not None
        assert job.end_time is None
        assert job.error is None
        assert job.metrics == {}
    
    def test_job_status_update(self):
        """Test job status updates"""
        config = TrainingConfig()
        job = TrainingJob("test-job-id", config)
        
        job.status = "running"
        job.progress = 50
        job.current_stage = "training"
        
        assert job.status == "running"
        assert job.progress == 50
        assert job.current_stage == "training"
    
    def test_job_completion(self):
        """Test job completion"""
        config = TrainingConfig()
        job = TrainingJob("test-job-id", config)
        
        job.status = "completed"
        job.end_time = datetime.now()
        job.progress = 100
        
        assert job.status == "completed"
        assert job.end_time is not None
        assert job.progress == 100


class TestNanochatTrainingService:
    """Test NanochatTrainingService functionality"""
    
    @pytest.fixture
    def service(self):
        """Create a training service instance"""
        with patch('os.makedirs'):
            return NanochatTrainingService()
    
    def test_service_initialization(self, service):
        """Test service initialization"""
        assert len(service.active_jobs) == 0
        assert len(service.completed_jobs) == 0
    
    def test_setup_directories(self):
        """Test directory setup"""
        with patch('os.makedirs') as mock_makedirs:
            service = NanochatTrainingService()
            mock_makedirs.assert_called()
    
    @pytest.mark.asyncio
    async def test_start_training(self, service):
        """Test starting a training job"""
        config = TrainingConfig(training_stage="cpu_demo")
        
        with patch.object(service, '_run_training', new_callable=AsyncMock):
            job_id = await service.start_training(config, "test-job-id")
            
            assert job_id == "test-job-id"
            assert "test-job-id" in service.active_jobs
    
    def test_get_training_status_active(self, service):
        """Test getting status of active job"""
        config = TrainingConfig()
        job = TrainingJob("test-job-id", config)
        service.active_jobs["test-job-id"] = job
        
        status = service.get_training_status("test-job-id")
        
        assert status is not None
        assert status["job_id"] == "test-job-id"
        assert status["status"] == "starting"
    
    def test_get_training_status_completed(self, service):
        """Test getting status of completed job"""
        config = TrainingConfig()
        job = TrainingJob("test-job-id", config)
        job.status = "completed"
        service.completed_jobs["test-job-id"] = job
        
        status = service.get_training_status("test-job-id")
        
        assert status is not None
        assert status["job_id"] == "test-job-id"
        assert status["status"] == "completed"
    
    def test_get_training_status_not_found(self, service):
        """Test getting status of non-existent job"""
        status = service.get_training_status("non-existent-job")
        assert status is None
    
    def test_get_training_logs(self, service):
        """Test getting training logs"""
        config = TrainingConfig()
        job = TrainingJob("test-job-id", config)
        job.logs = [{"command": "test", "stdout": "output"}]
        service.active_jobs["test-job-id"] = job
        
        logs = service.get_training_logs("test-job-id")
        
        assert len(logs) == 1
        assert logs[0]["command"] == "test"
    
    def test_stop_training(self, service):
        """Test stopping a training job"""
        config = TrainingConfig()
        job = TrainingJob("test-job-id", config)
        service.active_jobs["test-job-id"] = job
        
        success = service.stop_training("test-job-id")
        
        assert success is True
        assert "test-job-id" not in service.active_jobs
        assert "test-job-id" in service.completed_jobs
        assert service.completed_jobs["test-job-id"].status == "stopped"
    
    def test_stop_training_not_found(self, service):
        """Test stopping non-existent job"""
        success = service.stop_training("non-existent-job")
        assert success is False
    
    def test_list_jobs(self, service):
        """Test listing all jobs"""
        config = TrainingConfig()
        
        # Add active job
        active_job = TrainingJob("active-job", config)
        service.active_jobs["active-job"] = active_job
        
        # Add completed job
        completed_job = TrainingJob("completed-job", config)
        service.completed_jobs["completed-job"] = completed_job
        
        jobs = service.list_jobs()
        
        assert "active-job" in jobs["active"]
        assert "completed-job" in jobs["completed"]
    
    def test_cleanup_old_jobs(self, service):
        """Test cleanup of old jobs"""
        config = TrainingConfig()
        
        # Add old job
        old_job = TrainingJob("old-job", config)
        old_job.end_time = datetime.now().replace(year=2020)  # Very old
        service.completed_jobs["old-job"] = old_job
        
        # Add recent job
        recent_job = TrainingJob("recent-job", config)
        recent_job.end_time = datetime.now()
        service.completed_jobs["recent-job"] = recent_job
        
        service.cleanup_old_jobs(max_age_hours=1)
        
        assert "old-job" not in service.completed_jobs
        assert "recent-job" in service.completed_jobs
    
    @pytest.mark.asyncio
    async def test_execute_command_success(self, service):
        """Test successful command execution"""
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            # Mock successful subprocess
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (b"stdout", b"stderr")
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process
            
            config = TrainingConfig()
            job = TrainingJob("test-job-id", config)
            
            result = await service._execute_command(["echo", "test"], job)
            
            assert result["return_code"] == 0
            assert result["stdout"] == "stdout"
            assert result["stderr"] == "stderr"
            assert len(job.logs) == 1
    
    @pytest.mark.asyncio
    async def test_execute_command_failure(self, service):
        """Test failed command execution"""
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            # Mock failed subprocess
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (b"stdout", b"error message")
            mock_process.returncode = 1
            mock_subprocess.return_value = mock_process
            
            config = TrainingConfig()
            job = TrainingJob("test-job-id", config)
            
            with pytest.raises(RuntimeError, match="Command failed"):
                await service._execute_command(["false"], job)
            
            assert len(job.logs) == 1
            assert job.logs[0]["return_code"] == 1


class TestTrainingPipeline:
    """Test training pipeline functionality"""
    
    @pytest.fixture
    def service(self):
        """Create a training service instance"""
        with patch('os.makedirs'):
            return NanochatTrainingService()
    
    @pytest.mark.asyncio
    async def test_cpu_demo_pipeline(self, service):
        """Test CPU demo training pipeline"""
        config = TrainingConfig(training_stage="cpu_demo")
        job = TrainingJob("test-job-id", config)
        
        with patch.object(service, '_execute_command', new_callable=AsyncMock) as mock_execute:
            mock_execute.return_value = {
                "command": "test",
                "stdout": "success",
                "stderr": "",
                "return_code": 0,
                "execution_time": 1.0,
                "timestamp": datetime.now().isoformat()
            }
            
            await service._run_cpu_demo(config, job)
            
            # Should have executed multiple commands
            assert mock_execute.call_count > 5
            assert job.status == "completed"
            assert job.progress == 90
    
    @pytest.mark.asyncio
    async def test_single_gpu_pipeline(self, service):
        """Test single GPU training pipeline"""
        config = TrainingConfig(training_stage="single_gpu")
        job = TrainingJob("test-job-id", config)
        
        with patch.object(service, '_execute_command', new_callable=AsyncMock) as mock_execute:
            # Mock GPU check success
            mock_execute.return_value = {
                "command": "test",
                "stdout": "True",
                "stderr": "",
                "return_code": 0,
                "execution_time": 1.0,
                "timestamp": datetime.now().isoformat()
            }
            
            await service._run_single_gpu(config, job)
            
            # Should have executed multiple commands
            assert mock_execute.call_count > 5
            assert job.status == "completed"
    
    @pytest.mark.asyncio
    async def test_gpu_check_failure(self, service):
        """Test GPU check failure"""
        config = TrainingConfig(training_stage="single_gpu")
        job = TrainingJob("test-job-id", config)
        
        with patch.object(service, '_execute_command', new_callable=AsyncMock) as mock_execute:
            # Mock GPU check failure
            mock_execute.return_value = {
                "command": "test",
                "stdout": "False",
                "stderr": "",
                "return_code": 0,
                "execution_time": 1.0,
                "timestamp": datetime.now().isoformat()
            }
            
            with pytest.raises(RuntimeError, match="GPU not available"):
                await service._run_single_gpu(config, job)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
