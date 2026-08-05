# Saints Asset Studio

**Saints Asset Studio** is the internal asset production pipeline used to generate, validate, organize, and export creatures and game assets for **[Saints Online](https://saintsgaming.net)**. 

It focuses on consistent multi-stage creature evolution, structured metadata, and game-ready asset production using an advanced React UI and local HuggingFace ML pipelines.

---

## 🛠 The Ecosystem

Building an MMO requires more than just a game engine—it requires infrastructure. Saints Asset Studio is part of the broader Saints development ecosystem:
- **[Saints Online](https://saintsgaming.net)**: The core MMO game client and server.
- **Saints Studio**: Custom world-building and data mapping tools.
- **Saints Asset Studio**: The automated AI-assisted pipeline handling repetitive creative workflows.

## 🚀 Core Features

This is a purpose-built workflow tool designed to enforce consistency and automatically output production-ready game files:

- **Structured Generation System**: Generate Image, Audio, and Quests using strict forms and parameters rather than free-form prompting.
- **Advanced Model Configurations**: Tweak Hyper-parameters directly from the UI (CFG Scale, Inference Steps, Temperature, Max Tokens, etc.).
- **Lifecycle Evolution**: A single generation job outputs a biologically cohesive 3-stage lifecycle (Baby → Adult → Elder).
- **Engine-Compliant Export**: Automatically strips backgrounds, crops to exact transparency bounds, and rescales exports to strict engine specifications.
- **Quest JSON Exporter**: Export generated lore directly into structured `.json` files.
- **Audio Normalization**: BGM and Voice lines are dynamically calculated and normalized to `-14 LUFS` via `pydub`.
- **Background Rendering Queue**: A non-blocking Web UI with live loading skeletons allows artists/devs to rapidly queue dozens of generation jobs while monitoring live rendering status and terminal logs.
- **Bestiary Library Manager**: A built-in graphical interface to organize, filter by rarity/element, and bulk-delete rejected assets from the filesystem.

## ⚙️ Installation & Setup

We provide a separated modern architecture: a React + Vite Frontend and a Flask + PyTorch Backend.

### Prerequisites
- **Python 3.10+**
- **Node.js** (v18+)
- **Nvidia GPU** (Recommended 8GB+ VRAM)
- CUDA Toolkit 11.8+ (for PyTorch acceleration)

### 1. Backend Setup (Windows PowerShell)
```powershell
# Create the virtual environment and install dependencies
.\setup.ps1

# Start the Flask Backend (runs on port 5000)
.\.venv_cuda\Scripts\python.exe app.py
```

### 2. Frontend Setup (Vite / React)
Open a new terminal window for the frontend.
```powershell
cd ui
npm install
npm run dev
```

### 3. Launch
Open your browser to the local Vite URL (typically `http://localhost:5173`).
The first time you generate assets, the required HuggingFace models will be downloaded and cached automatically.

## 🏗 Technical Stack
- **Frontend:** React, Vite, TailwindCSS + DaisyUI (Glassmorphism & Neon Themes)
- **Backend:** Python `Flask` with `threading`, `queue`, and global subprocess log capturing
- **AI Core Models:** 
  - **Sprites:** `Onodofthenorth/SD_PixelArt_SpriteSheet_Generator` (Maintains 16-bit mathematically aligned grids)
  - **Audio/Voice:** `hexgrad/Kokoro-82M` (Native CPU-friendly lightweight TTS)
  - **Quests/Lore:** `microsoft/Phi-4-mini` (3.8B LLM optimized for structured JSON and reasoning)
- **Post-Processing Pipeline:** `rembg` (U-2-Net), `Pillow` (Lanczos resampling), `pydub` (Audio Normalization)

## ⚖️ Attribution & Licensing

This project is licensed under the **GNU General Public License v3 (GPLv3)**. 

### Tuxemon Attribution
Certain structural templates and placeholder images used in the Asset Library UI and Image Generation Pipeline are sourced from **[Tuxemon](https://github.com/Tuxemon/Tuxemon)**, an open-source monster capture RPG. 
These images are used strictly as structural and layout references for our Image-to-Image ML pipeline because their open-source pixel art style fits our technical needs. Tuxemon is not the goal or final product of this pipeline.

In accordance with their licensing, this project adheres to the GPLv3 license.
