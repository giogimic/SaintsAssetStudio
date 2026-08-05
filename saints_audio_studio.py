import torch
import scipy.io.wavfile
from transformers import AutoProcessor, BarkModel, MusicgenForConditionalGeneration
import os
import uuid

class SaintsAudioStudio:
    def __init__(self):
        print("Initializing Saints Audio Studio...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.bark_model = None
        self.bark_processor = None
        self.musicgen_model = None
        self.musicgen_processor = None
        
    def _load_bark(self):
        if self.bark_model is None:
            print("Loading Bark model...")
            self.bark_processor = AutoProcessor.from_pretrained("suno/bark-small", use_safetensors=True)
            self.bark_model = BarkModel.from_pretrained("suno/bark-small", use_safetensors=True).to(self.device)
        
        if self.musicgen_model is not None:
            self.musicgen_model.to("cpu")
        self.bark_model.to(self.device)
                
    def _load_musicgen(self):
        if self.musicgen_model is None:
            print("Loading MusicGen model...")
            self.musicgen_processor = AutoProcessor.from_pretrained("facebook/musicgen-small", use_safetensors=True)
            self.musicgen_model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small", use_safetensors=True).to(self.device)
        
        if self.bark_model is not None:
            self.bark_model.to("cpu")
        self.musicgen_model.to(self.device)

    def generate_voice(self, text, output_dir):
        self._load_bark()
        inputs = self.bark_processor(text, return_tensors="pt").to(self.device)
        
        # We wrap in torch.no_grad() for memory efficiency
        with torch.no_grad():
            audio_array = self.bark_model.generate(**inputs, do_sample=True)
            
        audio_array = audio_array.cpu().numpy().squeeze()
        sample_rate = self.bark_model.generation_config.sample_rate
        
        os.makedirs(output_dir, exist_ok=True)
        filename = f"voice_{uuid.uuid4().hex[:8]}.wav"
        filepath = os.path.join(output_dir, filename)
        scipy.io.wavfile.write(filepath, rate=sample_rate, data=audio_array)
        return filename

    def generate_bgm(self, prompt, duration_seconds, output_dir):
        self._load_musicgen()
        inputs = self.musicgen_processor(
            text=[prompt],
            padding=True,
            return_tensors="pt",
        ).to(self.device)
        
        tokens = int(duration_seconds * 50) # roughly 50 tokens = 1 second
        with torch.no_grad():
            audio_values = self.musicgen_model.generate(**inputs, max_new_tokens=tokens)
            
        audio_array = audio_values[0, 0].cpu().numpy()
        sample_rate = self.musicgen_model.config.audio_encoder.sampling_rate
        
        os.makedirs(output_dir, exist_ok=True)
        filename = f"bgm_{uuid.uuid4().hex[:8]}.wav"
        filepath = os.path.join(output_dir, filename)
        scipy.io.wavfile.write(filepath, rate=sample_rate, data=audio_array)
        return filename

if __name__ == '__main__':
    import sys, json
    if len(sys.argv) < 2:
        print("Usage: python saints_audio_studio.py <job.json>")
        sys.exit(1)
        
    with open(sys.argv[1], 'r') as f:
        job = json.load(f)
        
    studio = SaintsAudioStudio()
    
    if job['type'] == 'voice':
        studio.generate_voice(job['prompt'], job['output_dir'])
    elif job['type'] == 'bgm':
        studio.generate_bgm(job['prompt'], job.get('duration_seconds', 10), job['output_dir'])

