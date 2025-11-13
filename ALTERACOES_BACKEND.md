# 🔧 ALTERAÇÕES NECESSÁRIAS NO BACKEND

## 📋 RESUMO

O frontend agora envia:
- `bank_type`: "bemge" ou "minas_caixa"
- `filter_type`: "auditado", "nauditado" ou "todos"
- `files`: Múltiplos arquivos Excel

O backend precisa aceitar esses parâmetros e processar corretamente.

---

## ✅ O QUE PRECISA SER ALTERADO

### 1. **ADICIONAR NOVO ENDPOINT** (ou modificar o existente)

**Opção A: Criar novo endpoint `/processar_contratos/`**

```python
@router.post("/processar_contratos/")
async def processar_contratos(
    bank_type: str = Form(...),
    filter_type: str = Form(...),
    files: List[UploadFile] = Form(...)
):
    # Implementação aqui
```

**Opção B: Modificar endpoint existente `/upload/` para aceitar múltiplos arquivos**

```python
@router.post("/upload/")
async def upload(
    file: UploadFile = None,
    files: List[UploadFile] = Form(None),  # NOVO
    tipo: str = Form(None),  # Manter para compatibilidade
    bank_type: str = Form(None),  # NOVO
    filter_type: str = Form(None)  # NOVO
):
    # Aceitar tanto file (antigo) quanto files (novo)
    if files:
        # Processar múltiplos arquivos
    elif file:
        # Processar arquivo único (compatibilidade)
```

---

### 2. **VALIDAÇÕES NECESSÁRIAS**

Adicionar validações no endpoint:

```python
# Validar bank_type
if bank_type and bank_type not in ["bemge", "minas_caixa"]:
    raise HTTPException(
        status_code=400,
        detail="bank_type deve ser 'bemge' ou 'minas_caixa'"
    )

# Validar filter_type
if filter_type and filter_type not in ["auditado", "nauditado", "todos"]:
    raise HTTPException(
        status_code=400,
        detail="filter_type deve ser 'auditado', 'nauditado' ou 'todos'"
    )

# Validar arquivos
arquivos = files if files else ([file] if file else [])
if not arquivos or len(arquivos) == 0:
    raise HTTPException(
        status_code=400,
        detail="Pelo menos um arquivo deve ser enviado"
    )
```

---

### 3. **PROCESSAR MÚLTIPLOS ARQUIVOS**

O código atual provavelmente processa apenas 1 arquivo. Precisa ser alterado para processar múltiplos:

**ANTES (processa 1 arquivo):**
```python
file: UploadFile
contents = await file.read()
df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
# processar...
```

**DEPOIS (processa múltiplos arquivos):**
```python
files: List[UploadFile]
todos_contratos = []

for file in files:
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
    
    # Identificar tipo de arquivo pelo nome
    filename = file.filename.upper()
    
    if "3026-11" in filename or "3026-15" in filename:
        df_processado = processar_3026_11_15(df, bank_type, filename)
        todos_contratos.append(df_processado)
    elif "3026-12" in filename:
        df_aud, df_naud = processar_3026_12(df, bank_type, filter_type)
        # Aplicar filtro
        if filter_type == "auditado":
            todos_contratos.append(df_aud)
        elif filter_type == "nauditado":
            todos_contratos.append(df_naud)
        else:  # todos
            todos_contratos.extend([df_aud, df_naud])

# Consolidar todos
df_consolidado = pd.concat(todos_contratos, ignore_index=True)
```

---

### 4. **APLICAR FILTRO DE AUDITADO/NÃO AUDITADO**

Quando `filter_type` for "auditado" ou "nauditado", filtrar os resultados:

```python
# Após processar todos os arquivos
if filter_type and filter_type != "todos":
    if 'AUDITADO' in df_consolidado.columns:
        df_consolidado['AUDITADO'] = df_consolidado['AUDITADO'].astype(str).str.upper().str.strip()
        
        if filter_type == "auditado":
            df_consolidado = df_consolidado[df_consolidado['AUDITADO'] == 'AUD'].copy()
        elif filter_type == "nauditado":
            df_consolidado = df_consolidado[df_consolidado['AUDITADO'] == 'NAUD'].copy()
```

---

### 5. **CRIAR ESTRUTURA DE PASTAS**

Criar pastas para salvar arquivos processados:

```python
from pathlib import Path

# Criar estrutura de pastas
base_path = Path("arquivo_morto")
bank_path = base_path / (bank_type or "geral")
filtragens_path = base_path / "3026 - Filtragens"

bank_path.mkdir(parents=True, exist_ok=True)
filtragens_path.mkdir(parents=True, exist_ok=True)
```

---

### 6. **RETORNAR ARQUIVO EXCEL CONSOLIDADO**

O backend deve retornar um arquivo Excel com múltiplas abas:

```python
from fastapi.responses import StreamingResponse
import io

# Criar planilha consolidada
output = io.BytesIO()

with pd.ExcelWriter(output, engine='openpyxl') as writer:
    # Aba 1: Resumo
    resumo.to_excel(writer, sheet_name='Resumo Geral', index=False)
    
    # Aba 2: Contratos Totais
    df_consolidado.to_excel(writer, sheet_name='Contratos Totais', index=False)
    
    # Aba 3: Contratos Repetidos
    df_repetidos = df_consolidado[df_consolidado.duplicated(subset=['CONTRATO'], keep=False)]
    df_repetidos.to_excel(writer, sheet_name='Contratos Repetidos', index=False)
    
    # Aba 4: Por Banco
    df_por_banco = df_consolidado.groupby('BANCO').agg({
        'CONTRATO': 'count'
    }).reset_index()
    df_por_banco.to_excel(writer, sheet_name='Contratos por Banco', index=False)

output.seek(0)
excel_data = output.read()
output.close()

return StreamingResponse(
    io.BytesIO(excel_data),
    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    headers={
        "Content-Disposition": f"attachment; filename=3026_{bank_type.upper()}_CONSOLIDADO.xlsx"
    }
)
```

---

### 7. **CONFIGURAR CORS** (se ainda não estiver)

Garantir que o CORS está configurado para aceitar requisições do frontend:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📝 EXEMPLO COMPLETO DE ENDPOINT

```python
from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from pathlib import Path
from typing import List, Optional

router = APIRouter()

@router.post("/processar_contratos/")
async def processar_contratos(
    bank_type: str = Form(...),
    filter_type: str = Form(...),
    files: List[UploadFile] = Form(...)
):
    # Validações
    if bank_type not in ["bemge", "minas_caixa"]:
        raise HTTPException(400, "bank_type deve ser 'bemge' ou 'minas_caixa'")
    
    if filter_type not in ["auditado", "nauditado", "todos"]:
        raise HTTPException(400, "filter_type deve ser 'auditado', 'nauditado' ou 'todos'")
    
    if not files:
        raise HTTPException(400, "Pelo menos um arquivo deve ser enviado")
    
    try:
        # Criar pastas
        base_path = Path("arquivo_morto")
        bank_path = base_path / bank_type
        bank_path.mkdir(parents=True, exist_ok=True)
        
        # Processar cada arquivo
        todos_contratos = []
        
        for file in files:
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
            
            # Normalizar colunas
            df.columns = [str(c).strip().upper() for c in df.columns]
            
            filename = file.filename.upper()
            
            # Processar conforme tipo
            if "3026-11" in filename or "3026-15" in filename:
                df_processado = processar_3026_11_15(df, bank_type, filename)
                todos_contratos.append(df_processado)
            elif "3026-12" in filename:
                df_aud, df_naud = processar_3026_12(df, bank_type, filter_type)
                if filter_type == "auditado":
                    todos_contratos.append(df_aud)
                elif filter_type == "nauditado":
                    todos_contratos.append(df_naud)
                else:
                    todos_contratos.extend([df_aud, df_naud])
        
        if not todos_contratos:
            raise HTTPException(400, "Nenhum arquivo válido foi processado")
        
        # Consolidar
        df_consolidado = pd.concat(todos_contratos, ignore_index=True)
        
        # Aplicar filtro global se necessário
        if filter_type != "todos" and 'AUDITADO' in df_consolidado.columns:
            df_consolidado['AUDITADO'] = df_consolidado['AUDITADO'].astype(str).str.upper().str.strip()
            if filter_type == "auditado":
                df_consolidado = df_consolidado[df_consolidado['AUDITADO'] == 'AUD'].copy()
            elif filter_type == "nauditado":
                df_consolidado = df_consolidado[df_consolidado['AUDITADO'] == 'NAUD'].copy()
        
        # Gerar resumo e planilha consolidada
        # ... (código de geração da planilha acima)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Erro ao processar: {str(e)}")
```

---

## 🔄 COMPATIBILIDADE COM CÓDIGO ANTIGO

Se quiser manter compatibilidade com o endpoint antigo `/upload/`:

```python
@router.post("/upload/")
async def upload(
    file: Optional[UploadFile] = None,
    files: Optional[List[UploadFile]] = Form(None),
    tipo: Optional[str] = Form(None),
    bank_type: Optional[str] = Form(None),
    filter_type: Optional[str] = Form(None)
):
    # Se receber files (novo formato), usar novo processamento
    if files:
        return await processar_contratos(bank_type or "bemge", filter_type or tipo or "todos", files)
    
    # Se receber file (formato antigo), manter compatibilidade
    if file:
        formData = new FormData()
        formData.append('file', file)
        formData.append('tipo', tipo or 'auditado')
        # Processar arquivo único...
```

---

## ✅ CHECKLIST DE ALTERAÇÕES

- [ ] Adicionar parâmetro `bank_type` no endpoint
- [ ] Adicionar parâmetro `filter_type` no endpoint
- [ ] Adicionar parâmetro `files` (List[UploadFile]) no endpoint
- [ ] Validar `bank_type` (bemge ou minas_caixa)
- [ ] Validar `filter_type` (auditado, nauditado ou todos)
- [ ] Modificar código para processar múltiplos arquivos
- [ ] Aplicar filtro de auditado/não auditado quando necessário
- [ ] Criar estrutura de pastas `arquivo_morto/`
- [ ] Salvar arquivos processados nas pastas corretas
- [ ] Gerar planilha consolidada com múltiplas abas
- [ ] Retornar arquivo Excel como StreamingResponse
- [ ] Configurar CORS corretamente
- [ ] Testar com múltiplos arquivos
- [ ] Testar com diferentes filtros

---

## 🚨 IMPORTANTE

1. **CORS**: Certifique-se de que o CORS está configurado para aceitar requisições do frontend
2. **Engine OpenPyXL**: Sempre use `engine='openpyxl'` ao salvar arquivos Excel
3. **StreamingResponse**: Use StreamingResponse em modo binário para retornar arquivos
4. **Validações**: Valide todos os parâmetros antes de processar
5. **Tratamento de Erros**: Retorne mensagens de erro claras usando HTTPException

---

**Data:** Hoje  
**Status:** Aguardando implementação

