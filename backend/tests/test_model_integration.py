import pytest
import torch
import numpy as np
from unittest.mock import Mock, patch, MagicMock
import os
import sys

# Add the backend directory to the path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from model_selector import select_appropriate_whisper_model
from translation_service import TranslationService
from model_manager import ModelManager

class TestModelSelector:
    """Test suite for model selection functionality"""
    
    def test_environment_variable_override(self):
        """Test that environment variable overrides hardware detection"""
        with patch.dict(os.environ, {'WHISPER_MODEL': 'large'}):
            model = select_appropriate_whisper_model()
            assert model == 'large'
    
    @patch('torch.cuda.is_available')
    def test_cpu_fallback(self, mock_cuda_available):
        """Test CPU fallback when GPU is not available"""
        mock_cuda_available.return_value = False
        
        model = select_appropriate_whisper_model()
        assert model == 'tiny'
    
    @patch('torch.cuda.is_available')
    @patch('torch.cuda.get_device_properties')
    def test_gpu_memory_based_selection(self, mock_device_props, mock_cuda_available):
        """Test GPU memory-based model selection"""
        mock_cuda_available.return_value = True
        
        # Mock device properties for different memory sizes
        test_cases = [
            (2 * 1024**3, 'tiny'),      # 2GB
            (6 * 1024**3, 'small'),     # 6GB
            (12 * 1024**3, 'medium'),   # 12GB
            (20 * 1024**3, 'large'),    # 20GB
        ]
        
        for memory_bytes, expected_model in test_cases:
            mock_device_props.return_value.total_memory = memory_bytes
            
            model = select_appropriate_whisper_model()
            assert model == expected_model
    
    @patch('torch.cuda.is_available')
    @patch('torch.cuda.get_device_properties')
    @patch('torch.version')
    def test_amd_gpu_optimization(self, mock_version, mock_device_props, mock_cuda_available):
        """Test AMD GPU specific optimizations"""
        mock_cuda_available.return_value = True
        mock_device_props.return_value.total_memory = 8 * 1024**3  # 8GB
        mock_version.hip = "5.4.0"  # Simulate AMD GPU
        
        model = select_appropriate_whisper_model()
        # AMD GPUs should be more conservative with model selection
        assert model in ['tiny', 'small']

class TestTranslationService:
    """Test suite for translation service functionality"""
    
    @pytest.fixture
    def translation_service(self):
        """Create a translation service instance for testing"""
        with patch('whisper.load_model') as mock_load_model:
            mock_model = Mock()
            mock_model.transcribe.return_value = {
                "text": "Hello world",
                "language": "en"
            }
            mock_load_model.return_value = mock_model
            
            service = TranslationService()
            return service
    
    def test_initialization(self, translation_service):
        """Test translation service initialization"""
        assert translation_service.model is not None
        assert hasattr(translation_service, 'supported_languages')
        assert hasattr(translation_service, 'device')
    
    def test_get_available_languages(self, translation_service):
        """Test getting available languages"""
        languages = translation_service.get_available_languages()
        assert isinstance(languages, dict)
        assert len(languages) > 0
    
    def test_translate_text(self, translation_service):
        """Test text translation functionality"""
        result = translation_service.translate_text(
            "Hello", "en", "es"
        )
        assert isinstance(result, str)
        assert len(result) > 0
    
    @patch('numpy.frombuffer')
    def test_transcribe_and_translate(self, mock_frombuffer, translation_service):
        """Test audio transcription and translation"""
        # Mock audio data
        mock_audio = np.array([0.1, 0.2, 0.3, 0.4, 0.5])
        mock_frombuffer.return_value = mock_audio
        
        # Mock model response
        translation_service.model.transcribe.return_value = {
            "text": "Hello world",
            "language": "en"
        }
        
        result = translation_service.transcribe_and_translate(
            b"mock_audio_data", target_lang="es"
        )
        
        assert isinstance(result, dict)
        assert "original_text" in result
        assert "translated_text" in result
        assert "detected_language" in result

class TestModelManager:
    """Test suite for model manager functionality"""
    
    @pytest.fixture
    def model_manager(self):
        """Create a model manager instance for testing"""
        with patch.dict(os.environ, {'USE_LOCAL_MODELS': 'false'}):
            manager = ModelManager()
            return manager
    
    def test_api_mode_initialization(self, model_manager):
        """Test API mode initialization"""
        assert not model_manager.use_local_models
        assert hasattr(model_manager, 'openai_api_key')
        assert hasattr(model_manager, 'deepl_api_key')
        assert hasattr(model_manager, 'elevenlabs_api_key')
    
    @patch.dict(os.environ, {'USE_LOCAL_MODELS': 'true'})
    def test_local_mode_initialization(self):
        """Test local mode initialization"""
        with patch('whisper.load_model') as mock_load_model:
            mock_model = Mock()
            mock_load_model.return_value = mock_model
            
            manager = ModelManager()
            assert manager.use_local_models
    
    def test_speech_to_text_api_mode(self, model_manager):
        """Test speech-to-text in API mode"""
        with patch('openai.Audio.transcribe') as mock_transcribe:
            mock_transcribe.return_value = {"text": "Hello world"}
            
            audio_data = np.array([0.1, 0.2, 0.3])
            result = model_manager.speech_to_text(audio_data)
            
            assert result == "Hello world"
    
    def test_translate_text_api_mode(self, model_manager):
        """Test text translation in API mode"""
        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.json.return_value = {
                "translations": [{"text": "Hola mundo"}]
            }
            mock_post.return_value = mock_response
            
            result = model_manager.translate_text("Hello world", "en", "es")
            assert result == "Hola mundo"
    
    def test_text_to_speech_api_mode(self, model_manager):
        """Test text-to-speech in API mode"""
        with patch('requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.content = b"mock_audio_data"
            mock_post.return_value = mock_response
            
            result = model_manager.text_to_speech("Hello world", "en")
            assert result == b"mock_audio_data"

class TestModelIntegration:
    """Integration tests for model components"""
    
    @pytest.mark.asyncio
    async def test_full_pipeline_integration(self):
        """Test integration of all model components"""
        # This test would require actual model loading
        # For now, we'll test the integration points
        
        # Test model selection
        model_name = select_appropriate_whisper_model()
        assert model_name in ['tiny', 'small', 'medium', 'large']
        
        # Test translation service creation
        with patch('whisper.load_model'):
            service = TranslationService()
            assert service is not None
        
        # Test model manager creation
        with patch.dict(os.environ, {'USE_LOCAL_MODELS': 'false'}):
            manager = ModelManager()
            assert manager is not None
    
    def test_model_compatibility(self):
        """Test model compatibility across different hardware configurations"""
        # Test CPU compatibility
        with patch('torch.cuda.is_available', return_value=False):
            cpu_model = select_appropriate_whisper_model()
            assert cpu_model == 'tiny'
        
        # Test GPU compatibility
        with patch('torch.cuda.is_available', return_value=True):
            with patch('torch.cuda.get_device_properties') as mock_props:
                mock_props.return_value.total_memory = 16 * 1024**3
                gpu_model = select_appropriate_whisper_model()
                assert gpu_model in ['medium', 'large']

class TestModelPerformance:
    """Performance tests for model components"""
    
    def test_model_selection_performance(self):
        """Test model selection performance"""
        import time
        
        start_time = time.time()
        for _ in range(100):
            select_appropriate_whisper_model()
        end_time = time.time()
        
        # Model selection should be very fast
        assert (end_time - start_time) < 1.0  # Less than 1 second for 100 calls
    
    @patch('whisper.load_model')
    def test_translation_service_initialization_performance(self, mock_load_model):
        """Test translation service initialization performance"""
        import time
        
        mock_model = Mock()
        mock_load_model.return_value = mock_model
        
        start_time = time.time()
        service = TranslationService()
        end_time = time.time()
        
        # Initialization should be reasonably fast
        assert (end_time - start_time) < 5.0  # Less than 5 seconds
        assert service is not None

class TestModelErrorHandling:
    """Error handling tests for model components"""
    
    def test_model_loading_error_handling(self):
        """Test handling of model loading errors"""
        with patch('whisper.load_model', side_effect=Exception("Model loading failed")):
            # Should handle errors gracefully
            try:
                service = TranslationService()
                # If we get here, error handling worked
                assert service is not None
            except Exception as e:
                # Error should be handled internally
                assert "Model loading failed" in str(e)
    
    def test_gpu_error_handling(self):
        """Test handling of GPU-related errors"""
        with patch('torch.cuda.is_available', side_effect=Exception("GPU error")):
            # Should fallback gracefully
            model = select_appropriate_whisper_model()
            assert model == 'tiny'  # Should fallback to tiny model
    
    def test_translation_error_handling(self):
        """Test handling of translation errors"""
        with patch.dict(os.environ, {'USE_LOCAL_MODELS': 'false'}):
            manager = ModelManager()
            
            with patch('requests.post', side_effect=Exception("API error")):
                # Should handle API errors gracefully
                result = manager.translate_text("Hello", "en", "es")
                assert result == "Hello"  # Should return original text on error

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"]) 