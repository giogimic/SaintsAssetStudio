# Saints Asset Studio

**Saints Asset Studio** is the internal asset production pipeline used to generate, validate, organize, and export creatures and game assets for [Saints Online](https://github.com/your-profile/saints-online). 

It focuses on consistent multi-stage creature evolution, structured metadata, and game-ready asset production rather than general-purpose image generation.

---

## 🛠 The Ecosystem

Building an MMO requires more than just a game engine—it requires infrastructure. Saints Asset Studio is part of the broader Saints development ecosystem:
- **Saints Online**: The core MMO game client and server.
- **Saints Editor**: Custom world-building and data mapping tools.
- **Saints Asset Studio**: The automated pipeline handling repetitive creative workflows.

## 🚀 Core Features

This is not a simple wrapper around Stable Diffusion. It is a purpose-built workflow tool designed to enforce consistency and automatically output production-ready files:

- **Structured Genome System**: Creatures are defined by a JSON-based "Genome" (combining Elemental Typing, Temperament, and Rarity) rather than free-form prompting, eliminating style drift.
- **Lifecycle Evolution**: A single generation job outputs a biologically cohesive 3-stage lifecycle (Baby → Adult → Elder).
- **Engine-Compliant Export**: Automatically strips backgrounds, crops to exact transparency bounds, and rescales exports to strict Babylon.js engine specifications:
  - `public/game-assets/creatures/*-ow.png` (96px height Overworld Billboard)
  - `public/game-assets/monster/battle/*-sheet.png` (1024x1024 Battle UI Sheet)
- **Background Rendering Queue**: A non-blocking Web UI allows artists/devs to rapidly queue dozens of generation jobs while monitoring live rendering status.
- **Bestiary Library Manager**: A built-in graphical interface to organize, review, and instantly prune rejected assets from the filesystem.

## ⚙️ Installation & Setup

We provide an automated setup script that builds the virtual environment, installs the pipeline dependencies, and downloads the required AI models.

### Prerequisites
- **Python 3.10+**
- **Nvidia GPU** (Recommended 8GB+ VRAM)
- CUDA Toolkit (for PyTorch `cu118` acceleration)

### Windows Quickstart (PowerShell)

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/saints-asset-studio.git
   cd saints-asset-studio
   ```
2. Run the setup script:
   ```powershell
   .\setup.ps1
   ```
3. Open your browser to `http://localhost:5000`

> **Note:** The first time `setup.ps1` runs, it will pre-cache several gigabytes of model weights from the HuggingFace Hub to ensure the Web UI remains highly responsive.

## 🏗 Technical Stack
- **Frontend:** HTML5, CSS (Glassmorphism), Vanilla JS (Live Polling)
- **Backend:** Python `Flask` with `threading` and `queue` management
- **AI Core:** `diffusers`, `transformers`, `torch`
- **Post-Processing Pipeline:** `rembg` (U-2-Net), `Pillow` (Lanczos resampling)
