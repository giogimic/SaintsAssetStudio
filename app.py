import os
import sys
import json
import subprocess
import threading
import queue
import glob
from flask import Flask, render_template, request, jsonify, send_from_directory

app = Flask(__name__)

# --- QUEUES & WORKER LOGIC ---
job_queue = queue.Queue()
audio_queue = queue.Queue()
quest_queue = queue.Queue()

status_state = {
    "current_job": None,
    "pending_count": 0,
    "completed_jobs": []
}

def get_python_exe():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, ".venv_cuda", "Scripts", "python.exe"), script_dir

backend_logs = ["[System] Backend Initialized."]

def log_to_backend(msg):
    print(msg)
    backend_logs.append(msg)
    if len(backend_logs) > 1000:
        backend_logs.pop(0)

def run_and_log(cmd, cwd, prefix):
    import subprocess
    process = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace')
    for line in iter(process.stdout.readline, ''):
        line = line.strip()
        if line:
            # specifically for tqdm bars, they might come with carriage returns, but strip handles some.
            # to avoid spamming the log with 100 progress updates, we'll only log lines that don't look like pure tqdm noise
            # or just log them all (might be spammy, but useful for user)
            log_to_backend(f"[{prefix}] {line}")
    process.wait()
    return process.returncode

def image_worker():
    python_exe, script_dir = get_python_exe()
    script_path = os.path.join(script_dir, "saints_asset_studio.py")

    while True:
        job = job_queue.get()
        species = job["species"]
        status_state["current_job"] = species
        status_state["pending_count"] = job_queue.qsize()
        
        try:
            temp_json = os.path.join(script_dir, f"temp_genome_{species}.json")
            with open(temp_json, 'w') as f:
                json.dump(job["genome_data"], f)

            log_to_backend(f"[Image Worker] Generating {species}...")
            returncode = run_and_log([python_exe, script_path, temp_json], cwd=script_dir, prefix="Image Worker")
            if returncode == 0:
                log_to_backend(f"[Image Worker] Success: {species}")
                status_state["completed_jobs"].insert(0, {"species": species, "status": "Success", "type": "image"})
            else:
                log_to_backend(f"[Image Worker] Failed: {species}")
                status_state["completed_jobs"].insert(0, {"species": species, "status": "Failed", "error": "See terminal output for details", "type": "image"})
            if os.path.exists(temp_json): os.remove(temp_json)
        except Exception as e:
            status_state["completed_jobs"].insert(0, {"species": species, "status": "Failed", "error": str(e), "type": "image"})
            
        status_state["current_job"] = None
        status_state["completed_jobs"] = status_state["completed_jobs"][:20]
        job_queue.task_done()

def audio_worker():
    python_exe, script_dir = get_python_exe()
    script_path = os.path.join(script_dir, "saints_audio_studio.py")
    
    while True:
        job = audio_queue.get()
        job_name = f"Audio: {job['type']}"
        status_state["current_job"] = job_name
        
        try:
            temp_json = os.path.join(script_dir, f"temp_audio_{uuid.uuid4().hex[:8]}.json")
            with open(temp_json, 'w') as f:
                json.dump(job, f)
                
            log_to_backend(f"[Audio Worker] Generating audio ({job['type']})...")
            returncode = run_and_log([python_exe, script_path, temp_json], cwd=script_dir, prefix="Audio Worker")
            if returncode == 0:
                log_to_backend(f"[Audio Worker] Success")
                status_state["completed_jobs"].insert(0, {"species": "Audio Job", "status": "Success", "type": "audio"})
            else:
                log_to_backend(f"[Audio Worker] Failed")
                status_state["completed_jobs"].insert(0, {"species": job_name, "status": "Failed", "error": "See terminal output for details", "type": "audio"})
            if os.path.exists(temp_json): os.remove(temp_json)
        except Exception as e:
            pass
        status_state["current_job"] = None
        audio_queue.task_done()

def quest_worker():
    python_exe, script_dir = get_python_exe()
    script_path = os.path.join(script_dir, "saints_quest_studio.py")
    
    while True:
        job = quest_queue.get()
        job_name = f"Quest: {job['theme']}"
        status_state["current_job"] = job_name
        
        try:
            temp_json = os.path.join(script_dir, f"temp_quest_{uuid.uuid4().hex[:8]}.json")
            with open(temp_json, 'w') as f:
                json.dump(job, f)
                
            log_to_backend(f"[Quest Worker] Generating quest...")
            returncode = run_and_log([python_exe, script_path, temp_json], cwd=script_dir, prefix="Quest Worker")
            if returncode == 0:
                log_to_backend(f"[Quest Worker] Success")
                status_state["completed_jobs"].insert(0, {"species": "Quest Job", "status": "Success", "type": "quest"})
            else:
                log_to_backend(f"[Quest Worker] Failed")
                status_state["completed_jobs"].insert(0, {"species": job_name, "status": "Failed", "error": "See terminal output for details", "type": "quest"})
            if os.path.exists(temp_json): os.remove(temp_json)
        except Exception as e:
            pass
        status_state["current_job"] = None
        quest_queue.task_done()

# Start background threads
import uuid
threading.Thread(target=image_worker, daemon=True).start()
threading.Thread(target=audio_worker, daemon=True).start()
threading.Thread(target=quest_worker, daemon=True).start()


# --- ELEMENT DICTIONARY ---
ELEMENT_DICTIONARY = {
    "Solar": "radiant sunlight, glowing plasma, fiery solar flares, bright golden energy",
    "Hydro": "flowing water, liquid body, splashing droplets, ocean waves, aquatic features",
    "Bio": "overgrown vines, toxic sludge, mutated organic matter, poisonous spores, natural plantlife",
    "Volt": "crackling electricity, sparking static, lightning bolts, bright neon yellow energy",
    "Geo": "cracked jagged rocks, heavy boulders, floating stones, dust and earth, crystalline minerals",
    "Cryo": "freezing frost, sharp ice crystals, snowy mist, frigid icy aura",
    "Aero": "swirling wind, transparent gusts of air, floating clouds, cyclone aura, breeze",
    "Cyber": "glowing neon circuits, metallic robotic parts, holographic glitching projections, sci-fi mechanical armor",
    "None": "normal typical form, standard physical traits, classic RPG monster design"
}

TEMPERAMENT_DICTIONARY = {
    "Aggressive": "fierce, hostile, sharp edges, predatory stance, baring teeth or weapons",
    "Playful": "cute, friendly, round shapes, bouncy posture, cheerful expression",
    "Sleepy": "lazy, drooping features, relaxed posture, closed eyes, resting",
    "Majestic": "noble, proud, elegant posture, divine aura, beautiful flowing features",
    "Derpy": "goofy, asymmetrical eyes, silly expression, confused posture, goofy smile",
    "None": ""
}

RARITY_DICTIONARY = {
    "Common": "simple design, basic features, matte colors, standard look",
    "Rare": "complex design, glowing accents, ornamental details, vibrant colors",
    "Epic": "highly detailed, dramatic aura, floating particles, ornate armor or patterns",
    "Legendary": "god-like appearance, massive glowing energy, over-the-top intricate details, ethereal lighting",
    "None": ""
}

CLASS_DICTIONARY = {
    "Warrior": "heavy armor, strong posture, martial prowess, carrying weapons",
    "Mage": "flowing robes, holding staff or orb, mystical aura, casting pose",
    "Rogue": "dark leather armor, hidden face, dual daggers, crouched stealthy posture",
    "Villager": "simple peasant clothes, carrying tools, humble posture, ordinary",
    "None": ""
}

BIOME_DICTIONARY = {
    "Forest": "overgrown with moss and vines, sitting in lush green grass, surrounded by leaves",
    "Volcano": "resting on cracked lava rock, glowing embers, charred scorched ground",
    "Cybercity": "resting on metal grates, neon underglow, cyberpunk city debris",
    "Graveyard": "resting on dead soil, surrounded by bone fragments, eerie mist rolling over it",
    "None": ""
}

MATERIAL_DICTIONARY = {
    "Wood": "wooden textures, bark, lumber, branches",
    "Stone": "stone textures, rock, cobblestone, granite",
    "Cybernetic": "metal, glowing neon circuits, cyberpunk, futuristic tech",
    "Crystal": "glowing crystals, jagged minerals, translucent gems, magical resonance",
    "None": ""
}

MONSTER_CLASS_DICTIONARY = {
    "Beast": "feral beast, animalistic, fur, claws, natural predator",
    "Undead": "undead, skeletal, rotting flesh, ghostly aura, necro energy",
    "Construct": "golem, artificial construct, mechanical parts, animated statue",
    "Aberration": "eldritch aberration, tentacles, multiple eyes, alien, twisted biology",
    "Dragonkin": "dragonkin, scales, reptilian, horns, draconic features",
    "None": ""
}

HABITAT_DICTIONARY = {
    "Deep Caverns": "subterranean, dark, bioluminescent fungus, rocky adaptations",
    "Cursed Forest": "twisted roots, dead leaves, shadow magic, gloomy, eerie",
    "Volcanic Ashlands": "ash-covered, ember glow, heat distortion, blackened scales",
    "Frozen Peaks": "ice crystals, thick white fur, frost aura, snowy",
    "None": ""
}

# --- ROUTES ---

@app.route('/game-assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory('public/game-assets', filename)
@app.route('/api/system_status', methods=['GET'])
def system_status():
    status = {
        "dependencies": {},
        "models": {
            "suno/bark-small": False,
            "facebook/musicgen-small": False,
            "microsoft/Phi-3-mini-4k-instruct": False,
            "Lykon/dreamshaper-8": False
        }
    }
    
    # Check dependencies
    try:
        import torch
        status["dependencies"]["torch"] = f"Installed (v{torch.__version__})"
    except:
        status["dependencies"]["torch"] = "Missing"
        
    try:
        import transformers
        status["dependencies"]["transformers"] = f"Installed (v{transformers.__version__})"
    except:
        status["dependencies"]["transformers"] = "Missing"
        
    try:
        import bitsandbytes
        status["dependencies"]["bitsandbytes"] = "Installed"
    except:
        status["dependencies"]["bitsandbytes"] = "Missing"
        
    # Check models
    try:
        from huggingface_hub import scan_cache_dir
        cache = scan_cache_dir()
        installed_repos = [repo.repo_id for repo in cache.repos]
        for model in status["models"]:
            if model in installed_repos:
                status["models"][model] = True
    except Exception as e:
        print(f"Failed to scan cache: {e}")
        
    return jsonify(status)

@app.route('/api/download_model', methods=['POST'])
def download_model_route():
    data = request.json
    model_id = data.get('model_id')
    if not model_id:
        return jsonify({"error": "No model_id provided"}), 400
        
    job_name = f"Download_{model_id.replace('/', '_')}"
    status_state["current_job"] = job_name
    status_state["pending_count"] += 1
    
    def worker():
        try:
            log_to_backend(f"[Download Worker] Downloading {model_id}...")
            returncode = run_and_log([python_exe, os.path.join(script_dir, 'download_model.py'), '--model', model_id], cwd=script_dir, prefix="Download Worker")
            if returncode == 0:
                log_to_backend(f"[Download Worker] Success: {model_id}")
                status_state["completed_jobs"].insert(0, {"species": job_name, "status": "Success", "type": "download"})
            else:
                log_to_backend(f"[Download Worker] Failed: {model_id}")
                status_state["completed_jobs"].insert(0, {"species": job_name, "status": "Failed", "error": "See terminal output for details", "type": "download"})
        except Exception as e:
            status_state["completed_jobs"].insert(0, {"species": job_name, "status": "Failed", "error": str(e), "type": "download"})
        finally:
            status_state["current_job"] = None
            status_state["pending_count"] = max(0, status_state["pending_count"] - 1)
            
    threading.Thread(target=worker, daemon=True).start()
    return jsonify({"status": "queued", "model_id": model_id})

@app.route('/api/logs', methods=['GET', 'POST'])
def handle_logs():
    if request.method == 'POST':
        data = request.json
        if 'msg' in data:
            log_to_backend(f"[Frontend] {data['msg']}")
        return jsonify({"status": "ok"})
    return jsonify({"logs": backend_logs})



@app.route('/queue_job', methods=['POST'])
def queue_job():
    data = request.json
    super_category = data.get('super_category', 'creatures')
    base_creature = data.get('base_creature', 'slime').strip().lower().replace(" ", "_")
    
    # Form validation check for base creature
    if not base_creature:
        return jsonify({"error": "Base entity cannot be empty."}), 400

    # Fields
    element = data.get('element_type', 'None')
    temperament = data.get('temperament', 'None')
    rarity = data.get('rarity', 'None')
    char_class = data.get('char_class', 'None')
    biome = data.get('biome', 'None')
    material = data.get('material', 'None')
    monster_class = data.get("monster_class", "None")
    habitat = data.get("habitat", "None")
    
    # Advanced Params
    inference_steps = int(data.get("inference_steps", 30))
    guidance_scale = float(data.get("guidance_scale", 8.5))
    seed = data.get("seed", -1)
    negative_prompt = data.get("negative_prompt", "")
    
    # Validation / Fallbacks
    if element not in ELEMENT_DICTIONARY: element = "None"
    if temperament not in TEMPERAMENT_DICTIONARY: temperament = "None"
    if rarity not in RARITY_DICTIONARY: rarity = "None"
    if char_class not in CLASS_DICTIONARY: char_class = "None"
    if biome not in BIOME_DICTIONARY: biome = "None"
    if material not in MATERIAL_DICTIONARY: material = "None"
        
    # Build species slug and genome depending on paradigm
    species_parts = []
    visual_modifiers = []
    locked_features = ""
    core_identity = ""
    stages = {}
    
    if super_category == "creatures":
        paradigm = "lifecycle"
        
        if rarity != "None": species_parts.append(rarity.lower())
        if temperament != "None": species_parts.append(temperament.lower())
        if element != "None": species_parts.append(element.lower())
        species_parts.append(base_creature)
        
        if ELEMENT_DICTIONARY[element]: visual_modifiers.append(f"composed of {ELEMENT_DICTIONARY[element]}")
        if TEMPERAMENT_DICTIONARY[temperament]: visual_modifiers.append(TEMPERAMENT_DICTIONARY[temperament])
        if RARITY_DICTIONARY[rarity]: visual_modifiers.append(RARITY_DICTIONARY[rarity])
        
        locked_features = ", ".join(visual_modifiers) if visual_modifiers else "standard design"
        core_identity = f"{rarity if rarity != 'None' else ''} {temperament if temperament != 'None' else ''} {element if element != 'None' else ''} {base_creature.replace('_', ' ')} creature".strip()
        
        stages = {
            "baby": {"growth": f"small, cute, undeveloped version, {TEMPERAMENT_DICTIONARY[temperament]}, {RARITY_DICTIONARY[rarity]}, round proportions"},
            "adult": {"growth": f"large, fully developed, {locked_features}, combat ready stance"},
            "elder": {"growth": f"massive, towering, ancient, radiating intense power, {locked_features}, majestic and imposing"}
        }
        
    elif super_category == "world-monsters":
        paradigm = "single"
        
        if monster_class != "None": species_parts.append(monster_class.lower())
        if habitat != "None": species_parts.append(habitat.lower().replace(" ", "_"))
        species_parts.append(base_creature)
        
        if MONSTER_CLASS_DICTIONARY.get(monster_class): visual_modifiers.append(MONSTER_CLASS_DICTIONARY[monster_class])
        if HABITAT_DICTIONARY.get(habitat): visual_modifiers.append(f"adapted for {HABITAT_DICTIONARY[habitat]}")
        
        locked_features = ", ".join(visual_modifiers) if visual_modifiers else "standard design"
        core_identity = f"{habitat if habitat != 'None' else ''} {monster_class if monster_class != 'None' else ''} {base_creature.replace('_', ' ')} wild monster".strip()
        
        stages = {
            "default": {"growth": f"fully developed wild monster, {locked_features}"}
        }
        
    elif super_category == "npc":
        paradigm = "single"
        
        if rarity != "None": species_parts.append(rarity.lower())
        if char_class != "None": species_parts.append(char_class.lower())
        species_parts.append(base_creature)
        
        if CLASS_DICTIONARY[char_class]: visual_modifiers.append(CLASS_DICTIONARY[char_class])
        if RARITY_DICTIONARY[rarity]: visual_modifiers.append(RARITY_DICTIONARY[rarity])
        
        locked_features = ", ".join(visual_modifiers) if visual_modifiers else "standard design"
        core_identity = f"{rarity if rarity != 'None' else ''} {char_class if char_class != 'None' else ''} {base_creature.replace('_', ' ')} character".strip()
        
        stages = {
            "default": {"growth": f"fully developed, {locked_features}"}
        }
        
    elif super_category == "environment":
        paradigm = "single"
        
        if material != "None": species_parts.append(material.lower())
        if biome != "None": species_parts.append(biome.lower())
        species_parts.append(base_creature)
        
        if MATERIAL_DICTIONARY[material]: visual_modifiers.append(MATERIAL_DICTIONARY[material])
        if BIOME_DICTIONARY[biome]: visual_modifiers.append(BIOME_DICTIONARY[biome])
        
        locked_features = ", ".join(visual_modifiers) if visual_modifiers else "standard design"
        core_identity = f"{material if material != 'None' else ''} {biome if biome != 'None' else ''} {base_creature.replace('_', ' ')} prop".strip()
        
        stages = {
            "default": {"growth": f"static environment prop, {locked_features}"}
        }
        
    elif super_category == "ui":
        paradigm = "single"
        
        if material != "None": species_parts.append(material.lower())
        species_parts.append(base_creature)
        
        if MATERIAL_DICTIONARY[material]: visual_modifiers.append(MATERIAL_DICTIONARY[material])
        
        locked_features = ", ".join(visual_modifiers) if visual_modifiers else "standard design"
        core_identity = f"{material if material != 'None' else ''} {base_creature.replace('_', ' ')} ui element".strip()
        
        stages = {
            "default": {"growth": f"static UI element, {locked_features}"}
        }
        
    else:
        return jsonify({"error": "Invalid super category."}), 400
        
    species = "_".join(species_parts)
    
    genome = {
        "species": species,
        "category": super_category,
        "paradigm": paradigm,
        "metadata": {
            "element": element,
            "temperament": temperament,
            "rarity": rarity,
            "class": char_class,
            "biome": biome,
            "material": material
        },
        "core_identity": core_identity,
        "locked_features": locked_features,
        "stages": stages,
        "advanced_params": {
            "inference_steps": inference_steps,
            "guidance_scale": guidance_scale,
            "seed": seed,
            "negative_prompt": negative_prompt
        }
    }
    
    job_data = {
        "species": species,
        "genome_data": genome
    }
    
    job_queue.put(job_data)
    
    return jsonify({"status": "queued", "message": "Job queued successfully"})

@app.route('/queue_audio', methods=['POST'])
def queue_audio():
    data = request.json
    job_type = data.get('type')
    prompt = data.get('prompt')
    duration = data.get('duration_seconds', 10)
    
    temperature = float(data.get('temperature', 1.0))
    
    if not prompt: return jsonify({"error": "Prompt required"}), 400
    
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'game-assets', 'audio')
    audio_queue.put({
        "type": job_type,
        "prompt": prompt,
        "duration_seconds": duration,
        "temperature": temperature,
        "output_dir": output_dir
    })
    return jsonify({"status": "queued"})

@app.route('/queue_quest', methods=['POST'])
def queue_quest():
    data = request.json
    master_lore = data.get('master_lore', '')
    theme = data.get('theme', 'General')
    difficulty = data.get('difficulty', 'Normal')
    
    if not master_lore: return jsonify({"error": "Master Lore required"}), 400
    
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public', 'game-assets', 'quests')
    os.makedirs(output_dir, exist_ok=True)
    
    quest_id = f"quest_{uuid.uuid4().hex[:8]}"
    output_file = os.path.join(output_dir, f"{quest_id}.json")
    
    max_tokens = int(data.get('max_tokens', 100))
    temperature = float(data.get('temperature', 0.7))
    top_p = float(data.get('top_p', 0.9))

    quest_queue.put({
        "master_lore": master_lore,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "top_p": top_p,
        "theme": theme,
        "difficulty": difficulty,
        "output_file": output_file
    })
    return jsonify({"status": "queued"})

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        "current_job": status_state["current_job"],
        "pending_count": status_state["pending_count"],
        "completed_jobs": status_state["completed_jobs"]
    })

@app.route('/clear_history', methods=['POST'])
def clear_history():
    status_state["completed_jobs"] = []
    return jsonify({"status": "cleared"})

@app.route('/library', methods=['GET'])
def get_library():
    library = []
    folders_to_scan = ['creatures', 'world-monsters', 'npc', 'environment', 'ui']
    
    for category in folders_to_scan:
        cat_dir = os.path.join('public', 'game-assets', category)
        if not os.path.exists(cat_dir):
            continue
            
        genome_files = glob.glob(os.path.join(cat_dir, '*_genome.json'))
        
        for gf in genome_files:
            basename = os.path.basename(gf)
            species = basename.replace('_genome.json', '')
            
            # Read the metadata
            metadata = {}
            paradigm = "lifecycle"
            try:
                with open(gf, 'r') as f:
                    data = json.load(f)
                    paradigm = data.get("paradigm", "lifecycle")
                    if "metadata" in data:
                        metadata = data["metadata"]
            except:
                pass
            
            # Formulate asset paths based on paradigm
            if paradigm == "lifecycle":
                adult_ow = os.path.join(cat_dir, f"{species}-adult-ow.png")
                if os.path.exists(adult_ow):
                    library.append({
                        "species": species,
                        "category": category,
                        "paradigm": paradigm,
                        "metadata": metadata,
                        "baby": f"/game-assets/{category}/{species}-baby-ow.png",
                        "adult": f"/game-assets/{category}/{species}-adult-ow.png",
                        "elder": f"/game-assets/{category}/{species}-elder-ow.png"
                    })
            else:
                default_ow = os.path.join(cat_dir, f"{species}-ow.png")
                if os.path.exists(default_ow):
                    library.append({
                        "species": species,
                        "category": category,
                        "paradigm": paradigm,
                        "metadata": metadata,
                        "default": f"/game-assets/{category}/{species}-ow.png"
                    })
            
    # Sort library alphabetically
    library.sort(key=lambda x: x["species"])
    return jsonify(library)

@app.route('/delete', methods=['POST'])
def delete_creature():
    data = request.json
    species = data.get('species')
    category = data.get('category', 'creatures')
    if not species:
        return jsonify({"error": "No species provided"}), 400
        
    cat_dir = os.path.join('public', 'game-assets', category)
    
    # Determine battle dir based on category
    if category == 'npc':
        battle_dir = os.path.join('public', 'game-assets', 'npc', 'portrait')
    elif category == 'environment':
        battle_dir = os.path.join('public', 'game-assets', 'environment', 'portrait')
    else:
        battle_dir = os.path.join('public', 'game-assets', 'monster', 'battle')
    
    files_to_delete = [
        os.path.join(cat_dir, f"{species}_genome.json"),
        os.path.join(cat_dir, f"{species}-baby-ow.png"),
        os.path.join(cat_dir, f"{species}-adult-ow.png"),
        os.path.join(cat_dir, f"{species}-elder-ow.png"),
        os.path.join(cat_dir, f"{species}-ow.png"),
        os.path.join(battle_dir, f"{species}-baby-sheet.png"),
        os.path.join(battle_dir, f"{species}-adult-sheet.png"),
        os.path.join(battle_dir, f"{species}-elder-sheet.png"),
        os.path.join(battle_dir, f"{species}-sheet.png")
    ]
    
    deleted_count = 0
    for file in files_to_delete:
        if os.path.exists(file):
            try:
                os.remove(file)
                deleted_count += 1
            except Exception as e:
                pass
                
    return jsonify({"status": "deleted", "files_removed": deleted_count})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
