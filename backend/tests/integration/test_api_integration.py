"""
Integration tests for nanochat training API endpoints
"""

import pytest
import asyncio
import json
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from main import app
from nanochat_training_service import NanochatTrainingService, TrainingConfig


class TestTrainingAPI:
    """Test training API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def mock_training_service(self):
        """Mock training service"""
        with patch('main.training_service') as mock_service:
            mock_service.start_training = AsyncMock(return_value="test-job-id")
            mock_service.get_training_status.return_value = {
                "job_id": "test-job-id",
                "status": "running",
                "progress": 50,
                "current_stage": "training",
                "start_time": "2024-01-01T00:00:00",
                "end_time": None,
                "error": None,
                "metrics": {},
                "config": {}
            }
            mock_service.get_training_logs.return_value = [
                {
                    "command": "python -m scripts.base_train",
                    "stdout": "Training started",
                    "stderr": "",
                    "return_code": 0,
                    "execution_time": 10.5,
                    "timestamp": "2024-01-01T00:00:00"
                }
            ]
            mock_service.stop_training.return_value = True
            mock_service.list_jobs.return_value = {
                "active": ["test-job-id"],
                "completed": []
            }
            mock_service.cleanup_old_jobs.return_value = None
            yield mock_service
    
    def test_start_training_cpu_demo(self, client, mock_training_service):
        """Test starting CPU demo training"""
        config = {
            "training_stage": "cpu_demo",
            "model_depth": 4,
            "device_batch_size": 1,
            "num_iterations": 10
        }
        
        response = client.post("/training/start", json=config)
        
        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == "test-job-id"
        assert data["status"] == "started"
        assert data["config"]["training_stage"] == "cpu_demo"
        
        mock_training_service.start_training.assert_called_once()
    
    def test_start_training_single_gpu(self, client, mock_training_service):
        """Test starting single GPU training"""
        config = {
            "training_stage": "single_gpu",
            "model_depth": 20,
            "device_batch_size": 16,
            "num_iterations": -1,
            "target_param_data_ratio": 20
        }
        
        response = client.post("/training/start", json=config)
        
        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == "test-job-id"
        assert data["config"]["training_stage"] == "single_gpu"
    
    def test_start_training_invalid_config(self, client, mock_training_service):
        """Test starting training with invalid config"""
        config = {
            "training_stage": "invalid_stage",
            "model_depth": -1  # Invalid depth
        }
        
        response = client.post("/training/start", json=config)
        
        # Should still work as we're not validating in the endpoint
        assert response.status_code == 200
    
    def test_get_training_status(self, client, mock_training_service):
        """Test getting training status"""
        response = client.get("/training/status/test-job-id")
        
        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == "test-job-id"
        assert data["status"] == "running"
        assert data["progress"] == 50
        
        mock_training_service.get_training_status.assert_called_once_with("test-job-id")
    
    def test_get_training_status_not_found(self, client, mock_training_service):
        """Test getting status for non-existent job"""
        mock_training_service.get_training_status.return_value = None
        
        response = client.get("/training/status/non-existent-job")
        
        assert response.status_code == 404
        assert "Job not found" in response.json()["detail"]
    
    def test_get_training_logs(self, client, mock_training_service):
        """Test getting training logs"""
        response = client.get("/training/logs/test-job-id")
        
        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == "test-job-id"
        assert len(data["logs"]) == 1
        assert data["logs"][0]["command"] == "python -m scripts.base_train"
        
        mock_training_service.get_training_logs.assert_called_once_with("test-job-id", 100)
    
    def test_get_training_logs_with_limit(self, client, mock_training_service):
        """Test getting training logs with limit"""
        response = client.get("/training/logs/test-job-id?limit=50")
        
        assert response.status_code == 200
        mock_training_service.get_training_logs.assert_called_once_with("test-job-id", 50)
    
    def test_get_training_logs_not_found(self, client, mock_training_service):
        """Test getting logs for non-existent job"""
        mock_training_service.get_training_logs.return_value = None
        
        response = client.get("/training/logs/non-existent-job")
        
        assert response.status_code == 404
        assert "Job not found" in response.json()["detail"]
    
    def test_stop_training(self, client, mock_training_service):
        """Test stopping a training job"""
        response = client.post("/training/stop/test-job-id")
        
        assert response.status_code == 200
        data = response.json()
        assert data["job_id"] == "test-job-id"
        assert data["status"] == "stopped"
        
        mock_training_service.stop_training.assert_called_once_with("test-job-id")
    
    def test_stop_training_not_found(self, client, mock_training_service):
        """Test stopping non-existent job"""
        mock_training_service.stop_training.return_value = False
        
        response = client.post("/training/stop/non-existent-job")
        
        assert response.status_code == 404
        assert "Job not found" in response.json()["detail"]
    
    def test_list_training_jobs(self, client, mock_training_service):
        """Test listing all training jobs"""
        response = client.get("/training/jobs")
        
        assert response.status_code == 200
        data = response.json()
        assert data["active_jobs"] == 1
        assert data["completed_jobs"] == 0
        assert "test-job-id" in data["jobs"]["active"]
        
        mock_training_service.list_jobs.assert_called_once()
    
    def test_cleanup_old_jobs(self, client, mock_training_service):
        """Test cleaning up old jobs"""
        response = client.post("/training/cleanup?max_age_hours=12")
        
        assert response.status_code == 200
        data = response.json()
        assert "Cleaned up jobs older than 12 hours" in data["message"]
        
        mock_training_service.cleanup_old_jobs.assert_called_once_with(12)
    
    def test_get_training_config_templates(self, client):
        """Test getting training config templates"""
        response = client.get("/training/config/templates")
        
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        
        templates = data["templates"]
        assert "cpu_demo" in templates
        assert "single_gpu" in templates
        assert "full_training" in templates
        
        # Check CPU demo template
        cpu_demo = templates["cpu_demo"]
        assert cpu_demo["training_stage"] == "cpu_demo"
        assert cpu_demo["model_depth"] == 4
        assert cpu_demo["device_batch_size"] == 1
        assert "description" in cpu_demo


class TestTrainingServiceIntegration:
    """Test training service integration with real service"""
    
    @pytest.fixture
    def real_service(self):
        """Create real training service instance"""
        with patch('os.makedirs'):
            return NanochatTrainingService()
    
    def test_service_initialization(self, real_service):
        """Test service initialization"""
        assert len(real_service.active_jobs) == 0
        assert len(real_service.completed_jobs) == 0
    
    def test_job_creation_and_management(self, real_service):
        """Test job creation and management"""
        config = TrainingConfig(training_stage="cpu_demo")
        
        # Create a job manually
        job_id = "test-job-id"
        job = real_service.active_jobs[job_id] = real_service.active_jobs.get(job_id, None)
        
        # Test job listing
        jobs = real_service.list_jobs()
        assert job_id in jobs["active"]
        
        # Test job status
        status = real_service.get_training_status(job_id)
        assert status is not None
        assert status["job_id"] == job_id
    
    @pytest.mark.asyncio
    async def test_command_execution_mock(self, real_service):
        """Test command execution with mocked subprocess"""
        config = TrainingConfig()
        job = real_service.active_jobs["test-job"] = real_service.active_jobs.get("test-job", None)
        
        with patch('asyncio.create_subprocess_exec') as mock_subprocess:
            # Mock successful command
            mock_process = AsyncMock()
            mock_process.communicate.return_value = (b"success", b"")
            mock_process.returncode = 0
            mock_subprocess.return_value = mock_process
            
            result = await real_service._execute_command(["echo", "test"], job)
            
            assert result["return_code"] == 0
            assert result["stdout"] == "success"
            assert len(job.logs) == 1


class TestErrorHandling:
    """Test error handling in API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_start_training_service_error(self, client):
        """Test handling of service errors during training start"""
        with patch('main.training_service') as mock_service:
            mock_service.start_training.side_effect = Exception("Service error")
            
            response = client.post("/training/start", json={"training_stage": "cpu_demo"})
            
            assert response.status_code == 500
            assert "Failed to start training" in response.json()["detail"]
    
    def test_invalid_json_request(self, client):
        """Test handling of invalid JSON requests"""
        response = client.post(
            "/training/start",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_missing_required_fields(self, client):
        """Test handling of missing required fields"""
        response = client.post("/training/start", json={})
        
        # Should work with default values
        assert response.status_code == 200


class TestConcurrentRequests:
    """Test handling of concurrent requests"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_multiple_training_jobs(self, client):
        """Test starting multiple training jobs"""
        with patch('main.training_service') as mock_service:
            mock_service.start_training = AsyncMock(side_effect=["job-1", "job-2", "job-3"])
            
            # Start multiple jobs
            responses = []
            for i in range(3):
                response = client.post("/training/start", json={
                    "training_stage": "cpu_demo",
                    "num_iterations": 10
                })
                responses.append(response)
            
            # All should succeed
            for response in responses:
                assert response.status_code == 200
            
            # Service should have been called multiple times
            assert mock_service.start_training.call_count == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
