from fastapi import FastAPI, UploadFile, Form, Request
from fastapi.responses import FileResponse, HTMLResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path
from processar_contratos import processar_excel

app = FastAPI()

# Configura pastas - serve o build do React
# IMPORTANTE: Os mounts devem ser definidos ANTES das rotas
dist_path = Path("dist")

# Serve arquivos estáticos do build do React (JS, CSS, imagens, etc)
if dist_path.exists():
    # Serve assets do Vite (JS, CSS compilados)
    assets_path = dist_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

# Rota da API - deve vir ANTES da rota catch-all
@app.post("/upload/")
async def upload(file: UploadFile, tipo: str = Form(...)):
    # Garante que a pasta de uploads existe
    os.makedirs("uploads", exist_ok=True)
    caminho_temp = os.path.join("uploads", file.filename)

    # Salva o arquivo temporariamente
    with open(caminho_temp, "wb") as f:
        f.write(await file.read())

    # Processa o Excel
    resultado, erro = processar_excel(caminho_temp, tipo)

    if erro:
        return {"erro": erro}

    # Verifica se o arquivo foi criado corretamente
    if not resultado or not os.path.exists(resultado):
        return {"erro": "Erro ao gerar arquivo Excel"}

    # Retorna o arquivo Excel processado pro download
    # Usa modo binário para garantir que o arquivo não seja corrompido
    def iterfile():
        with open(resultado, mode="rb") as file_like:
            yield from file_like
    
    return StreamingResponse(
        iterfile(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{os.path.basename(resultado)}"'
        }
    )

# Rota para servir o index.html do React
# Deve vir DEPOIS das rotas da API e dos mounts estáticos
@app.get("/")
async def serve_react_root():
    index_path = dist_path / "index.html"
    if index_path.exists():
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return Response(status_code=404, content="React build not found. Please run 'npm run build' first.")

# Rota catch-all para servir o React SPA (Single Page Application)
# Qualquer rota que não seja /upload/ ou /assets/ serve o index.html do React
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    # Ignora rotas da API
    if full_path.startswith("upload") or full_path.startswith("api"):
        return Response(status_code=404)
    
    # Ignora arquivos estáticos (já são servidos pelos mounts acima)
    if full_path.startswith("assets/"):
        return Response(status_code=404)
    
    # Serve o index.html do React para todas as outras rotas
    index_path = dist_path / "index.html"
    if index_path.exists():
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    
    return Response(status_code=404, content="React build not found. Please run 'npm run build' first.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
