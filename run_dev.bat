@echo off
echo Starting Saints Asset Studio Development Environment...

:: Start the Python backend in a new command window
echo Starting Backend...
if exist ".venv_cuda\Scripts\python.exe" (
    start "Backend Server" cmd /k ".\.venv_cuda\Scripts\python.exe app.py"
) else (
    start "Backend Server" cmd /k ".\.venv\Scripts\python.exe app.py"
)

:: Start the Vite React frontend in a new command window
echo Starting Frontend...
cd ui
start "Frontend UI" cmd /k "npm run dev"
cd ..

echo Development environment is starting.
echo You can access the UI at http://localhost:5173 once Vite is ready.
