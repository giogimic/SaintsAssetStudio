import { useState, useEffect } from 'react';

const REQUIREMENTS: Record<string, string> = {
  creatures: `Generates a full 3-stage biological evolution line. Output: 96px Overworld crops (creatures/{slug}-{stage}-ow.png) & 1024x1024 Battle Sheets (monster/battle/{slug}-{stage}-sheet.png)`,
  'world-monsters': `Generates a single-stage wild monster for encounters. Output: 96px Overworld crop (world-monsters/{slug}-ow.png) & 1024x1024 Battle Sheet (monster/battle/{slug}-sheet.png)`,
  npc: `Generates a 3x4 walking animation sprite sheet. Output: 96px Overworld crop (npc/{slug}-ow.png) & 3x4 Sprite Sheet (npc/portrait/{slug}-sheet.png)`,
  environment: `Generates a static environment prop. Output: Static Overworld crop (environment/{slug}-ow.png) & 1024x1024 Scene Art (environment/portrait/{slug}-sheet.png)`,
  ui: `Generates UI elements and decorative frames.`
};

export default function App() {
  const [category, setCategory] = useState('creatures'); // creatures, world-monsters, npc, environment, ui
  const [studioMode, setStudioMode] = useState<'image' | 'audio' | 'quest' | 'settings'>('image');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  // Audio State
  const [audioType, setAudioType] = useState('voice');
  const [audioPrompt, setAudioPrompt] = useState('');
  const [audioDuration, setAudioDuration] = useState(10);
  
  // Quest State
  const [questLore, setQuestLore] = useState('');
  const [questTheme, setQuestTheme] = useState('');
  const [questCategory, setQuestCategory] = useState('Side Quest');
  const [questDiff, setQuestDiff] = useState('Normal');

  const generateRandomQuestTheme = () => {
    const themes = [
      "A cursed artifact in the Whispering Woods", 
      "Assassination of a corrupt noble", 
      "Finding the lost heir of the Crystal Kingdom", 
      "Defending a merchant caravan from cyber-bandits", 
      "Investigating a strange sickness in the neon slums",
      "Retrieving a stolen experimental AI core",
      "Escorting a defector across the radioactive wasteland"
    ];
    setQuestTheme(themes[Math.floor(Math.random() * themes.length)]);
  };

  const [libraryCat, setLibraryCat] = useState('all');
  const [assets, setAssets] = useState<any[]>([]);
  const [lightboxAsset, setLightboxAsset] = useState<any>(null);

  // Smart Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterElement, setFilterElement] = useState('All');
  const [sortOrder, setSortOrder] = useState('A-Z');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const categoryInfo = {
    creatures: {
      title: 'Creatures & Evolutions',
      description: 'Generates multi-stage lifecycle pixel art (Baby, Adult, Elder).',
      goodUrl: 'https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/mods/tuxemon/gfx/sprites/battle/aardart-sheet.png',
      goodDesc: 'Clean, flat colors, clear silhouette, pure white background.',
      badDesc: 'Fragmented into 6 random pictures, blurry gradients, 3D shading.'
    },
    'world-monsters': {
      title: 'World Monsters',
      description: 'Generates single-stage wild monsters for the overworld and battle.',
      goodUrl: 'https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/mods/tuxemon/gfx/sprites/battle/bamboon-sheet.png',
      goodDesc: 'Strong shape language, retro 16-bit pixel aesthetic.',
      badDesc: 'Over-detailed fur, messy background, not pixel art.'
    },
    npc: {
      title: 'Characters & NPCs',
      description: 'Generates 3x4 walking animation sprite sheets for humanoid characters.',
      goodUrl: '/game-assets/npc/portrait/common_older_italian_man-sheet.png',
      goodDesc: '3x4 grid walking animation, readable face, strict pixel grid.',
      badDesc: 'Deformed proportions, extra arms, photorealism, missing frames.'
    },
    environment: {
      title: 'Environment Props',
      description: 'Generates static textures and props for map building.',
      goodUrl: 'https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/mods/tuxemon/gfx/sprites/battle/rock-sheet.png',
      goodDesc: 'Single isolated object, no surrounding scenery.',
      badDesc: 'Generates a whole fenced-in yard when you asked for dirt.'
    },
    ui: {
      title: 'UI Elements',
      description: 'Generates flat 16-bit pixel art panels, buttons, and decorative frames.',
      goodUrl: 'https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/mods/tuxemon/gfx/interface/dialog_box.png',
      goodDesc: 'Flat colors, strict geometric shapes, readable edges.',
      badDesc: '3D bevels, blurry textures, gradients.'
    }
  };

  // Queue Status
  const [jobStatus, setJobStatus] = useState<any>({ current_job: null, pending_count: 0, completed_jobs: [] });

  // Form State
  const [baseCreature, setBaseCreature] = useState('');
  const [rarity, setRarity] = useState('None');
  const [element, setElement] = useState('None');
  const [temperament, setTemperament] = useState('None');
  const [monsterClass, setMonsterClass] = useState('None');
  const [habitat, setHabitat] = useState('None');
  const [charClass, setCharClass] = useState('None');
  const [biome, setBiome] = useState('None');
  const [material, setMaterial] = useState('None');

  // Advanced Form State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inferenceSteps, setInferenceSteps] = useState(30);
  const [guidanceScale, setGuidanceScale] = useState(8.5);
  const [seed, setSeed] = useState(''); // empty string means random
  const [negativePrompt, setNegativePrompt] = useState('');
  const [temperature, setTemperature] = useState(1.0);
  const [maxTokens, setMaxTokens] = useState(500);
  const [topP, setTopP] = useState(0.9);

  // Terminal State
  const [logFilter, setLogFilter] = useState('All');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logs, setLogs] = useState<string[]>(['> System ready. Awaiting input.']);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchLibrary(libraryCat);
  }, [libraryCat]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, 1500); // 1.5 seconds to track downloads better
    fetchSystemStatus();
    fetchLogs();
    return () => clearInterval(interval);
  }, []);


  const fetchLibrary = async (cat: string) => {
    try {
      const res = await fetch(`/library?category=${cat}`);
      const data = await res.json();
      
      let items = Array.isArray(data) ? data : (data.assets || []);
      if (cat !== 'all') {
        items = items.filter((asset: any) => asset.category === cat);
      }
      setAssets(items);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/status');
      const data = await res.json();
      
      setJobStatus((prev: any) => {
        // If a job just finished (was running, now idle or a different job), refresh library
        if (prev.current_job && prev.current_job !== data.current_job) {
          fetchLibrary(libraryCat);
        }
        return data;
      });
    } catch (e) {
      console.error("Failed to fetch status");
    }
  };

  const clearHistory = async () => {
    await fetch('/clear_history', { method: 'POST' });
    fetchStatus();
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('/api/system_status');
      const data = await res.json();
      setSystemStatus(data);
    } catch (e) {
      console.error("Failed to fetch system status", e);
    }
  };

  const handleDownloadModel = async (modelId: string) => {
    try {
      await fetch('/api/download_model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId })
      });
      fetchStatus();
      setShowSettings(false);
      setShowTerminal(true);
      logMessage(`Started downloading ${modelId}. Watch the backend terminal for tqdm progress!`);
    } catch (e) {
      console.error("Failed to start download", e);
    }
  };

  const logMessage = async (msg: string) => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg })
      });
      fetchLogs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedAssets.length} selected assets?`)) return;
    
    // We loop and delete since the backend supports single delete currently
    for (const species of selectedAssets) {
      const asset = assets.find(a => a.species === species);
      if (asset) {
        try {
          await fetch('/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ species: asset.species, category: asset.category })
          });
        } catch(e) {
          console.error(e);
        }
      }
    }
    
    setSelectedAssets([]);
    fetchLibrary(libraryCat);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    logMessage('Initiating Pipeline...');
    logMessage('Dispatching job to GPU cluster...');

    const payload = {
      super_category: category,
      base_creature: baseCreature,
      rarity, element, temperament,
      monster_class: monsterClass,
      habitat, char_class: charClass,
      biome, material,
      inference_steps: inferenceSteps,
      guidance_scale: guidanceScale,
      seed: seed ? parseInt(seed) : -1,
      negative_prompt: negativePrompt
    };

    try {
      const res = await fetch('/queue_job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.status === 'queued' || data.status === 'success') {
        logMessage(`Success! Asset [${baseCreature}] crystallized and sent to Queue.`);
        fetchStatus();
      } else {
        logMessage(`ERROR: ${data.message || data.error || 'Unknown error'}`);
      }
    } catch (e) {
      logMessage(`CRITICAL FAILURE: Network disconnect.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAudioGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    logMessage('Dispatching Audio job to GPU cluster...');
    try {
      const res = await fetch('/queue_audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: audioType, prompt: audioPrompt, duration_seconds: audioDuration, temperature })
      });
      const data = await res.json();
      if (data.status === 'queued') {
        logMessage(`Success! Audio job sent to Queue.`);
      } else {
        logMessage(`ERROR: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      logMessage(`CRITICAL FAILURE: Network disconnect.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuestGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    logMessage('Dispatching Quest job to Local LLM...');
    try {
      const res = await fetch('/queue_quest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ master_lore: questLore, theme: questTheme, category: questCategory, difficulty: questDiff, max_tokens: maxTokens, temperature: temperature, top_p: topP })
      });
      const data = await res.json();
      if (data.status === 'queued') {
        logMessage(`Success! Quest job sent to Queue.`);
      } else {
        logMessage(`ERROR: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      logMessage(`CRITICAL FAILURE: Network disconnect.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-transparent text-base-content font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-64 glass-panel border-r border-[rgba(255,42,42,0.3)] flex-col hidden md:flex h-full rounded-none">
        <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
          <h1 className="text-2xl tracking-widest font-heading">
            <span className="text-[var(--color-saints-red)]">SAINTS</span> <span className="text-white">STUDIO</span>
          </h1>
          <div className="flex items-center gap-2 font-mono text-xs mt-2 text-gray-400">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(0,255,0,0.8)]"></div> ENGINE ONLINE
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 font-heading">
          {/* IMAGE STUDIO NAV */}
          <div>
            <h2 className="text-xs text-gray-500 font-bold tracking-widest mb-3 uppercase">Image Studio</h2>
            <ul className="flex flex-col gap-1">
              {['creatures', 'world-monsters', 'npc', 'environment', 'ui'].map((cat) => (
                <li key={cat}>
                  <button 
                    className={`w-full text-left px-4 py-2 rounded transition-colors ${studioMode === 'image' && category === cat ? 'bg-[rgba(255,42,42,0.2)] text-white border-l-4 border-[var(--color-saints-red)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    onClick={() => { setStudioMode('image'); setCategory(cat); }}
                  >
                    {cat.replace('-', ' ').toUpperCase()}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* AUDIO STUDIO NAV */}
          <div>
            <h2 className="text-xs text-gray-500 font-bold tracking-widest mb-3 uppercase">Audio Studio</h2>
            <ul className="flex flex-col gap-1">
              <li>
                <button 
                  className={`w-full text-left px-4 py-2 rounded transition-colors ${studioMode === 'audio' && audioType === 'voice' ? 'bg-[rgba(255,42,42,0.2)] text-white border-l-4 border-[var(--color-saints-red)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  onClick={() => { setStudioMode('audio'); setAudioType('voice'); }}
                >
                  VOICE LINES
                </button>
              </li>
              <li>
                <button 
                  className={`w-full text-left px-4 py-2 rounded transition-colors ${studioMode === 'audio' && audioType === 'bgm' ? 'bg-[rgba(255,42,42,0.2)] text-white border-l-4 border-[var(--color-saints-red)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  onClick={() => { setStudioMode('audio'); setAudioType('bgm'); }}
                >
                  BACKGROUND MUSIC
                </button>
              </li>
            </ul>
          </div>

          {/* QUEST STUDIO NAV */}
          <div>
            <h2 className="text-xs text-gray-500 font-bold tracking-widest mb-3 uppercase">Quest Studio</h2>
            <ul className="flex flex-col gap-1">
              <li>
                <button 
                  className={`w-full text-left px-4 py-2 rounded transition-colors ${studioMode === 'quest' ? 'bg-[rgba(255,42,42,0.2)] text-white border-l-4 border-[var(--color-saints-red)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  onClick={() => setStudioMode('quest')}
                >
                  STORY & QUESTS
                </button>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col xl:flex-row gap-8 relative z-0">
          
          {/* FORM COLUMN */}
          <section className="xl:w-[450px] flex-shrink-0 glass-panel h-fit border-t-4 border-t-[var(--color-saints-red)]">
            <div className="card-body p-6">

            {studioMode === 'image' && (
              <>
                {/* IMAGE CATEGORY TABS */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {['creatures', 'world-monsters', 'npc', 'environment', 'ui'].map((cat) => (
                    <button 
                      key={cat}
                      className={`btn btn-sm ${category === cat ? 'btn-neon' : 'btn-ghost border border-[rgba(255,255,255,0.1)] text-gray-300'}`} 
                      onClick={() => setCategory(cat)}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="glass-panel p-4 mb-6 text-sm text-gray-300 border-l-4 border-l-[var(--color-saints-red)]">
                  <span className="font-bold text-white mb-1 block">REQUIREMENTS</span>
                  {REQUIREMENTS[category] || "No requirements specified."}
                </div>

                <form onSubmit={handleGenerate}>
                  <div className="form-control mb-6">
                    <label className="label"><span className="label-text font-bold text-white">Base Subject</span></label>
                    <input type="text" className="input input-glass w-full input-lg font-mono placeholder-gray-500" placeholder="e.g. Wolf, Crystal Formation, Dialog Box" value={baseCreature} onChange={e => setBaseCreature(e.target.value)} required />
                  </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Rarity */}
                {(category === 'creatures' || category === 'npc') && (
                  <div className="form-control">
                    <label className="label"><span className="label-text text-gray-300">Rarity/Tier</span></label>
                    <select className="select select-glass w-full" value={rarity} onChange={e => setRarity(e.target.value)}>
                      <option value="None">Standard</option>
                      <option value="Common">Common</option>
                      <option value="Rare">Rare</option>
                      <option value="Epic">Epic</option>
                      <option value="Legendary">Legendary</option>
                    </select>
                  </div>
                )}

                {/* Element */}
                {category === 'creatures' && (
                  <div className="form-control">
                    <label className="label"><span className="label-text text-gray-300">Element</span></label>
                    <select className="select select-glass w-full" value={element} onChange={e => setElement(e.target.value)}>
                      <option value="None">Neutral</option>
                      <option value="Solar">Solar (Fire/Light)</option>
                      <option value="Hydro">Hydro (Water)</option>
                      <option value="Bio">Bio (Nature/Poison)</option>
                      <option value="Volt">Volt (Electric)</option>
                      <option value="Geo">Geo (Earth/Rock)</option>
                      <option value="Cryo">Cryo (Ice)</option>
                      <option value="Aero">Aero (Air)</option>
                      <option value="Cyber">Cyber (Tech)</option>
                    </select>
                  </div>
                )}

                {/* Temperament */}
                {category === 'creatures' && (
                  <div className="form-control">
                    <label className="label"><span className="label-text text-gray-300">Temperament</span></label>
                    <select className="select select-glass w-full" value={temperament} onChange={e => setTemperament(e.target.value)}>
                      <option value="None">Standard</option>
                      <option value="Aggressive">Aggressive</option>
                      <option value="Playful">Playful</option>
                      <option value="Sleepy">Sleepy</option>
                      <option value="Majestic">Majestic</option>
                      <option value="Derpy">Derpy</option>
                    </select>
                  </div>
                )}

                {/* Monster Class */}
                {category === 'world-monsters' && (
                  <div className="form-control">
                    <label className="label"><span className="label-text">Monster Class</span></label>
                    <select className="select select-bordered" value={monsterClass} onChange={e => setMonsterClass(e.target.value)}>
                      <option value="None">Standard</option>
                      <option value="Beast">Beast</option>
                      <option value="Undead">Undead</option>
                      <option value="Construct">Construct</option>
                      <option value="Aberration">Aberration</option>
                      <option value="Dragonkin">Dragonkin</option>
                    </select>
                  </div>
                )}

                {/* Habitat */}
                {category === 'world-monsters' && (
                  <div className="form-control">
                    <label className="label"><span className="label-text">Habitat</span></label>
                    <select className="select select-bordered" value={habitat} onChange={e => setHabitat(e.target.value)}>
                      <option value="None">Any</option>
                      <option value="Deep Caverns">Deep Caverns</option>
                      <option value="Cursed Forest">Cursed Forest</option>
                      <option value="Volcanic Ashlands">Volcanic Ashlands</option>
                      <option value="Frozen Peaks">Frozen Peaks</option>
                    </select>
                  </div>
                )}

                {/* RPG Class */}
                {category === 'npc' && (
                  <div className="form-control">
                    <label className="label"><span className="label-text">RPG Class</span></label>
                    <select className="select select-bordered" value={charClass} onChange={e => setCharClass(e.target.value)}>
                      <option value="None">Villager</option>
                      <option value="Warrior">Warrior</option>
                      <option value="Mage">Mage</option>
                      <option value="Rogue">Rogue</option>
                      <option value="Cleric">Cleric</option>
                      <option value="Ranger">Ranger</option>
                    </select>
                  </div>
                )}

                {/* Biome */}
                {category === 'environment' && (
                  <div className="form-control">
                    <label className="label"><span className="label-text">Biome</span></label>
                    <select className="select select-bordered" value={biome} onChange={e => setBiome(e.target.value)}>
                      <option value="None">Generic</option>
                      <option value="Forest">Forest</option>
                      <option value="Desert">Desert</option>
                      <option value="Tundra">Tundra</option>
                      <option value="Graveyard">Graveyard</option>
                    </select>
                  </div>
                )}

                {/* Material */}
                {(category === 'environment' || category === 'ui') && (
                  <div className="form-control">
                    <label className="label"><span className="label-text text-gray-300">Material</span></label>
                    <select className="select select-glass w-full" value={material} onChange={e => setMaterial(e.target.value)}>
                      <option value="None">Standard</option>
                      <option value="Wood">Wood</option>
                      <option value="Stone">Stone</option>
                      <option value="Cybernetic">Cybernetic / Sci-Fi</option>
                      <option value="Crystal">Crystal / Magic</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="collapse collapse-arrow bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] mb-4">
                <input type="checkbox" checked={showAdvanced} onChange={(e) => setShowAdvanced(e.target.checked)} /> 
                <div className="collapse-title text-sm font-medium text-gray-300">Advanced Settings</div>
                <div className="collapse-content space-y-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text text-gray-300">Inference Steps ({inferenceSteps})</span></label>
                    <input type="range" min="10" max="50" value={inferenceSteps} onChange={e => setInferenceSteps(parseInt(e.target.value))} className="range range-xs" style={{"--range-shdw": "var(--color-saints-red)"} as any} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-gray-300">Guidance Scale (CFG: {guidanceScale})</span></label>
                    <input type="range" min="1.0" max="15.0" step="0.5" value={guidanceScale} onChange={e => setGuidanceScale(parseFloat(e.target.value))} className="range range-xs" style={{"--range-shdw": "var(--color-saints-red)"} as any} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-gray-300">Seed (Empty = Random)</span></label>
                    <input type="text" className="input input-bordered input-sm bg-black/30" placeholder="Random" value={seed} onChange={e => setSeed(e.target.value)} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-gray-300">Negative Prompt Additions</span></label>
                    <input type="text" className="input input-bordered input-sm bg-black/30" placeholder="ugly, blurry, cropped" value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-neon w-full btn-lg font-heading tracking-widest" disabled={isSubmitting}>
                {isSubmitting ? <span className="loading loading-spinner text-[var(--color-saints-red)]"></span> : 'QUEUE IMAGE JOB'}
              </button>
            </form>
            </>
            )}

            {studioMode === 'audio' && (
              <form onSubmit={handleAudioGenerate}>
                
                <div className="form-control mb-4">
                  <label className="label"><span className="label-text font-bold text-white">Prompt / Text</span></label>
                  <textarea className="textarea textarea-glass h-24 w-full" placeholder={audioType === 'voice' ? "e.g. [laughs] Hello there adventurer!" : "e.g. 8-bit chiptune boss battle theme, fast tempo"} value={audioPrompt} onChange={e => setAudioPrompt(e.target.value)} required></textarea>
                </div>
                
                {audioType === 'bgm' && (
                  <div className="form-control mb-6">
                    <label className="label"><span className="label-text font-bold text-white">Duration (Seconds)</span></label>
                    <input type="range" min="5" max="30" value={audioDuration} className="range range-xs" style={{"--range-shdw": "var(--color-saints-red)"} as any} onChange={e => setAudioDuration(parseInt(e.target.value))} />
                    <div className="text-center text-xs mt-1 text-gray-400">{audioDuration}s</div>
                  </div>
                )}
                <div className="collapse collapse-arrow bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] mb-4">
                  <input type="checkbox" checked={showAdvanced} onChange={(e) => setShowAdvanced(e.target.checked)} /> 
                  <div className="collapse-title text-sm font-medium text-gray-300">Advanced Settings</div>
                  <div className="collapse-content">
                    <div className="form-control">
                      <label className="label"><span className="label-text text-gray-300">Temperature ({temperature})</span></label>
                      <input type="range" min="0.1" max="2.0" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="range range-xs" style={{"--range-shdw": "var(--color-saints-red)"} as any} />
                    </div>
                  </div>
                </div>
                
                <button type="submit" className="btn btn-neon w-full btn-lg font-heading tracking-widest mt-4" disabled={isSubmitting}>
                  {isSubmitting ? <span className="loading loading-spinner text-[var(--color-saints-red)]"></span> : 'QUEUE AUDIO JOB'}
                </button>
              </form>
            )}
            
            {studioMode === 'quest' && (
              <form onSubmit={handleQuestGenerate}>
                <div className="form-control mb-4">
                  <label className="label"><span className="label-text font-bold text-white">Master Storyline / Lore (Mandatory)</span></label>
                  <textarea className="textarea textarea-glass h-32 w-full border-[var(--color-saints-red)]" placeholder="e.g. The world is a ruined cyberpunk wasteland. The player is a cybernetically enhanced courier..." value={questLore} onChange={e => setQuestLore(e.target.value)} required></textarea>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text font-bold text-white">Category</span></label>
                    <select className="select select-glass w-full" value={questCategory} onChange={e => setQuestCategory(e.target.value)}>
                      <option value="Main Story">Main Story</option>
                      <option value="Side Quest">Side Quest</option>
                      <option value="Item Lore">Item Lore</option>
                      <option value="World Event">World Event</option>
                      <option value="NPC Dialogue">NPC Dialogue</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text font-bold text-white">Difficulty</span></label>
                    <select className="select select-glass w-full" value={questDiff} onChange={e => setQuestDiff(e.target.value)}>
                      <option value="Trivial">Trivial</option>
                      <option value="Normal">Normal</option>
                      <option value="Hard">Hard</option>
                      <option value="Legendary">Legendary</option>
                    </select>
                  </div>
                </div>

                <div className="form-control mb-4">
                  <label className="label flex justify-between">
                    <span className="label-text font-bold text-white">Quest Theme</span>
                    <button type="button" onClick={generateRandomQuestTheme} className="text-xs text-[var(--color-saints-red)] hover:text-white transition-colors">Generate Random</button>
                  </label>
                  <input type="text" className="input input-glass w-full" placeholder="e.g. Retrieve a stolen hard drive" value={questTheme} onChange={e => setQuestTheme(e.target.value)} required />
                </div>
                <div className="collapse collapse-arrow bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] mb-4">
                  <input type="checkbox" checked={showAdvanced} onChange={(e) => setShowAdvanced(e.target.checked)} /> 
                  <div className="collapse-title text-sm font-medium text-gray-300">Advanced Settings</div>
                  <div className="collapse-content space-y-4">
                    <div className="form-control">
                      <label className="label"><span className="label-text text-gray-300">Max Tokens ({maxTokens})</span></label>
                      <input type="range" min="100" max="2000" step="100" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} className="range range-xs" style={{"--range-shdw": "var(--color-saints-red)"} as any} />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text text-gray-300">Temperature ({temperature})</span></label>
                      <input type="range" min="0.1" max="2.0" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="range range-xs" style={{"--range-shdw": "var(--color-saints-red)"} as any} />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text text-gray-300">Top-P ({topP})</span></label>
                      <input type="range" min="0.1" max="1.0" step="0.05" value={topP} onChange={e => setTopP(parseFloat(e.target.value))} className="range range-xs" style={{"--range-shdw": "var(--color-saints-red)"} as any} />
                    </div>
                  </div>
                </div>
                
                <button type="submit" className="btn btn-neon w-full btn-lg font-heading tracking-widest mt-4" disabled={isSubmitting}>
                  {isSubmitting ? <span className="loading loading-spinner text-[var(--color-saints-red)]"></span> : 'QUEUE QUEST JOB'}
                </button>
              </form>
            )}

          </div>
        </section>

        {/* RIGHT COLUMN: GALLERY */}
        <section className="xl:col-span-7 flex flex-col gap-6">
          
          {/* QUEUE STATUS */}
          <div className="glass-panel shadow-xl h-fit">
            <div className="card-body p-6 flex flex-row justify-between items-center">
              <div className="flex-1 min-w-[250px] pr-4 border-r border-[rgba(255,255,255,0.05)] mr-4">
                <h3 className="text-xl font-bold font-heading tracking-widest text-white mb-1 flex items-center gap-2">
                  CLUSTER QUEUE
                  {jobStatus.current_job ? <span className="loading loading-ring loading-sm text-[var(--color-saints-red)]"></span> : <div className="w-2 h-2 rounded-full bg-gray-600 shadow-[0_0_5px_rgba(255,255,255,0.2)]"></div>}
                </h3>
                <p className="text-sm text-gray-400">
                  {jobStatus.pending_count} pending job(s)
                </p>
                {/* Visual Queue Progression */}
                <div className="mt-4 flex gap-1 items-center h-2">
                   {!jobStatus.current_job && jobStatus.pending_count === 0 && (
                      <div className="h-full w-full bg-black/40 rounded flex items-center justify-center text-[8px] text-gray-600 tracking-widest font-heading">IDLE</div>
                   )}
                   {jobStatus.current_job && <div className="h-full flex-1 bg-[var(--color-saints-red)] shadow-[0_0_10px_var(--color-saints-red)] rounded animate-pulse" title="Processing..."></div>}
                   {Array.from({length: Math.min(jobStatus.pending_count, 10)}).map((_, i) => (
                      <div key={i} className="h-full w-8 bg-white/20 rounded" title="Pending"></div>
                   ))}
                   {jobStatus.pending_count > 10 && <span className="text-xs text-gray-500 ml-2 font-mono">+{jobStatus.pending_count - 10}</span>}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="stat bg-black/40 rounded-box p-3 min-w-[200px] border border-[rgba(255,255,255,0.1)]">
                  <div className="stat-title text-xs text-gray-400">Current Target</div>
                  <div className="stat-value text-lg text-[var(--color-saints-red)] truncate max-w-[180px]">
                    {jobStatus.current_job ? jobStatus.current_job.replace(/_/g, ' ') : 'IDLE'}
                  </div>
                </div>

                <div className="stat bg-black/40 rounded-box p-3 min-w-[150px] cursor-pointer hover:bg-black/60 border border-[rgba(255,255,255,0.1)]" onClick={clearHistory}>
                  <div className="stat-title text-xs text-gray-400">Recently Crystallized</div>
                  <div className="stat-value text-lg text-green-400">{jobStatus.completed_jobs.length}</div>
                  <div className="stat-desc hover:text-[var(--color-saints-red)] text-xs text-gray-500">Click to clear</div>
                </div>
              </div>
            </div>
          </div>
        
          {/* LIBRARY */}
          <div className="glass-panel shadow-xl flex-1 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="card-body p-6 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold font-heading tracking-widest text-white">ASSET LIBRARY</h2>
                  <p className="text-gray-400 text-sm mt-1">Approved Studio Packages</p>
                </div>
                <button className="btn btn-sm btn-ghost text-gray-300 border border-gray-600 hover:border-[var(--color-saints-red)]" onClick={() => fetchLibrary(libraryCat)}>↻ Refresh</button>
              </div>

              <div className="tabs tabs-boxed mb-6 bg-black/50 p-1 w-fit border border-[rgba(255,255,255,0.1)]">
                <button className={`tab font-heading ${libraryCat === 'all' ? 'tab-active-neon' : 'text-gray-400'}`} onClick={() => { setLibraryCat('all'); setCurrentFolder(null); }}>ALL</button>
                <button className={`tab font-heading ${libraryCat === 'creatures' ? 'tab-active-neon' : 'text-gray-400'}`} onClick={() => setLibraryCat('creatures')}>CREATURES</button>
                <button className={`tab font-heading ${libraryCat === 'world-monsters' ? 'tab-active-neon' : 'text-gray-400'}`} onClick={() => setLibraryCat('world-monsters')}>MONSTERS</button>
                <button className={`tab font-heading ${libraryCat === 'npc' ? 'tab-active-neon' : 'text-gray-400'}`} onClick={() => setLibraryCat('npc')}>CHARACTERS</button>
                <button className={`tab font-heading ${libraryCat === 'environment' ? 'tab-active-neon' : 'text-gray-400'}`} onClick={() => setLibraryCat('environment')}>ENVIRONMENT</button>
                <button className={`tab font-heading ${libraryCat === 'audio' ? 'tab-active-neon' : 'text-gray-400'}`} onClick={() => setLibraryCat('audio')}>AUDIO</button>
                <button className={`tab font-heading ${libraryCat === 'quests' ? 'tab-active-neon' : 'text-gray-400'}`} onClick={() => setLibraryCat('quests')}>QUESTS</button>
              </div>

              {libraryCat === 'all' && !currentFolder && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {['creatures', 'world-monsters', 'npc', 'environment'].map(folder => (
                    <div key={folder} className="card bg-black/40 border border-[rgba(255,255,255,0.05)] shadow-sm cursor-pointer hover:bg-black/60 hover:border-[var(--color-saints-red)] hover:shadow-[0_0_15px_rgba(255,42,42,0.2)] transition-all group" onClick={() => setCurrentFolder(folder)}>
                      <div className="card-body flex flex-col items-center justify-center p-8 gap-4">
                        <svg className="w-16 h-16 text-gray-500 group-hover:text-[var(--color-saints-red)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                          <line x1="12" y1="11" x2="12" y2="17"></line>
                          <line x1="9" y1="14" x2="15" y2="14"></line>
                        </svg>
                        <div className="font-bold text-sm uppercase text-gray-300 font-heading tracking-wider">{folder.replace('-', ' ')}</div>
                        <div className="text-xs text-[var(--color-saints-red)] font-mono">{assets.filter(a => a.category === folder).length} ITEMS</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {libraryCat !== 'all' && (
                <div className="mb-8">
                  {(() => {
                    const info = categoryInfo[libraryCat as keyof typeof categoryInfo];
                    if (!info) return null;
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-8">
                        <div className="bg-success/10 p-5 rounded-xl border border-success/30 flex flex-col">
                           <h4 className="font-bold text-success mb-3 text-lg flex items-center gap-2">✅ Ideal Tuxemon Outcome</h4>
                           <div className="flex-1 bg-white/50 rounded-lg flex items-center justify-center p-4 mb-3 border border-success/20">
                              <img src={info.goodUrl} alt="good" className="h-24 object-contain [image-rendering:pixelated]" onError={(e: any) => e.target.src = 'https://raw.githubusercontent.com/Tuxemon/Tuxemon/development/mods/tuxemon/gfx/sprites/battle/aardart-sheet.png'} />
                           </div>
                           <p className="text-sm font-medium text-success/80">{info.goodDesc}</p>
                        </div>
                        <div className="bg-error/10 p-5 rounded-xl border border-error/30 flex flex-col">
                           <h4 className="font-bold text-error mb-3 text-lg flex items-center gap-2">❌ AI Hallucination</h4>
                           <div className="flex-1 bg-black/10 rounded-lg flex items-center justify-center p-4 mb-3 border border-error/20 overflow-hidden relative group">
                              <div className="absolute inset-0 bg-gradient-to-br from-error/20 to-transparent opacity-50"></div>
                              <div className="text-5xl group-hover:animate-spin">😵‍💫</div>
                           </div>
                           <p className="text-sm font-medium text-error/80">{info.badDesc}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {(libraryCat !== 'all' || currentFolder) && (
                <>
                  {currentFolder && (
                    <div className="flex items-center gap-4 mb-6">
                      <button className="btn btn-sm btn-outline" onClick={() => setCurrentFolder(null)}>← Back to Folders</button>
                      <h3 className="text-xl font-bold font-mono text-primary">/ {currentFolder}</h3>
                    </div>
                  )}
                  <div className="flex gap-2 mb-6 flex-wrap">
                    <input type="text" placeholder="Search species..." className="input input-sm input-glass w-full max-w-[200px]" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    <select className="select select-sm select-glass" value={filterElement} onChange={e => setFilterElement(e.target.value)}>
                      <option value="All">All Elements</option>
                      <option value="Solar">Solar</option>
                      <option value="Hydro">Hydro</option>
                      <option value="Bio">Bio</option>
                      <option value="Volt">Volt</option>
                      <option value="Geo">Geo</option>
                      <option value="Cryo">Cryo</option>
                      <option value="Aero">Aero</option>
                      <option value="Cyber">Cyber</option>
                      <option value="None">Neutral</option>
                    </select>
                    <select className="select select-sm select-glass" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                      <option value="A-Z">A-Z</option>
                      <option value="Z-A">Z-A</option>
                      <option value="Rarity (High-Low)">Rarity (High-Low)</option>
                      <option value="Rarity (Low-High)">Rarity (Low-High)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto max-h-[700px] p-2 pr-4">
                    {assets.filter(asset => {
                      const targetCat = currentFolder || libraryCat;
                      if (asset.category !== targetCat) return false;
                      if (searchQuery && !asset.species.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                      if (filterElement !== 'All') {
                        const el = asset.metadata?.element || 'None';
                        if (el !== filterElement) return false;
                      }
                      return true;
                    }).sort((a, b) => {
                      if (sortOrder === 'A-Z') return a.species.localeCompare(b.species);
                      if (sortOrder === 'Z-A') return b.species.localeCompare(a.species);
                      
                      const rarityWeights: Record<string, number> = { 'Legendary': 5, 'Epic': 4, 'Rare': 3, 'Uncommon': 2, 'Common': 1, 'None': 0 };
                      const aWeight = rarityWeights[a.metadata?.rarity] || 0;
                      const bWeight = rarityWeights[b.metadata?.rarity] || 0;
                      if (sortOrder === 'Rarity (High-Low)') return bWeight - aWeight;
                      if (sortOrder === 'Rarity (Low-High)') return aWeight - bWeight;
                      return 0;
                    }).map((asset, i) => (
                      <div key={i} className={`asset-card bg-black/40 shadow-sm cursor-pointer transition-all overflow-hidden rounded-lg relative ${selectedAssets.includes(asset.species) ? 'ring-2 ring-[var(--color-saints-red)]' : ''}`} onClick={() => setLightboxAsset(asset)}>
                        
                        <div className="absolute top-2 left-2 z-10" onClick={(e) => {
                          e.stopPropagation();
                          if (selectedAssets.includes(asset.species)) {
                            setSelectedAssets(selectedAssets.filter(s => s !== asset.species));
                          } else {
                            setSelectedAssets([...selectedAssets, asset.species]);
                          }
                        }}>
                          <input type="checkbox" className="checkbox checkbox-sm border-white/50 checked:border-[var(--color-saints-red)] checked:bg-[var(--color-saints-red)] bg-black/50" checked={selectedAssets.includes(asset.species)} readOnly />
                        </div>

                        <figure className="bg-black/60 p-4 h-32 flex items-center justify-center border-b border-[rgba(255,255,255,0.05)]">
                          {asset.category === 'audio' ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded p-2">
                              <audio controls src={asset.default} className="w-full max-w-[200px] h-10" />
                            </div>
                          ) : asset.category === 'quests' ? (
                            <div className="w-full h-full p-2 overflow-hidden text-[10px] font-mono text-gray-400 leading-tight">
                              <div className="font-bold text-white mb-1 truncate">{asset.quest_data?.title || 'Quest File'}</div>
                              {asset.quest_data?.description?.substring(0, 100)}...
                            </div>
                          ) : (
                            <img src={asset.default || asset.baby} alt={asset.species} className="max-h-full max-w-full object-contain [image-rendering:pixelated]" />
                          )}
                        </figure>
                        <div className="p-3">
                          <h3 className="font-bold text-xs truncate mb-1 text-gray-200">{asset.species.replace(/_/g, ' ')}</h3>
                          <div className="flex gap-1 flex-wrap">
                            <span className="badge badge-outline border-[rgba(255,255,255,0.2)] text-[10px] text-gray-400 p-1 h-auto leading-none">{asset.category}</span>
                            {asset.metadata?.element && asset.metadata.element !== 'None' && <span className="badge badge-outline border-[var(--color-saints-red)] text-[var(--color-saints-red)] text-[10px] p-1 h-auto leading-none">{asset.metadata.element}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedAssets.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 glass-panel border border-[var(--color-saints-red)] px-6 py-3 rounded-full flex items-center gap-4 shadow-[0_0_20px_rgba(255,42,42,0.4)] animate-in slide-in-from-bottom-10 fade-in">
                      <span className="font-bold text-white font-mono">{selectedAssets.length} Selected</span>
                      <div className="w-[1px] h-6 bg-white/20"></div>
                      <button className="btn btn-sm btn-ghost hover:bg-white/10" onClick={() => setSelectedAssets([])}>Cancel</button>
                      <button className="btn btn-sm btn-error text-white font-bold tracking-widest" onClick={handleBulkDelete}>
                        DELETE ALL
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </section>
      </main>

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
        <button 
          className="btn btn-circle btn-lg glass-panel border border-[var(--color-saints-red)] text-[var(--color-saints-red)] shadow-[0_0_15px_rgba(255,42,42,0.3)] hover:bg-[var(--color-saints-red)] hover:text-white transition-all"
          onClick={() => setShowTerminal(!showTerminal)}
          title="Terminal Logs"
        >
          💻
        </button>
        <button 
          className="btn btn-circle btn-lg glass-panel border border-white/20 text-white shadow-lg hover:bg-white/10 transition-all"
          onClick={() => { setShowSettings(!showSettings); if(!showSettings) fetchSystemStatus(); }}
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* SLIDE-OVER PANEL: TERMINAL */}
      <div className={`fixed inset-y-0 right-0 w-96 glass-panel border-l border-[var(--color-saints-red)] shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${showTerminal ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex justify-between items-center bg-black/40">
          <h3 className="font-heading tracking-widest text-[var(--color-saints-red)] font-bold">TERMINAL</h3>
          <button className="btn btn-sm btn-ghost btn-circle" onClick={() => setShowTerminal(false)}>✕</button>
        </div>
        <div className="p-2 border-b border-[rgba(255,255,255,0.05)] bg-black/60 flex gap-2">
          <button className={`btn btn-xs ${logFilter === 'All' ? 'bg-white/10 text-white' : 'btn-ghost text-gray-500 hover:text-gray-300'}`} onClick={() => setLogFilter('All')}>All</button>
          <button className={`btn btn-xs ${logFilter === 'Success' ? 'bg-green-500/20 text-green-400' : 'btn-ghost text-green-700 hover:text-green-500'}`} onClick={() => setLogFilter('Success')}>Success</button>
          <button className={`btn btn-xs ${logFilter === 'Error' ? 'bg-red-500/20 text-red-400' : 'btn-ghost text-red-700 hover:text-red-500'}`} onClick={() => setLogFilter('Error')}>Error</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs flex flex-col gap-1 font-[consolas]" 
             ref={(el) => { if (el && showTerminal) el.scrollTop = el.scrollHeight; }}>
          {logs.filter(log => {
             if (logFilter === 'All') return true;
             if (logFilter === 'Success' && (log.includes('Success') || log.includes('Success!'))) return true;
             if (logFilter === 'Error' && (log.includes('ERROR') || log.includes('FAILURE') || log.includes('Failed'))) return true;
             return false;
          }).map((log, i) => (
             <div key={i} className={`${(log.includes('ERROR') || log.includes('FAILURE') || log.includes('Failed')) ? 'text-red-400 font-bold' : (log.includes('Success') || log.includes('Success!')) ? 'text-green-400' : 'text-gray-300'}`}>{log}</div>
          ))}
          <div className="opacity-50 mt-2 animate-pulse text-[var(--color-saints-red)]">_</div>
        </div>
      </div>

      {/* SLIDE-OVER PANEL: SETTINGS */}
      <div className={`fixed inset-y-0 right-0 w-[400px] glass-panel border-l border-[rgba(255,255,255,0.2)] shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex justify-between items-center bg-black/40">
          <h3 className="font-heading tracking-widest text-white font-bold">SETTINGS & MODELS</h3>
          <button className="btn btn-sm btn-ghost btn-circle" onClick={() => setShowSettings(false)}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          <div className="glass-panel p-4 border border-[rgba(255,255,255,0.05)] rounded-lg">
            <h3 className="font-bold font-heading text-lg text-white mb-3">Dependencies</h3>
            {systemStatus ? (
              <div className="flex flex-col gap-2 font-mono text-sm">
                {Object.entries(systemStatus.dependencies).map(([dep, stat]: [string, any]) => (
                  <div key={dep} className="flex justify-between">
                    <span className="text-gray-400">{dep}</span>
                    <span className={stat.includes('Installed') ? 'text-green-400' : 'text-[var(--color-saints-red)]'}>{stat}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loading loading-spinner loading-sm text-gray-500"></div>
            )}
          </div>

          <div className="glass-panel p-4 border border-[rgba(255,255,255,0.05)] rounded-lg">
            <h3 className="font-bold font-heading text-lg text-white mb-3 flex justify-between">
              <span>Local Models</span>
              <button className="btn btn-xs btn-ghost text-gray-400" onClick={fetchSystemStatus}>↻</button>
            </h3>
            {systemStatus ? (
              <div className="flex flex-col gap-4 font-mono text-xs">
                {Object.entries(systemStatus.models).map(([model, isInstalled]: [string, any]) => (
                  <div key={model} className="flex flex-col justify-between p-3 bg-black/40 rounded border border-[rgba(255,255,255,0.02)] gap-2">
                    <span className="text-gray-300 break-all">{model}</span>
                    <div className="flex justify-end mt-1">
                      {isInstalled ? (
                        <span className="badge badge-success badge-outline">Cached</span>
                      ) : (
                        <button className="btn btn-xs btn-outline border-[var(--color-saints-red)] text-[var(--color-saints-red)] hover:bg-[var(--color-saints-red)] hover:text-white" onClick={() => handleDownloadModel(model)} disabled={!!jobStatus.current_job}>
                          {jobStatus.current_job ? 'BUSY' : 'DOWNLOAD'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loading loading-spinner loading-sm text-gray-500"></div>
            )}
          </div>

        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      {lightboxAsset && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#111] border border-[rgba(255,42,42,0.3)] shadow-[0_0_50px_rgba(255,42,42,0.1)] p-6 relative flex flex-col gap-6">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-white" onClick={() => setLightboxAsset(null)}>✕</button>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-heading font-bold text-white tracking-widest">{lightboxAsset.species.replace(/_/g, ' ').toUpperCase()}</h2>
                <div className="flex gap-2 mt-2 font-mono">
                  <span className="badge badge-outline text-gray-400">{lightboxAsset.category}</span>
                  {lightboxAsset.metadata?.element && lightboxAsset.metadata.element !== 'None' && <span className="badge badge-outline border-[var(--color-saints-red)] text-[var(--color-saints-red)]">{lightboxAsset.metadata.element}</span>}
                </div>
              </div>
              <button className="btn btn-sm btn-error" onClick={async () => {
                if (window.confirm(`Are you sure you want to delete ${lightboxAsset.species}?`)) {
                  await fetch('/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ species: lightboxAsset.species, category: lightboxAsset.category }) });
                  setLightboxAsset(null);
                  fetchLibrary(libraryCat);
                }
              }}>DELETE ASSET</button>
            </div>
            
            <div className="bg-black/50 p-6 flex items-center justify-center border border-white/5 min-h-[400px]">
              {lightboxAsset.category === 'audio' ? (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="w-32 h-32 rounded-full bg-[var(--color-saints-red)]/20 border-4 border-[var(--color-saints-red)] flex items-center justify-center">
                    <svg className="w-16 h-16 text-[var(--color-saints-red)]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"></path>
                    </svg>
                  </div>
                  <audio controls src={lightboxAsset.default} className="w-full max-w-md" autoPlay />
                </div>
              ) : lightboxAsset.category === 'quests' ? (
                <div className="w-full max-w-3xl h-full overflow-y-auto text-left font-mono">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{lightboxAsset.quest_data?.title || 'Untitled Quest'}</h3>
                    <p className="text-gray-300">{lightboxAsset.quest_data?.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-[var(--color-saints-red)] font-bold mb-2">Objectives</h4>
                      <ul className="list-disc pl-5 text-gray-300">
                        {lightboxAsset.quest_data?.objectives?.map((obj: string, i: number) => <li key={i}>{obj}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[var(--color-saints-red)] font-bold mb-2">Rewards</h4>
                      <ul className="list-disc pl-5 text-gray-300">
                        {lightboxAsset.quest_data?.rewards?.map((reward: string, i: number) => <li key={i}>{reward}</li>)}
                      </ul>
                    </div>
                  </div>
                  {lightboxAsset.quest_data?.dialogue && (
                    <div className="mt-6 p-4 border-l-4 border-[var(--color-saints-red)] bg-black/40">
                      <p className="text-gray-200 italic">"{lightboxAsset.quest_data.dialogue}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <img src={lightboxAsset.default || lightboxAsset.adult || lightboxAsset.baby} className="max-h-[500px] object-contain [image-rendering:pixelated]" alt="Asset" />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
