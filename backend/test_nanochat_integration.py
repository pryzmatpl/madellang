#!/usr/bin/env python3
"""
Test script for nanochat integration in madellang backend
Tests the training service with local nanochat installation
"""

import sys
import os
import asyncio
import logging

# Add backend to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Add nanochat to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'deps', 'nanochat'))

from nanochat_training_service import NanochatTrainingService, TrainingConfig

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_nanochat_integration():
    """Test nanochat integration"""
    print("🧪 Testing nanochat integration...")
    print("=" * 50)
    
    # Test 1: Import nanochat
    try:
        import nanochat
        print("✅ nanochat imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import nanochat: {e}")
        return False
    
    # Test 2: Import rustbpe
    try:
        import rustbpe
        print("✅ rustbpe (Rust tokenizer) imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import rustbpe: {e}")
        return False
    
    # Test 3: Test PyTorch
    try:
        import torch
        print(f"✅ PyTorch {torch.__version__} available")
        print(f"   CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   Device count: {torch.cuda.device_count()}")
    except ImportError as e:
        print(f"❌ PyTorch not available: {e}")
        return False
    
    # Test 4: Test training service
    try:
        service = NanochatTrainingService()
        print("✅ NanochatTrainingService created successfully")
    except Exception as e:
        print(f"❌ Failed to create training service: {e}")
        return False
    
    # Test 5: Test configuration
    try:
        config = TrainingConfig(
            training_stage="cpu_demo",
            model_depth=4,
            device_batch_size=1,
            num_iterations=5
        )
        print("✅ TrainingConfig created successfully")
        print(f"   Stage: {config.training_stage}")
        print(f"   Depth: {config.model_depth}")
        print(f"   Batch size: {config.device_batch_size}")
        print(f"   Iterations: {config.num_iterations}")
    except Exception as e:
        print(f"❌ Failed to create training config: {e}")
        return False
    
    # Test 6: Test environment setup
    try:
        # Set environment variables
        os.environ.update({
            "NANOCHAT_BASE_DIR": "/app/cache/nanochat",
            "OMP_NUM_THREADS": "1",
            "WANDB_RUN": "test",
            "PYTHONPATH": "/app:/app/deps/nanochat",
            "HSA_OVERRIDE_GFX_VERSION": "10.3.0",
            "AMD_SERIALIZE_KERNEL": "3",
            "PYTORCH_HIP_ALLOC_CONF": "max_split_size_mb:128",
            "HIP_VISIBLE_DEVICES": "0"
        })
        print("✅ Environment variables set")
    except Exception as e:
        print(f"❌ Failed to set environment: {e}")
        return False
    
    print("=" * 50)
    print("🎉 All tests passed! Nanochat integration is ready.")
    return True

async def test_quick_training():
    """Test a quick training run"""
    print("\n🚀 Testing quick training run...")
    print("=" * 50)
    
    try:
        service = NanochatTrainingService()
        
        # Create a minimal config for testing
        config = TrainingConfig(
            training_stage="cpu_demo",
            model_depth=2,  # Very small model
            device_batch_size=1,
            num_iterations=2,  # Just 2 iterations
            max_seq_len=512,
            eval_every=1,
            eval_tokens=1024
        )
        
        print(f"Starting training with config: {config.training_stage}")
        print(f"Model depth: {config.model_depth}")
        print(f"Iterations: {config.num_iterations}")
        
        # Start training (this will run in background)
        job_id = await service.start_training(config)
        print(f"✅ Training started with job ID: {job_id}")
        
        # Wait a bit and check status
        await asyncio.sleep(2)
        status = service.get_training_status(job_id)
        print(f"✅ Training status: {status.status}")
        print(f"   Current stage: {status.current_stage}")
        print(f"   Progress: {status.progress}%")
        
        # Stop the training (since it's just a test)
        success = service.stop_training(job_id)
        if success:
            print("✅ Training stopped successfully")
        else:
            print("⚠️  Training stop failed (may have already completed)")
        
        return True
        
    except Exception as e:
        print(f"❌ Training test failed: {e}")
        logger.exception("Training test error")
        return False

async def main():
    """Main test function"""
    print("🧪 Nanochat Integration Test Suite")
    print("=" * 60)
    
    # Test basic integration
    integration_ok = await test_nanochat_integration()
    
    if not integration_ok:
        print("\n❌ Basic integration tests failed. Stopping here.")
        return 1
    
    # Test quick training (optional)
    print("\n" + "=" * 60)
    response = input("Run quick training test? (y/N): ").strip().lower()
    
    if response in ['y', 'yes']:
        training_ok = await test_quick_training()
        if not training_ok:
            print("\n❌ Training test failed.")
            return 1
    else:
        print("⏭️  Skipping training test.")
    
    print("\n" + "=" * 60)
    print("🎉 All tests completed successfully!")
    print("\n📋 Next steps:")
    print("1. Start the backend: uvicorn main:app --host 0.0.0.0 --port 8000")
    print("2. Open the training UI: http://localhost:3000/training")
    print("3. Start a training job from the web interface")
    
    return 0

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        logger.exception("Test error")
        sys.exit(1)
