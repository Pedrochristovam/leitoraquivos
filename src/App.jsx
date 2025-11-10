import React, { useState } from 'react'
import FileUpload from './components/FileUpload'
import FilterSelector from './components/FilterSelector'
import ProcessButton from './components/ProcessButton'
import StatusIndicator from './components/StatusIndicator'
import DownloadButton from './components/DownloadButton'
import HistoryPanel from './components/HistoryPanel'
import './App.css'

const API_URL = "https://leitorback-2.onrender.com"

function App() {
  const [file, setFile] = useState(null)
  const [filterType, setFilterType] = useState('auditado')
  const [status, setStatus] = useState('idle') // idle, uploading, processing, success, error
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [history, setHistory] = useState([])

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile)
    setStatus('idle')
    setErrorMessage('')
    setDownloadUrl(null)
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
    setDownloadUrl(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('tipo', filterType)

    try {
      setStatus('processing')
      
      const response = await fetch(`${API_URL}/upload/`, {
        method: "POST",
        body: formData,
        // NÃO definir Content-Type manualmente - o browser faz isso automaticamente
      })

      // Verifica se houve erro HTTP
      if (!response.ok) {
        // Backend retorna JSON quando há erro
        try {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Erro ao processar arquivo')
        } catch (jsonError) {
          // Se não conseguir ler como JSON, lança erro genérico
          if (jsonError instanceof Error && jsonError.message) {
            throw jsonError
          }
          throw new Error(`Erro ${response.status}: ${response.statusText}`)
        }
      }

      // Verifica o content-type para garantir que é um arquivo Excel
      const contentType = response.headers.get("content-type") || ""
      
      // Se o content-type for JSON, é um erro (mesmo com status 200)
      if (contentType.includes("application/json")) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Erro ao processar arquivo')
      }

      // Lê como blob (arquivo Excel)
      const blob = await response.blob()
      
      // Verifica se o blob não está vazio
      if (blob.size === 0) {
        throw new Error('Arquivo gerado está vazio. Verifique se a planilha contém dados válidos.')
      }

      // Cria URL para download
      const url = window.URL.createObjectURL(blob)
      
      // Faz download automático do arquivo
      const a = document.createElement("a")
      a.href = url
      a.download = `planilha_processada_${filterType}_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()

      // Limpa a URL após um tempo para liberar memória
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 100)

      setStatus('success')
      setDownloadUrl(url)

      // Adiciona ao histórico
      const historyItem = {
        id: Date.now(),
        filename: file.name,
        filterType: filterType,
        date: new Date().toLocaleString('pt-BR'),
        status: 'success'
      }
      setHistory([historyItem, ...history])
      
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'Erro ao processar arquivo. Verifique sua conexão com a internet.')
      
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

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `planilha_processada_${filterType}_${new Date().getTime()}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
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

          {status === 'success' && downloadUrl && (
            <DownloadButton 
              onClick={handleDownload}
              filename={file?.name}
            />
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

