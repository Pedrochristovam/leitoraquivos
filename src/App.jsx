import React, { useState } from 'react'
import FileUpload from './components/FileUpload'
import FilterSelector from './components/FilterSelector'
import ProcessButton from './components/ProcessButton'
import StatusIndicator from './components/StatusIndicator'
import HistoryPanel from './components/HistoryPanel'
import './App.css'

const API_URL = "https://leitorback-2.onrender.com"

function App() {
  const [file, setFile] = useState(null)
  const [filterType, setFilterType] = useState('auditado')
  const [status, setStatus] = useState('idle') // idle, uploading, processing, success, error
  const [errorMessage, setErrorMessage] = useState('')
  const [history, setHistory] = useState([])
  const [resultData, setResultData] = useState(null) // Para armazenar os resultados do processamento

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile)
    setStatus('idle')
    setErrorMessage('')
    setResultData(null)
  }

  const handleFilterChange = (filter) => {
    setFilterType(filter)
  }

  const handleProcess = async () => {
    if (!file) {
      setErrorMessage('Por favor, selecione um arquivo')
      return
    }

    setStatus('uploading')
    setErrorMessage('')
    setResultData(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      setStatus('processing')
      
      // Cria um AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutos de timeout
      
      const response = await fetch(`${API_URL}/processar/`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
        // NÃO definir Content-Type manualmente - o browser faz isso automaticamente
      })
      
      clearTimeout(timeoutId)

      // Verifica se houve erro HTTP
      if (!response.ok) {
        // Backend retorna JSON quando há erro
        try {
          const errorData = await response.json()
          throw new Error(errorData.detail || errorData.erro || 'Erro ao processar arquivo')
        } catch (jsonError) {
          // Se não conseguir ler como JSON, lança erro genérico
          if (jsonError instanceof Error && jsonError.message) {
            throw jsonError
          }
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }
      }

      // Backend retorna JSON com os resultados
      const result = await response.json()
      
      // Verifica se há erro na resposta
      if (result.erro) {
        throw new Error(result.erro)
      }

      // Armazena os resultados
      setResultData(result)
      setStatus('success')

      // Adiciona ao histórico
      const historyItem = {
        id: Date.now(),
        filename: file.name,
        filterType: filterType,
        date: new Date().toLocaleString('pt-BR'),
        status: 'success',
        result: result
      }
      setHistory([historyItem, ...history])
      
    } catch (error) {
      setStatus('error')
      
      // Trata diferentes tipos de erro
      if (error.name === 'AbortError') {
        setErrorMessage('Tempo de processamento excedido. O arquivo pode ser muito grande ou o servidor está lento.')
      } else if (error.message) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Erro ao processar arquivo. Verifique sua conexão com a internet e se o servidor está online.')
      }
      
      // Adiciona ao histórico com erro
      const historyItem = {
        id: Date.now(),
        filename: file?.name || 'Arquivo desconhecido',
        filterType: filterType,
        date: new Date().toLocaleString('pt-BR'),
        status: 'error'
      }
      setHistory([historyItem, ...history])
    }
  }


  React.useEffect(() => {
    // Define tema claro como padrão permanente
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  return (
    <div className="app-container">
      
      <div className="main-card">
        <div className="header">
          <h1 className="title">
            <span className="title-icon">📊</span>
            Sistema de Contratos 3026
          </h1>
          <p className="subtitle">Processe e filtre planilhas de contratos de forma eficiente</p>
        </div>

        <div className="content">
          <FileUpload 
            file={file} 
            onFileSelect={handleFileSelect}
            disabled={status === 'uploading' || status === 'processing'}
          />

          <FilterSelector 
            value={filterType} 
            onChange={handleFilterChange}
            disabled={status === 'uploading' || status === 'processing'}
          />

          <ProcessButton 
            onClick={handleProcess}
            disabled={!file || status === 'uploading' || status === 'processing'}
            status={status}
          />

          <StatusIndicator 
            status={status}
            errorMessage={errorMessage}
          />

          {status === 'success' && resultData && (
            <div className="result-display">
              <h3>Resultado do Processamento</h3>
              <div className="result-info">
                <p><strong>Total de Linhas:</strong> {resultData.total_linhas || resultData.totalLinhas || 'N/A'}</p>
                {resultData.total_colunas && (
                  <p><strong>Total de Colunas:</strong> {resultData.total_colunas || resultData.totalColunas || 'N/A'}</p>
                )}
                {resultData.total_contratos && (
                  <p><strong>Total de Contratos:</strong> {resultData.total_contratos || resultData.totalContratos || 'N/A'}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <HistoryPanel history={history} />
      )}

      <footer className="footer">
        <p>© 2024 Sistema de Contratos 3026 - Desenvolvido com React</p>
      </footer>
    </div>
  )
}

export default App

