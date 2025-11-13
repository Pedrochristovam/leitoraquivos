# 🚀 PROMPT COMPLETO PARA IMPLEMENTAÇÃO DO BACKEND

## 📋 CONTEXTO

O frontend já está implementado e funcionando. Agora é necessário implementar o backend que processa múltiplas planilhas Excel de contratos dos bancos BEMGE e MINAS CAIXA.

---

## 🔌 ENDPOINT A SER CRIADO

### `POST /processar_contratos/`

**Localização:** `app/routes/files.py` ou arquivo de rotas equivalente

**Parâmetros recebidos:**
- `bank_type` (Form, obrigatório): String com valor `"bemge"` ou `"minas_caixa"`
- `filter_type` (Form, obrigatório): String com valor `"auditado"`, `"nauditado"` ou `"todos"`
- `files` (UploadFile[], obrigatório): Múltiplos arquivos Excel (.xlsx)

**Resposta de Sucesso (200):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Body: Arquivo Excel consolidado (.xlsx) como blob
- Headers: `Content-Disposition: attachment; filename=3026_{BANK}_CONSOLIDADO.xlsx`

**Resposta de Erro (400/500):**
- Content-Type: `application/json`
- Body: `{"erro": "mensagem de erro"}`

---

## 📊 LÓGICA DE PROCESSAMENTO

### 1. ESTRUTURA DE PASTAS

Criar a seguinte estrutura ao processar:

```
arquivo_morto/
├── bemge/
│   ├── 3026-11 - BEMGE - 150 (CONTRATOS).xlsx
│   ├── 3026-12 - BEMGE - NAUD - 85 (CONTRATOS).xlsx
│   ├── 3026-12 - BEMGE - AUD - 65 (CONTRATOS).xlsx
│   └── 3026-15 - BEMGE - 200 (CONTRATOS).xlsx
├── minas_caixa/
│   ├── 3026-11 - MINAS CAIXA - 120 (CONTRATOS).xlsx
│   ├── 3026-12 - MINAS CAIXA - NAUD - 70 (CONTRATOS).xlsx
│   ├── 3026-12 - MINAS CAIXA - AUD - 50 (CONTRATOS).xlsx
│   └── 3026-15 - MINAS CAIXA - 180 (CONTRATOS).xlsx
└── 3026 - Filtragens/
    ├── bemge_movimentacao.xlsx
    └── minas_caixa_movimentacao.xlsx
```

---

### 2. PROCESSAMENTO POR TIPO DE ARQUIVO

#### **Arquivos 3026-11 e 3026-15**

**Passos:**
1. Ler o arquivo Excel
2. Contar total de linhas (total de contratos)
3. Filtrar por ordem de contratos (remover duplicados na coluna "CONTRATO")
4. Salvar arquivo processado com nome: `"3026-XX - {BANCO} - {TOTAL} (CONTRATOS).xlsx"`
   - Exemplo: `"3026-11 - BEMGE - 150 (CONTRATOS).xlsx"`
5. Adicionar coluna "BANCO" com o valor do banco
6. Retornar DataFrame processado para consolidação

**Código exemplo:**
```python
def processar_3026_11_15(df: pd.DataFrame, bank: str, filename: str):
    # Contar linhas
    total_antes = len(df)
    
    # Filtrar duplicados na coluna CONTRATO
    df_unique = df.drop_duplicates(subset=['CONTRATO'], keep='first')
    total_depois = len(df_unique)
    
    # Adicionar coluna de banco
    df_unique['BANCO'] = bank.upper()
    
    # Identificar número do arquivo
    numero = "11" if "3026-11" in filename else "15"
    banco_nome = "BEMGE" if bank == "bemge" else "MINAS CAIXA"
    
    # Salvar arquivo processado
    nome_arquivo = f"3026-{numero} - {banco_nome} - {total_depois} (CONTRATOS).xlsx"
    caminho = Path("arquivo_morto") / bank / nome_arquivo
    caminho.parent.mkdir(parents=True, exist_ok=True)
    df_unique.to_excel(caminho, index=False, engine='openpyxl')
    
    return df_unique
```

---

#### **Arquivo 3026-12 - Processamento AUD e NAUD**

Este arquivo deve ser processado **DUAS VEZES**: uma para AUD e outra para NAUD.

**Processamento NAUD (Não Auditado):**
1. Filtrar coluna "AUD" ou "AUDITADO" onde valor = "NAUD"
2. Deletar todas as outras linhas
3. Aplicar filtros nas colunas:
   - **DESTINO DE PAGAMENTO**
   - **DESTINO DE COMPLEMENTO**
4. Remover linhas que contêm: `"0x0"`, `"1x4"`, `"6x4"`, `"8x4"` em qualquer uma das duas colunas
5. Filtrar por coluna "CONTRATOS" (remover linhas vazias)
6. Contar total de contratos
7. Salvar como: `"3026-12 - {BANCO} - NAUD - {TOTAL} (CONTRATOS).xlsx"`
8. Adicionar coluna "BANCO" e "TIPO_AUDITADO" = "NAUD"

**Processamento AUD (Auditado):**
1. Filtrar coluna "AUD" ou "AUDITADO" onde valor = "AUD"
2. Deletar todas as outras linhas
3. Aplicar os mesmos filtros acima (DESTINO DE PAGAMENTO e DESTINO DE COMPLEMENTO)
4. Remover linhas com `"0x0"`, `"1x4"`, `"6x4"`, `"8x4"`
5. Filtrar por coluna "CONTRATOS"
6. Contar total de contratos
7. Salvar como: `"3026-12 - {BANCO} - AUD - {TOTAL} (CONTRATOS).xlsx"`
8. Adicionar coluna "BANCO" e "TIPO_AUDITADO" = "AUD"

**Código exemplo:**
```python
def processar_3026_12(df: pd.DataFrame, bank: str):
    # Normalizar coluna AUDITADO
    if 'AUD' in df.columns:
        df['AUDITADO'] = df['AUD']
    elif 'AUDITADO' not in df.columns:
        raise ValueError("Coluna AUD ou AUDITADO não encontrada")
    
    # Converter para string e normalizar
    df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
    
    # Separar AUD e NAUD
    df_aud = df[df['AUDITADO'] == 'AUD'].copy()
    df_naud = df[df['AUDITADO'] == 'NAUD'].copy()
    
    # Processar cada um
    df_aud_processado = aplicar_filtros_3026_12(df_aud, bank, 'AUD')
    df_naud_processado = aplicar_filtros_3026_12(df_naud, bank, 'NAUD')
    
    return df_aud_processado, df_naud_processado

def aplicar_filtros_3026_12(df: pd.DataFrame, bank: str, tipo: str):
    """Aplica filtros específicos para 3026-12"""
    if len(df) == 0:
        return df
    
    # Filtrar DESTINO DE PAGAMENTO e DESTINO DE COMPLEMENTO
    valores_remover = ['0x0', '1x4', '6x4', '8x4']
    
    if 'DESTINO DE PAGAMENTO' in df.columns:
        df = df[~df['DESTINO DE PAGAMENTO'].astype(str).isin(valores_remover)].copy()
    
    if 'DESTINO DE COMPLEMENTO' in df.columns:
        df = df[~df['DESTINO DE COMPLEMENTO'].astype(str).isin(valores_remover)].copy()
    
    # Filtrar por CONTRATOS (remover vazios)
    if 'CONTRATOS' in df.columns:
        df = df[df['CONTRATOS'].notna()].copy()
    
    # Adicionar colunas
    df['BANCO'] = "BEMGE" if bank == "bemge" else "MINAS CAIXA"
    df['TIPO_AUDITADO'] = tipo
    
    # Contar contratos
    total = len(df)
    
    # Salvar arquivo processado
    banco_nome = "BEMGE" if bank == "bemge" else "MINAS CAIXA"
    nome_arquivo = f"3026-12 - {banco_nome} - {tipo} - {total} (CONTRATOS).xlsx"
    caminho = Path("arquivo_morto") / bank / nome_arquivo
    caminho.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(caminho, index=False, engine='openpyxl')
    
    return df
```

---

### 3. CONSOLIDAÇÃO DE TODOS OS ARQUIVOS

Após processar todos os arquivos, criar uma planilha Excel consolidada com **4 abas**:

#### **Aba 1: "Resumo Geral"**
```python
resumo = pd.DataFrame({
    'Métrica': [
        'Total de Arquivos Processados',
        'Total de Contratos',
        'Contratos Auditados (AUD)',
        'Contratos Não Auditados (NAUD)',
        'Contratos Repetidos',
        'Valor Total'  # Se houver coluna VALOR
    ],
    'Valor': [
        total_arquivos,
        total_contratos,
        total_aud,
        total_naud,
        total_repetidos,
        valor_total
    ]
})
```

#### **Aba 2: "Contratos Totais"**
- Todas as linhas de todos os arquivos processados
- Colunas: todas as colunas originais + BANCO + TIPO_AUDITADO (se aplicável)

#### **Aba 3: "Contratos Repetidos"**
- Apenas contratos que aparecem mais de uma vez
- Identificar pela coluna "CONTRATO"
- Colunas: CONTRATO, BANCO, QUANTIDADE, VALOR (se disponível)

#### **Aba 4: "Contratos por Banco"**
- Agrupamento por banco
- Totais por banco

---

### 4. FILTROS DE MOVIMENTAÇÃO (OPCIONAL)

Após processar todos os arquivos:
1. Identificar coluna de "MOVIMENTAÇÃO" ou similar
2. Filtrar contratos que tiveram movimentação
3. Separar por banco
4. Salvar na pasta `"3026 - Filtragens"`:
   - `bemge_movimentacao.xlsx`
   - `minas_caixa_movimentacao.xlsx`

---

## 🐍 CÓDIGO COMPLETO DE EXEMPLO

```python
from fastapi import APIRouter, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from pathlib import Path
from typing import List

router = APIRouter()

@router.post("/processar_contratos/")
async def processar_contratos(
    bank_type: str = Form(...),
    filter_type: str = Form(...),
    files: List[UploadFile] = Form(...)
):
    """
    Processa múltiplos arquivos Excel de contratos 3026
    
    Args:
        bank_type: 'bemge' ou 'minas_caixa'
        files: Lista de arquivos Excel
    
    Returns:
        Arquivo Excel consolidado
    """
    
    # Validações
    if bank_type not in ["bemge", "minas_caixa"]:
        raise HTTPException(
            status_code=400,
            detail="bank_type deve ser 'bemge' ou 'minas_caixa'"
        )
    
    if filter_type not in ["auditado", "nauditado", "todos"]:
        raise HTTPException(
            status_code=400,
            detail="filter_type deve ser 'auditado', 'nauditado' ou 'todos'"
        )
    
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=400,
            detail="Pelo menos um arquivo deve ser enviado"
        )
    
    try:
        # Criar estrutura de pastas
        base_path = Path("arquivo_morto")
        bank_path = base_path / bank_type
        filtragens_path = base_path / "3026 - Filtragens"
        
        bank_path.mkdir(parents=True, exist_ok=True)
        filtragens_path.mkdir(parents=True, exist_ok=True)
        
        # Processar cada arquivo
        todos_contratos = []
        total_arquivos = 0
        
        for file in files:
            # Ler arquivo
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents), engine='openpyxl')
            
            # Normalizar nomes de colunas
            df.columns = [str(c).strip().upper() for c in df.columns]
            
            # Identificar tipo de arquivo pelo nome
            filename = file.filename.upper()
            
            if "3026-11" in filename or "3026-15" in filename:
                # Processar 3026-11 ou 3026-15
                df_processado = processar_3026_11_15(df, bank_type, filename)
                todos_contratos.append(df_processado)
                total_arquivos += 1
                
            elif "3026-12" in filename:
                # Processar 3026-12 (gera AUD e NAUD)
                df_aud, df_naud = processar_3026_12(df, bank_type, filter_type)
                # Aplicar filtro se necessário
                if filter_type == "auditado" and len(df_aud) > 0:
                    todos_contratos.append(df_aud)
                elif filter_type == "nauditado" and len(df_naud) > 0:
                    todos_contratos.append(df_naud)
                elif filter_type == "todos":
                    if len(df_aud) > 0:
                        todos_contratos.append(df_aud)
                    if len(df_naud) > 0:
                        todos_contratos.append(df_naud)
                total_arquivos += 1
        
        if len(todos_contratos) == 0:
            raise HTTPException(
                status_code=400,
                detail="Nenhum arquivo válido foi processado"
            )
        
        # Consolidar todos os contratos
        df_consolidado = pd.concat(todos_contratos, ignore_index=True)
        
        # Gerar estatísticas
        total_contratos = len(df_consolidado)
        
        # Contar AUD e NAUD
        if 'AUDITADO' in df_consolidado.columns:
            df_consolidado['AUDITADO'] = df_consolidado['AUDITADO'].astype(str).str.upper().str.strip()
            total_aud = len(df_consolidado[df_consolidado['AUDITADO'] == 'AUD'])
            total_naud = len(df_consolidado[df_consolidado['AUDITADO'] == 'NAUD'])
        else:
            total_aud = 0
            total_naud = 0
        
        # Contar repetidos
        total_repetidos = len(df_consolidado[df_consolidado.duplicated(subset=['CONTRATO'], keep=False)])
        
        # Calcular valor total (se houver coluna VALOR)
        valor_total = 0
        if 'VALOR' in df_consolidado.columns:
            try:
                df_consolidado['VALOR'] = pd.to_numeric(df_consolidado['VALOR'], errors='coerce')
                valor_total = df_consolidado['VALOR'].sum()
            except:
                valor_total = 0
        
        # Criar resumo
        resumo = pd.DataFrame({
            'Métrica': [
                'Total de Arquivos Processados',
                'Total de Contratos',
                'Contratos Auditados (AUD)',
                'Contratos Não Auditados (NAUD)',
                'Contratos Repetidos',
                'Valor Total'
            ],
            'Valor': [
                total_arquivos,
                total_contratos,
                total_aud,
                total_naud,
                total_repetidos,
                f"R$ {valor_total:,.2f}" if valor_total > 0 else "N/A"
            ]
        })
        
        # Contratos repetidos
        df_repetidos = df_consolidado[df_consolidado.duplicated(subset=['CONTRATO'], keep=False)].copy()
        if len(df_repetidos) > 0:
            df_repetidos['QUANTIDADE'] = df_repetidos.groupby('CONTRATO')['CONTRATO'].transform('count')
        
        # Por banco
        df_por_banco = df_consolidado.groupby('BANCO').agg({
            'CONTRATO': 'count'
        }).reset_index()
        df_por_banco.columns = ['BANCO', 'TOTAL_CONTRATOS']
        
        # Criar planilha Excel consolidada
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Aba 1: Resumo
            resumo.to_excel(writer, sheet_name='Resumo Geral', index=False)
            
            # Aba 2: Contratos Totais
            df_consolidado.to_excel(writer, sheet_name='Contratos Totais', index=False)
            
            # Aba 3: Contratos Repetidos
            if len(df_repetidos) > 0:
                df_repetidos.to_excel(writer, sheet_name='Contratos Repetidos', index=False)
            else:
                pd.DataFrame({'Mensagem': ['Nenhum contrato repetido encontrado']}).to_excel(
                    writer, sheet_name='Contratos Repetidos', index=False
                )
            
            # Aba 4: Por Banco
            df_por_banco.to_excel(writer, sheet_name='Contratos por Banco', index=False)
        
        output.seek(0)
        excel_data = output.read()
        output.close()
        
        # Retornar arquivo
        banco_nome = "BEMGE" if bank_type == "bemge" else "MINAS_CAIXA"
        return StreamingResponse(
            io.BytesIO(excel_data),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=3026_{banco_nome}_CONSOLIDADO.xlsx"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar arquivos: {str(e)}"
        )


def processar_3026_11_15(df: pd.DataFrame, bank: str, filename: str):
    """Processa arquivos 3026-11 e 3026-15"""
    # Verificar se coluna CONTRATO existe
    if 'CONTRATO' not in df.columns:
        raise ValueError("Coluna 'CONTRATO' não encontrada no arquivo")
    
    # Filtrar duplicados
    df_unique = df.drop_duplicates(subset=['CONTRATO'], keep='first')
    total = len(df_unique)
    
    # Adicionar coluna de banco
    banco_nome = "BEMGE" if bank == "bemge" else "MINAS CAIXA"
    df_unique['BANCO'] = banco_nome
    
    # Identificar número do arquivo
    numero = "11" if "3026-11" in filename.upper() else "15"
    
    # Salvar arquivo processado
    nome_arquivo = f"3026-{numero} - {banco_nome} - {total} (CONTRATOS).xlsx"
    caminho = Path("arquivo_morto") / bank / nome_arquivo
    caminho.parent.mkdir(parents=True, exist_ok=True)
    df_unique.to_excel(caminho, index=False, engine='openpyxl')
    
    return df_unique


def processar_3026_12(df: pd.DataFrame, bank: str):
    """Processa arquivo 3026-12 (gera AUD e NAUD)"""
    # Normalizar coluna AUDITADO
    if 'AUD' in df.columns:
        df['AUDITADO'] = df['AUD']
    elif 'AUDITADO' not in df.columns:
        raise ValueError("Coluna AUD ou AUDITADO não encontrada")
    
    # Converter para string e normalizar
    df['AUDITADO'] = df['AUDITADO'].astype(str).str.upper().str.strip()
    
    # Separar AUD e NAUD
    df_aud = df[df['AUDITADO'] == 'AUD'].copy()
    df_naud = df[df['AUDITADO'] == 'NAUD'].copy()
    
    # Processar cada um
    df_aud_processado = aplicar_filtros_3026_12(df_aud, bank, 'AUD') if len(df_aud) > 0 else pd.DataFrame()
    df_naud_processado = aplicar_filtros_3026_12(df_naud, bank, 'NAUD') if len(df_naud) > 0 else pd.DataFrame()
    
    return df_aud_processado, df_naud_processado


def aplicar_filtros_3026_12(df: pd.DataFrame, bank: str, tipo: str):
    """Aplica filtros específicos para 3026-12"""
    if len(df) == 0:
        return df
    
    # Valores a remover
    valores_remover = ['0x0', '1x4', '6x4', '8x4']
    
    # Filtrar DESTINO DE PAGAMENTO
    if 'DESTINO DE PAGAMENTO' in df.columns:
        df = df[~df['DESTINO DE PAGAMENTO'].astype(str).isin(valores_remover)].copy()
    
    # Filtrar DESTINO DE COMPLEMENTO
    if 'DESTINO DE COMPLEMENTO' in df.columns:
        df = df[~df['DESTINO DE COMPLEMENTO'].astype(str).isin(valores_remover)].copy()
    
    # Filtrar por CONTRATOS (remover vazios)
    if 'CONTRATOS' in df.columns:
        df = df[df['CONTRATOS'].notna()].copy()
    
    # Adicionar colunas
    banco_nome = "BEMGE" if bank == "bemge" else "MINAS CAIXA"
    df['BANCO'] = banco_nome
    df['TIPO_AUDITADO'] = tipo
    
    # Contar contratos
    total = len(df)
    
    # Salvar arquivo processado
    nome_arquivo = f"3026-12 - {banco_nome} - {tipo} - {total} (CONTRATOS).xlsx"
    caminho = Path("arquivo_morto") / bank / nome_arquivo
    caminho.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(caminho, index=False, engine='openpyxl')
    
    return df
```

---

## ✅ VALIDAÇÕES NECESSÁRIAS

1. ✅ Verificar se `bank_type` é "bemge" ou "minas_caixa"
2. ✅ Verificar se pelo menos um arquivo foi enviado
3. ✅ Verificar se os arquivos são Excel válidos
4. ✅ Verificar se as colunas necessárias existem:
   - CONTRATO (obrigatória para todos)
   - AUD ou AUDITADO (obrigatória para 3026-12)
   - DESTINO DE PAGAMENTO (opcional, para 3026-12)
   - DESTINO DE COMPLEMENTO (opcional, para 3026-12)

---

## 🚨 TRATAMENTO DE ERROS

- **400 Bad Request**: 
  - Banco inválido
  - Nenhum arquivo enviado
  - Colunas obrigatórias não encontradas
  
- **500 Internal Server Error**: 
  - Erro no processamento (com mensagem detalhada)
  - Erro ao salvar arquivos
  - Erro ao gerar planilha consolidada

---

## 📝 NOTAS IMPORTANTES

1. O sistema deve processar **múltiplos arquivos** de uma vez
2. Cada arquivo deve ser processado conforme seu tipo (identificado pelo nome)
3. Todos os arquivos processados devem ser **salvos** na pasta correspondente
4. A planilha consolidada deve ser **retornada como resposta** (StreamingResponse)
5. Usar `engine='openpyxl'` ao salvar arquivos Excel
6. Normalizar nomes de colunas para maiúsculas e remover espaços

---

## 🔗 INTEGRAÇÃO COM O FRONTEND

O frontend já está enviando:
- `bank_type`: "bemge" ou "minas_caixa"
- `files`: Array de arquivos Excel

O frontend espera receber:
- Arquivo Excel (.xlsx) com 4 abas conforme descrito acima

---

**IMPORTANTE:** Este endpoint deve substituir ou complementar o endpoint `/processar/` existente, dependendo da estrutura atual do backend.

