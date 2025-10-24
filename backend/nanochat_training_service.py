"""
Nanochat Training Service for MadeLang Backend

This service manages nanochat training jobs within the MadeLang infrastructure,
providing background training capabilities with progress monitoring.
"""

import asyncio
import subprocess
import json
import os
import time
import logging
from typing import Dict, Optional, List
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)

class TrainingConfig(BaseModel):
    """Configuration for nanochat training jobs"""
    model_depth: int = 20
    device_batch_size: int = 32
    max_seq_len: int = 2048
    num_iterations: int = -1
    target_param_data_ratio: int = 20
    wandb_run: str = "dummy"
    training_stage: str = "cpu_demo"  # cpu_demo, single_gpu, full
    eval_every: int = 250
    eval_tokens: int = 20 * 524288
    core_metric_every: int = 2000
    sample_every: int = 2000

class TrainingJob:
    """Represents a training job with its state and progress"""
    def __init__(self, job_id: str, config: TrainingConfig):
        self.job_id = job_id
        self.config = config
        self.status = "starting"
        self.progress = 0
        self.current_stage = "initializing"
        self.logs: List[Dict] = []
        self.start_time = datetime.now()
        self.end_time: Optional[datetime] = None
        self.error: Optional[str] = None
        self.metrics: Dict = {}

class NanochatTrainingService:
    """Service for managing nanochat training jobs"""
    
    def __init__(self):
        self.active_jobs: Dict[str, TrainingJob] = {}
        self.completed_jobs: Dict[str, TrainingJob] = {}
        self._setup_directories()
    
    def _setup_directories(self):
        """Create necessary directories for training"""
        directories = [
            "/app/cache/nanochat",
            "/app/cache/nanochat/tokenized_data",
            "/app/cache/nanochat/base_checkpoints",
            "/app/cache/nanochat/mid_checkpoints",
            "/app/cache/nanochat/sft_checkpoints",
            "/app/cache/nanochat/reports"
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
    
    async def start_training(self, config: TrainingConfig, job_id: str) -> str:
        """Start a nanochat training job"""
        logger.info(f"Starting training job {job_id} with config: {config.dict()}")
        
        job = TrainingJob(job_id, config)
        self.active_jobs[job_id] = job
        
        # Start training in background
        asyncio.create_task(self._run_training(config, job))
        
        return job_id
    
    async def _run_training(self, config: TrainingConfig, job: TrainingJob):
        """Run the actual training process"""
        try:
            job.status = "running"
            job.current_stage = "setup"
            
            # Setup environment
            await self._setup_environment(job)
            
            if config.training_stage == "cpu_demo":
                await self._run_cpu_demo(config, job)
            elif config.training_stage == "single_gpu":
                await self._run_single_gpu(config, job)
            elif config.training_stage == "full":
                await self._run_full_training(config, job)
            else:
                raise ValueError(f"Unknown training stage: {config.training_stage}")
            
            job.status = "completed"
            job.end_time = datetime.now()
            job.progress = 100
            
            # Move to completed jobs
            self.completed_jobs[job.job_id] = job
            del self.active_jobs[job.job_id]
            
            logger.info(f"Training job {job.job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Training job {job.job_id} failed: {str(e)}")
            job.status = "failed"
            job.error = str(e)
            job.end_time = datetime.now()
            
            # Move to completed jobs with error
            self.completed_jobs[job.job_id] = job
            del self.active_jobs[job.job_id]
    
    async def _setup_environment(self, job: TrainingJob):
        """Setup the training environment"""
        job.current_stage = "environment_setup"
        job.progress = 5
        
        # Set environment variables
        env = os.environ.copy()
        env.update({
            "NANOCHAT_BASE_DIR": "/app/cache/nanochat",
            "OMP_NUM_THREADS": "1",
            "WANDB_RUN": job.config.wandb_run,
            "PYTHONPATH": "/app:/app/nanochat"
        })
        
        # Check if Rust is available
        try:
            await self._execute_command(["cargo", "--version"], job, env=env)
        except Exception:
            logger.warning("Rust not available, training may fail")
        
        # Check if uv is available
        try:
            await self._execute_command(["uv", "--version"], job, env=env)
        except Exception:
            logger.warning("uv not available, using pip instead")
        
        job.progress = 10
    
    async def _run_cpu_demo(self, config: TrainingConfig, job: TrainingJob):
        """Run CPU demo training"""
        logger.info("Starting CPU demo training")
        
        commands = [
            # Reset report
            (["python", "-m", "nanochat.report", "reset"], "report_reset"),
            
            # Download minimal dataset
            (["python", "-m", "nanochat.dataset", "-n", "4"], "dataset_download"),
            
            # Train tokenizer
            (["python", "-m", "scripts.tok_train", "--max_chars=1000000000"], "tokenizer_training"),
            (["python", "-m", "scripts.tok_eval"], "tokenizer_evaluation"),
            
            # Train small model
            (["python", "-m", "scripts.base_train",
              "--depth=4",
              "--max_seq_len=1024",
              "--device_batch_size=1",
              "--total_batch_size=1024",
              "--eval_every=50",
              "--eval_tokens=4096",
              "--core_metric_every=50",
              "--core_metric_max_per_task=12",
              "--sample_every=50",
              "--num_iterations=50"], "base_training"),
            
            # Evaluate model
            (["python", "-m", "scripts.base_loss", "--device_batch_size=1", "--split_tokens=4096"], "model_evaluation"),
            (["python", "-m", "scripts.base_eval", "--max-per-task=16"], "core_evaluation"),
            
            # Mid training
            (["python", "-m", "scripts.mid_train",
              "--max_seq_len=1024",
              "--device_batch_size=1",
              "--eval_every=50",
              "--eval_tokens=4096",
              "--total_batch_size=1024",
              "--num_iterations=100"], "mid_training"),
            
            # SFT training
            (["python", "-m", "scripts.chat_sft",
              "--device_batch_size=1",
              "--target_examples_per_step=4",
              "--num_iterations=100",
              "--eval_steps=4",
              "--eval_metrics_max_problems=16"], "sft_training"),
            
            # Generate final report
            (["python", "-m", "nanochat.report", "generate"], "report_generation")
        ]
        
        total_commands = len(commands)
        for i, (cmd, stage_name) in enumerate(commands):
            job.current_stage = stage_name
            job.progress = 10 + (i / total_commands) * 80
            
            await self._execute_command(cmd, job)
            
            # Update metrics based on stage
            if stage_name == "base_training":
                job.metrics["base_training_completed"] = True
            elif stage_name == "mid_training":
                job.metrics["mid_training_completed"] = True
            elif stage_name == "sft_training":
                job.metrics["sft_training_completed"] = True
        
        job.progress = 90
    
    async def _run_single_gpu(self, config: TrainingConfig, job: TrainingJob):
        """Run single GPU training"""
        logger.info("Starting single GPU training")
        
        # Check GPU availability
        try:
            result = await self._execute_command(
                ["python", "-c", "import torch; print(torch.cuda.is_available())"],
                job
            )
            if "True" not in result["stdout"]:
                raise RuntimeError("GPU not available for single GPU training")
        except Exception as e:
            logger.error(f"GPU check failed: {e}")
            raise
        
        commands = [
            # Download dataset
            (["python", "-m", "nanochat.dataset", "-n", "16"], "dataset_download"),
            
            # Train tokenizer
            (["python", "-m", "scripts.tok_train", "--max_chars=4000000000"], "tokenizer_training"),
            (["python", "-m", "scripts.tok_eval"], "tokenizer_evaluation"),
            
            # Train model
            (["python", "-m", "scripts.base_train",
              f"--depth={config.model_depth}",
              f"--device_batch_size={config.device_batch_size}",
              f"--max_seq_len={config.max_seq_len}",
              f"--num_iterations={config.num_iterations}"], "base_training"),
            
            # Evaluate model
            (["python", "-m", "scripts.base_loss"], "model_evaluation"),
            (["python", "-m", "scripts.base_eval"], "core_evaluation"),
            
            # Mid training
            (["python", "-m", "scripts.mid_train",
              f"--device_batch_size={config.device_batch_size}"], "mid_training"),
            
            # SFT training
            (["python", "-m", "scripts.chat_sft"], "sft_training"),
            
            # Generate report
            (["python", "-m", "nanochat.report", "generate"], "report_generation")
        ]
        
        total_commands = len(commands)
        for i, (cmd, stage_name) in enumerate(commands):
            job.current_stage = stage_name
            job.progress = 10 + (i / total_commands) * 80
            
            await self._execute_command(cmd, job)
        
        job.progress = 90
    
    async def _run_full_training(self, config: TrainingConfig, job: TrainingJob):
        """Run full multi-GPU training"""
        logger.info("Starting full training")
        
        # This would implement the full training pipeline
        # For now, fall back to single GPU
        await self._run_single_gpu(config, job)
    
    async def _execute_command(self, command: List[str], job: TrainingJob, env: Optional[Dict] = None) -> Dict:
        """Execute a training command and log output"""
        logger.info(f"Executing command: {' '.join(command)}")
        
        start_time = time.time()
        
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd="/app",
                env=env or os.environ
            )
            
            stdout, stderr = await process.communicate()
            
            execution_time = time.time() - start_time
            
            result = {
                "command": " ".join(command),
                "stdout": stdout.decode(),
                "stderr": stderr.decode(),
                "return_code": process.returncode,
                "execution_time": execution_time,
                "timestamp": datetime.now().isoformat()
            }
            
            job.logs.append(result)
            
            if process.returncode != 0:
                logger.error(f"Command failed with return code {process.returncode}: {stderr.decode()}")
                raise RuntimeError(f"Command failed: {stderr.decode()}")
            
            logger.info(f"Command completed successfully in {execution_time:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Command execution failed: {e}")
            error_result = {
                "command": " ".join(command),
                "stdout": "",
                "stderr": str(e),
                "return_code": -1,
                "execution_time": time.time() - start_time,
                "timestamp": datetime.now().isoformat()
            }
            job.logs.append(error_result)
            raise
    
    def get_training_status(self, job_id: str) -> Optional[Dict]:
        """Get training status for a job"""
        if job_id in self.active_jobs:
            job = self.active_jobs[job_id]
        elif job_id in self.completed_jobs:
            job = self.completed_jobs[job_id]
        else:
            return None
        
        return {
            "job_id": job.job_id,
            "status": job.status,
            "progress": job.progress,
            "current_stage": job.current_stage,
            "start_time": job.start_time.isoformat(),
            "end_time": job.end_time.isoformat() if job.end_time else None,
            "error": job.error,
            "metrics": job.metrics,
            "config": job.config.dict()
        }
    
    def get_training_logs(self, job_id: str, limit: int = 100) -> List[Dict]:
        """Get training logs for a job"""
        if job_id in self.active_jobs:
            job = self.active_jobs[job_id]
        elif job_id in self.completed_jobs:
            job = self.completed_jobs[job_id]
        else:
            return []
        
        return job.logs[-limit:] if limit > 0 else job.logs
    
    def stop_training(self, job_id: str) -> bool:
        """Stop a training job"""
        if job_id in self.active_jobs:
            job = self.active_jobs[job_id]
            job.status = "stopped"
            job.end_time = datetime.now()
            
            # Move to completed jobs
            self.completed_jobs[job_id] = job
            del self.active_jobs[job_id]
            
            logger.info(f"Training job {job_id} stopped")
            return True
        
        return False
    
    def list_jobs(self) -> Dict[str, List[str]]:
        """List all training jobs"""
        return {
            "active": list(self.active_jobs.keys()),
            "completed": list(self.completed_jobs.keys())
        }
    
    def cleanup_old_jobs(self, max_age_hours: int = 24):
        """Clean up old completed jobs"""
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        
        jobs_to_remove = []
        for job_id, job in self.completed_jobs.items():
            if job.end_time and job.end_time.timestamp() < cutoff_time:
                jobs_to_remove.append(job_id)
        
        for job_id in jobs_to_remove:
            del self.completed_jobs[job_id]
            logger.info(f"Cleaned up old job {job_id}")
