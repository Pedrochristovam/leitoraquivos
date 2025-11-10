import React from 'react'
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import './StatusIndicator.css'

function StatusIndicator({ status, errorMessage }) {
  if (status === 'idle') {
    return null
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'uploading':
        return {
          icon: <Loader2 size={24} className="spinner" />,
          message: 'Enviando arquivo para o servidor...',
          type: 'info'
        }
      case 'processing':
        return {
          icon: <Loader2 size={24} className="spinner" />,
          message: 'Processando planilha e aplicando filtros...',
          type: 'info'
        }
      case 'success':
        return {
          icon: <CheckCircle2 size={24} />,
          message: 'Arquivo processado com sucesso! O download foi iniciado automaticamente.',
          type: 'success'
        }
      case 'error':
        return {
          icon: <AlertCircle size={24} />,
          message: errorMessage || 'Erro ao processar arquivo',
          type: 'error'
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config) return null

  return (
    <div className={`status-indicator ${config.type}`}>
      <div className="status-icon">{config.icon}</div>
      <div className="status-content">
        <p className="status-message">{config.message}</p>
      </div>
    </div>
  )
}

export default StatusIndicator

