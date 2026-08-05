Write-Host "===================================="
Write-Host " Saints Asset Studio - Setup Script"
Write-Host "===================================="

# 1. Check for Python
if (-Not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python is not installed or not in PATH." -ForegroundColor Red
    exit 1
}

# 2. Create Virtual Environment
if (-Not (Test-Path -Path ".venv")) {
    Write-Host "[INFO] Creating virtual environment (.venv)..." -ForegroundColor Cyan
    python -m venv .venv
} else {
    Write-Host "[INFO] Virtual environment (.venv) already exists." -ForegroundColor Green
}

# 3. Install Requirements
Write-Host "[INFO] Installing dependencies from requirements.txt..." -ForegroundColor Cyan
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# 4. Download Model Weights
Write-Host "[INFO] Pre-caching HuggingFace Model Weights (This may take a few minutes)..." -ForegroundColor Cyan
.\.venv\Scripts\python.exe download_model.py

Write-Host "===================================="
Write-Host " Setup Complete! Starting server..." -ForegroundColor Green
Write-Host "===================================="
.\.venv\Scripts\python.exe app.py
