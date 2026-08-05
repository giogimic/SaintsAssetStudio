import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import json
import uuid

class SaintsQuestStudio:
    def __init__(self):
        print("Initializing Saints Quest Studio...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_id = "microsoft/Phi-4-mini"
        self.tokenizer = None
        self.model = None

    def _load_model(self):
        if self.model is None:
            print("Loading Phi-3 for Quests...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_id)
            try:
                from transformers import BitsAndBytesConfig
                quantization_config = BitsAndBytesConfig(load_in_8bit=True)
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_id, 
                    device_map="auto", 
                    torch_dtype=torch.float16, 
                    quantization_config=quantization_config,
                    trust_remote_code=True
                )
            except Exception as e:
                print(f"8-bit load failed, falling back to float16: {e}")
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_id, 
                    device_map="auto", 
                    torch_dtype=torch.float16,
                    trust_remote_code=True
                )

    def generate_quest(self, master_lore, theme, category, difficulty, max_tokens=500, temperature=0.7, top_p=0.9):
        self._load_model()
        
        system_prompt = f"""You are a professional RPG Quest Designer. 
You MUST adhere strictly to the following Master Lore: 
{master_lore}

Generate a new {category} matching this theme: {theme} and difficulty: {difficulty}.
Return ONLY a valid JSON object with the following schema:
{{
    "title": "Quest Title",
    "description": "2-3 sentence overview",
    "objectives": ["obj1", "obj2"],
    "dialogue": "A short introductory dialogue from the NPC giving the quest.",
    "rewards": ["reward1", "reward2"]
}}
Do NOT output any markdown, only raw JSON."""

        messages = [
            {"role": "user", "content": system_prompt + "\n\nGenerate the quest JSON now."}
        ]
        
        prompt = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
            
        result_text = self.tokenizer.decode(outputs[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)
        
        try:
            cleaned = result_text.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)
        except Exception as e:
            print("Failed to parse JSON:", result_text)
            data = {"error": "Failed to generate valid JSON", "raw": result_text}
            
        return data

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python saints_quest_studio.py <job.json>")
        sys.exit(1)
        
    with open(sys.argv[1], 'r') as f:
        job = json.load(f)
        
    studio = SaintsQuestStudio()
    result = studio.generate_quest(
        job['master_lore'], 
        job['theme'],
        job.get('category', 'Side Quest'),
        job['difficulty'],
        max_tokens=job.get('max_tokens', 500),
        temperature=job.get('temperature', 0.7),
        top_p=job.get('top_p', 0.9)
    )
    
    with open(job['output_file'], 'w') as f:
        json.dump(result, f, indent=4)
