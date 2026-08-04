@echo off
echo Starting OpportunityAgent Multi-Agent Platform...
echo =======================================================
start "OpportunityAgent Backend" cmd /k "cd /d %~dp0\backend && uvicorn app.main:app --reload --port 8000"
start "OpportunityAgent Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"
echo Backend running on http://localhost:8000
echo Frontend running on http://localhost:5173
