import json
import os
import argparse
import requests
import io
import torch
from PIL import Image
from diffusers import AutoPipelineForText2Image, StableDiffusionImg2ImgPipeline
from rembg import remove, new_session

# --- GLOBAL SETTINGS ---
MODEL_ID = "Lykon/dreamshaper-8"
CAMERA_PREFIX = "" # deprecated
CAMERA_SUFFIX = "" # deprecated
GLOBAL_STYLE = "" # deprecated
NEGATIVE_PROMPT = "(3d render:1.4), (oil painting:1.3), (gradient:1.4), (soft shading:1.4), (photorealism:1.4), (anti-aliasing:1.5), background scene, scenery, ground, shadows"

class AssetStudio:
    def __init__(self):
        print("Initializing Saints Asset Studio (Lifecycle Edition)...")
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32
        self.bg_session = new_session('u2net')
        self.t2i_pipe = None
        self.i2i_pipe = None

    def _load_t2i(self):
        if not self.t2i_pipe:
            print(f"Loading Text2Image Pipeline...")
            self.t2i_pipe = AutoPipelineForText2Image.from_pretrained(
                MODEL_ID, torch_dtype=self.dtype, use_safetensors=True, safety_checker=None
            ).to(self.device)
            if self.device == "cuda": self.t2i_pipe.enable_attention_slicing()

    def _load_i2i(self):
        if not self.i2i_pipe:
            print(f"Loading Img2Img Pipeline for Evolution Inheritance...")
            self.i2i_pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
                MODEL_ID, torch_dtype=self.dtype, use_safetensors=True, safety_checker=None
            ).to(self.device)
            if self.device == "cuda": self.i2i_pipe.enable_attention_slicing()

    def fetch_template(self, category):
        try:
            if category in ["creatures", "world-monsters"]:
                url = "https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/mods/tuxemon/gfx/sprites/battle/aardart-sheet.png"
            elif category == "npc":
                url = "https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/mods/tuxemon/gfx/sprites/battle/trainer_f-sheet.png"
            else:
                return None
                
            response = requests.get(url, stream=True)
            response.raise_for_status()
            # Convert to RGB with a pure white background
            img = Image.open(io.BytesIO(response.content)).convert("RGBA")
            bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
            return Image.alpha_composite(bg, img).convert("RGB")
        except Exception as e:
            print(f"Warning: Failed to fetch template for {category}: {e}")
            return None

    def process_ow_sprite(self, img):
        img_no_bg = remove(img, session=self.bg_session, alpha_matting=False)
        img_no_bg = img_no_bg.convert("RGBA")
        datas = img_no_bg.getdata()
        new_data = [(r, g, b, 255) if a > 128 else (0, 0, 0, 0) for r, g, b, a in datas]
        img_no_bg.putdata(new_data)
        
        bbox = img_no_bg.getbbox()
        if bbox: img_no_bg = img_no_bg.crop(bbox)
        
        # Scale height to exactly 96px, let width scale proportionally
        target_height = 96
        aspect_ratio = img_no_bg.width / img_no_bg.height
        target_width = int(target_height * aspect_ratio)
        
        sprite = img_no_bg.resize((target_width, target_height), Image.Resampling.NEAREST)
        return sprite

    def process_battle_sprite(self, img):
        img_no_bg = remove(img, session=self.bg_session, alpha_matting=False)
        img_no_bg = img_no_bg.convert("RGBA")
        datas = img_no_bg.getdata()
        new_data = [(r, g, b, 255) if a > 128 else (0, 0, 0, 0) for r, g, b, a in datas]
        img_no_bg.putdata(new_data)
        
        bbox = img_no_bg.getbbox()
        if bbox: img_no_bg = img_no_bg.crop(bbox)
        
        # Scale to fit within 1024x1024
        size = 1024
        sprite = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        img_no_bg.thumbnail((size, size), Image.Resampling.NEAREST)
        offset_x = (size - img_no_bg.width) // 2
        offset_y = (size - img_no_bg.height) // 2
        sprite.paste(img_no_bg, (offset_x, offset_y))
        return sprite

    def generate_lifecycle(self, genome_path, variant_suffix=None):
        with open(genome_path, 'r') as f:
            genome = json.load(f)
            
        species_name = genome.get('species', 'unknown_species').replace(" ", "_").lower()
        if variant_suffix:
            species_name = f"{species_name}_{variant_suffix}"
            
        paradigm = genome.get('paradigm', 'lifecycle')
        category = genome.get('category', 'creatures')
        
        ow_dir = os.path.join("public", "game-assets", category)
        if category == 'npc':
            battle_dir = os.path.join("public", "game-assets", "npc", "portrait")
        elif category == 'environment':
            battle_dir = os.path.join("public", "game-assets", "environment", "portrait")
        else:
            battle_dir = os.path.join("public", "game-assets", "monster", "battle")
            
        os.makedirs(ow_dir, exist_ok=True)
        os.makedirs(battle_dir, exist_ok=True)
        
        dna = f"Core identity: {genome.get('core_identity', '')}. Locked features: {genome.get('locked_features', '')}."
        
        stages_to_run = ["baby", "adult", "elder"] if paradigm == "lifecycle" else ["default"]
        
        advanced = genome.get('advanced_params', {})
        steps = advanced.get('inference_steps', 25 if self.device == "cuda" else 15)
        guidance = advanced.get('guidance_scale', 8.5)
        seed = advanced.get('seed', -1)
        if seed == -1: seed = torch.randint(0, 1000000, (1,)).item()
        custom_neg = advanced.get('negative_prompt', "")
        
        # Base negative prompt overrides
        base_neg = custom_neg if custom_neg else NEGATIVE_PROMPT
        
        prev_ow_image = None
        prev_battle_image = None
        
        for stage in stages_to_run:
            if stage not in genome.get('stages', {}):
                continue
                
            print(f"\n--- Generating Stage: {stage.upper()} ---")
            stage_growth = genome['stages'][stage].get('growth', '')
            
            if category == "environment":
                ow_prompt = f"(16-bit pixel art, GBA retro sprite:1.4), (single isolated texture of {species_name}, top-down view:1.3), {dna} Features: {stage_growth}, (pure solid white background, empty background:1.5), (flat pixel colors, crisp aliased edges, no gradients:1.2)"
                battle_prompt = ow_prompt
                env_neg = f"{base_neg}, (fences, structures, walls, buildings, complex scenes, multiple objects, grass, ground:1.5)"
            elif category == "ui":
                ow_prompt = f"(16-bit pixel art UI asset, retro RPG menu frame:1.4), (single isolated flat UI element, {species_name}:1.3), {dna} Features: {stage_growth}, (pure solid white background, empty background:1.5), (flat pixel colors, crisp aliased edges, no gradients:1.2)"
                battle_prompt = ow_prompt
                env_neg = f"{base_neg}, (characters, people, monsters, fences, structures, walls, buildings, complex scenes, multiple objects, grass, ground:1.5)"
            elif category == "npc":
                ow_prompt = f"(16-bit pixel art, GBA retro sprite:1.4), (single isolated character sprite facing forward, top-down perspective, standing still:1.3), A {species_name}. {dna} Features: {stage_growth}, (pure solid white background, empty background:1.5), (flat pixel colors, crisp aliased edges, no gradients:1.2)"
                battle_prompt = f"(16-bit pixel art, visual novel portrait:1.4), (large detailed character portrait, holding a pokeball, trainer battle pose:1.3), A {species_name}. {dna} Features: {stage_growth}, (pure solid white background, empty background:1.5), (flat pixel colors, crisp aliased edges, no gradients:1.2)"
                env_neg = base_neg
            else:
                if stage == "baby" or paradigm == "single":
                    subject = f"A {stage if stage != 'default' else ''} {species_name}. {dna} Growth stage features: {stage_growth}."
                else:
                    subject = f"An evolved {stage} {species_name}. Exactly the same species. Maintain identical colors and markings. Increase age and maturity. Growth stage features: {stage_growth}. {dna}"
                ow_prompt = f"(16-bit pixel art, GBA pokemon sprite:1.4), (single isolated character sprite facing forward, top-down perspective, standing still:1.3), {subject}, (pure solid white background, empty background:1.5), (flat pixel colors, crisp aliased edges, no gradients:1.2)"
                battle_prompt = f"(16-bit pixel art, pokemon sprite:1.4), (large detailed front-facing monster battle sprite, classic RPG monster design:1.3), {subject}, (pure solid white background, empty background:1.5), (flat pixel colors, crisp aliased edges, no gradients:1.2)"
                env_neg = base_neg

            print(f"Prompt: {ow_prompt}")
            
            generator = torch.Generator(device=self.device).manual_seed(seed)
            
            if stage == "baby" or stage == "default" or prev_ow_image is None:
                self._load_t2i()
                image = self.t2i_pipe(ow_prompt, negative_prompt=env_neg, num_inference_steps=steps, guidance_scale=guidance, generator=generator).images[0]
                if category == "environment" or category == "ui":
                    battle_image = image
                else:
                    template_img = self.fetch_template(category)
                    if template_img:
                        print("Using img2img layout template for battle sprite...")
                        self._load_i2i()
                        battle_image = self.i2i_pipe(battle_prompt, image=template_img, strength=0.85, negative_prompt=env_neg, num_inference_steps=steps, guidance_scale=guidance, generator=generator).images[0]
                    else:
                        battle_image = self.t2i_pipe(battle_prompt, negative_prompt=env_neg, num_inference_steps=steps, guidance_scale=guidance, generator=generator).images[0]
            else:
                self._load_i2i()
                image = self.i2i_pipe(ow_prompt, image=prev_ow_image, strength=0.7, negative_prompt=env_neg, num_inference_steps=steps, guidance_scale=guidance, generator=generator).images[0]
                if category == "environment" or category == "ui":
                    battle_image = image
                else:
                    battle_image = self.i2i_pipe(battle_prompt, image=prev_battle_image, strength=0.7, negative_prompt=env_neg, num_inference_steps=steps, guidance_scale=guidance, generator=generator).images[0]
            
            prev_ow_image = image
            prev_battle_image = battle_image

            
            if paradigm == "single":
                slug = species_name
            else:
                slug = f"{species_name}-{stage}"
            
            ow_sprite = self.process_ow_sprite(image)
            ow_sprite.save(os.path.join(ow_dir, f"{slug}-ow.png"))
            
            battle_sprite = self.process_battle_sprite(battle_image)
            battle_sprite.save(os.path.join(battle_dir, f"{slug}-sheet.png"))
            
        print("\nSaving genome metadata...")
        genome['generation_meta'] = {"seed": seed, "model": MODEL_ID, "style_token": GLOBAL_STYLE}
        with open(os.path.join(ow_dir, f"{species_name}_genome.json"), "w") as f:
            json.dump(genome, f, indent=4)
            
        print(f"\nLifecycle for '{species_name}' successfully built into {ow_dir} and {battle_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("genome", help="Path to the species_genome.json file")
    parser.add_argument("--variant", help="Optional suffix to append to the output folder", default=None)
    args = parser.parse_args()
    
    studio = AssetStudio()
    studio.generate_lifecycle(args.genome, args.variant)
