import pandas as pd
import os

def processar_excel(caminho_arquivo, tipo_filtro):
    try:
        # Lê o Excel completo
        df = pd.read_excel(caminho_arquivo)

        # Normaliza os nomes das colunas
        df.columns = [c.strip().upper() for c in df.columns]

        # Verifica se a coluna AUDITADO existe
        if "AUDITADO" not in df.columns:
            return None, "Coluna 'AUDITADO' não encontrada no arquivo."
        if "CONTRATO" not in df.columns:
            return None, "Coluna 'CONTRATO' não encontrada no arquivo."

        # Aplica o filtro conforme escolha
        if tipo_filtro == "auditado":
            df = df[df["AUDITADO"].astype(str).str.upper() == "AUDI"]
        elif tipo_filtro == "nauditado":
            df = df[df["AUDITADO"].astype(str).str.upper() == "NAUD"]

        # Mesmo que o filtro não retorne nada, força o dataframe existir
        if df.empty:
            df = pd.DataFrame(columns=["CONTRATO", "AUDITADO"])

        # Marca duplicados
        df["CONTRATO_REPETIDO"] = df.duplicated(subset=["CONTRATO"], keep=False)

        # Totais
        total_reais = df["CONTRATO"].nunique()
        total_repetidos = df[df["CONTRATO_REPETIDO"]].shape[0]

        # Cria o resumo
        resumo = pd.DataFrame({
            "CONTRATO": [""],
            "TOTAL_CONTRATOS_REAIS": [total_reais],
            "TOTAL_CONTRATOS_REPETIDOS": [total_repetidos]
        })

        # Junta e garante que colunas apareçam
        for col in resumo.columns:
            if col not in df.columns:
                df[col] = ""

        resultado_final = pd.concat([df, resumo], ignore_index=True)

        # Garante que a pasta static existe
        os.makedirs("static", exist_ok=True)

        # Salva o resultado final com engine openpyxl para garantir compatibilidade
        nome_saida = f"resultado_{tipo_filtro}.xlsx"
        caminho_saida = os.path.join("static", nome_saida)
        
        # Salva o arquivo Excel usando openpyxl explicitamente
        with pd.ExcelWriter(caminho_saida, engine='openpyxl') as writer:
            resultado_final.to_excel(writer, index=False, sheet_name='Sheet1')
        
        # Verifica se o arquivo foi criado corretamente
        if not os.path.exists(caminho_saida):
            return None, "Erro ao salvar arquivo Excel"
        
        # Verifica se o arquivo tem tamanho válido (não está vazio)
        if os.path.getsize(caminho_saida) == 0:
            return None, "Arquivo Excel gerado está vazio"

        return caminho_saida, None

    except Exception as e:
        return None, str(e)
