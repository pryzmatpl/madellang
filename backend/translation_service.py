import whisper
import torch
from typing import Dict, List, Optional

class TranslationService:
    def __init__(self):
        """Initialize the translation service using Whisper"""
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading Whisper model for translation on {self.device}")
        self.model = whisper.load_model("medium", device=self.device)
        # Languages Whisper can handle
        self.supported_languages = list(whisper.tokenizer.LANGUAGES.keys())
        
    def transcribe_and_translate(self, audio_data, source_lang: Optional[str] = None, target_lang: str = "en") -> Dict:
        """
        Transcribe audio and translate it to the target language using Whisper
        
        Args:
            audio_data: Audio data as numpy array
            source_lang: Source language code (optional, will detect if not provided)
            target_lang: Target language code (default: "en")
            
        Returns:
            Dict with original text, detected language, and translated text
        """
        # Determine the task based on target language
        task = "translate" if target_lang == "en" else "transcribe"
        
        try:
            # First transcribe to get original text and detect language
            transcription_result = self.model.transcribe(
                audio_data, 
                language=source_lang,
                task="transcribe"
            )
            
            original_text = transcription_result["text"]
            detected_lang = transcription_result.get("language", "en")
            
            # If target is the same as source, no translation needed
            if detected_lang == target_lang:
                return {
                    "original_text": original_text,
                    "translated_text": original_text,
                    "detected_language": detected_lang
                }
            
            # For non-English target languages, we need to use a workaround
            if target_lang != "en":
                # First translate to English if source isn't English
                if detected_lang != "en":
                    english_result = self.model.transcribe(
                        audio_data,
                        language=detected_lang,
                        task="translate"
                    )
                    english_text = english_result["text"]
                else:
                    english_text = original_text
                    
                # Now use prompt-based approach to get the model to translate to target language
                target_result = self._prompt_translate(english_text, target_lang)
                translated_text = target_result
            else:
                # Direct translation to English
                translation_result = self.model.transcribe(
                    audio_data,
                    language=detected_lang,
                    task="translate"
                )
                translated_text = translation_result["text"]
            
            return {
                "original_text": original_text,
                "translated_text": translated_text,
                "detected_language": detected_lang
            }
            
        except Exception as e:
            print(f"Error in transcribe_and_translate: {e}")
            return {
                "original_text": "",
                "translated_text": "",
                "detected_language": source_lang or "en"
            }
    
    def _prompt_translate(self, text: str, target_lang: str) -> str:
        """
        Use Whisper's text capabilities to translate text to a target language
        by using clever prompting
        """
        # Get the full language name for clearer instructions
        language_name = whisper.tokenizer.LANGUAGES.get(target_lang, "Unknown")
        
        # Create a prompt that instructs translation
        prompt = f"Translate the following text to {language_name}: {text}"
        
        # Use Whisper to process this prompt
        # This is a creative use of Whisper - we're forcing it to recognize 
        # our prompt and then generate a completion in the target language
        fake_audio = torch.zeros((1, 16000), device=self.device)  # 1 second of silence
        options = whisper.DecodingOptions(
            prompt=prompt,
            language=target_lang,
            without_timestamps=True,
        )
        
        try:
            result = whisper.decode(self.model, fake_audio, options)
            # Try to extract just the translation by removing the prompt if it appears
            translation = result.text
            if prompt in translation:
                translation = translation.replace(prompt, "").strip()
            return translation
        except Exception as e:
            print(f"Error in prompt translation: {e}")
            return text  # Fallback to original text
            
    def translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Translate text from source language to target language
        This is a simpler method that doesn't require audio input
        """
        # If languages are the same, no translation needed
        if source_lang == target_lang:
            return text
            
        try:
            # For translation to English, we can use Whisper's capabilities directly
            if target_lang == "en":
                # Create a small audio prompt with the text in the source language
                # This is a workaround as Whisper is primarily designed for audio input
                # However, since we don't have a true TTS for the source language,
                # we'll use the prompt-based approach
                return self._prompt_translate(text, target_lang)
            else:
                # For non-English targets, translate to English first if needed
                if source_lang != "en":
                    english_text = self._prompt_translate(text, "en")
                else:
                    english_text = text
                    
                # Then translate from English to target language
                return self._prompt_translate(english_text, target_lang)
                
        except Exception as e:
            print(f"Error in text translation: {e}")
            return text  # Fallback to original text
            
    def get_available_languages(self) -> List[str]:
        """Get list of available languages for translation"""
        return self.supported_languages 