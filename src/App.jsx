import { useState, useEffect } from 'react'
import { db } from './firebase'
import {
  collection, doc, onSnapshot, setDoc, addDoc, deleteDoc, updateDoc
} from 'firebase/firestore'
import OperazioneDetail from './components/OperazioneDetail'
import './App.css'

export default function App() {
  const [operazioni, setOperazioni] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'frazionamenti'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setOperazioni(list)
      setLoading(false)
    })
    return unsub
  }, [])

  async function nuovaOperazione() {
    setCreando(true)
    const ref = await addDoc(collection(db, 'frazionamenti'), {
      nome: 'Nuova operazione',
      stato: 'studio',
      createdAt: Date.now(),
      // Dati acquisto
      prezzAcquisto: 200000,
      commissioneAgenzia: 0.04,
      ivaAgenzia: 0.22,
      renditaCatastale: 1100,
      costoNotaio: 5000,
      // Ristrutturazione
      mqNetti: 120,
      costoRistMq: 600,
      // Altri costi
      pulizia: 500,
      praticaComune: 2000,
      // Lotti vendita
      lotti: [],
      // Partecipanti
      partecipanti: [],
      // Note
      note: '',
    })
    setCreando(false)
    setSelected(ref.id)
  }

  if (loading) return (
    <div className="splash">
      <div className="spinner" />
      <span>Caricamento…</span>
    </div>
  )

  if (selected) {
    const op = operazioni.find(o => o.id === selected)
    if (!op) { setSelected(null); return null }
    return <OperazioneDetail op={op} onBack={() => setSelected(null)} />
  }

  const statiLabel = { studio: 'In studio', attiva: 'Attiva', conclusa: 'Conclusa' }
  const statiColor = { studio: '#fbbf24', attiva: '#7c6af7', conclusa: '#34d399' }

  return (
    <div className="app-wrap">
      <header className="app-header">
        <div>
          <h1>🏢 Frazionamenti</h1>
          <p className="subtitle">Gestione operazioni immobiliari condivise</p>
        </div>
        <button className="btn-primary" onClick={nuovaOperazione} disabled={creando}>
          {creando ? '…' : '+ Nuova operazione'}
        </button>
      </header>

      {operazioni.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏗️</div>
          <h2>Nessuna operazione ancora</h2>
          <p>Clicca "Nuova operazione" per iniziare</p>
        </div>
      ) : (
        <div className="op-grid">
          {operazioni.map(op => {
            const calc = calcolaRiepilogo(op)
            return (
              <div key={op.id} className="op-card" onClick={() => setSelected(op.id)}>
                <div className="op-card-head">
                  <span className="op-nome">{op.nome}</span>
                  <span className="op-stato" style={{ color: statiColor[op.stato] || '#9090a8', background: statiColor[op.stato] + '22' }}>
                    {statiLabel[op.stato] || op.stato}
                  </span>
                </div>
                <div className="op-metrics">
                  <div className="op-metric">
                    <span className="op-metric-label">Investimento totale</span>
                    <span className="op-metric-val">{fmt(calc.costoTotale)}</span>
                  </div>
                  <div className="op-metric">
                    <span className="op-metric-label">Incassi stimati</span>
                    <span className="op-metric-val">{fmt(calc.incassiTotali)}</span>
                  </div>
                  <div className="op-metric">
                    <span className="op-metric-label">Guadagno</span>
                    <span className="op-metric-val" style={{ color: calc.guadagno >= 0 ? '#34d399' : '#f87171' }}>
                      {fmt(calc.guadagno)}
                    </span>
                  </div>
                  <div className="op-metric">
                    <span className="op-metric-label">Rendimento</span>
                    <span className="op-metric-val" style={{ color: calc.rendimento >= 0 ? '#34d399' : '#f87171' }}>
                      {pct(calc.rendimento)}
                    </span>
                  </div>
                </div>
                <div className="op-partecipanti">
                  {(op.partecipanti || []).map((p, i) => (
                    <span key={i} className="chip">{p.nome} {pct(p.quota / 100)}</span>
                  ))}
                  {(op.partecipanti || []).length === 0 && <span className="text-muted">Nessun partecipante</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function calcolaRiepilogo(op) {
  const prezzoAcquisto = num(op.prezzAcquisto)
  const commAgenzia = num(op.commissioneAgenzia)
  const iva = num(op.ivaAgenzia)
  const renditaCat = num(op.renditaCatastale)
  const notaio = num(op.costoNotaio)
  const mqNetti = num(op.mqNetti)
  const costoRistMq = num(op.costoRistMq)
  const pulizia = num(op.pulizia)
  const pratica = num(op.praticaComune)

  // Calcolo imposte acquisto (su valore catastale)
  const renditaRivalutata = renditaCat * 1.05
  const valoreCatastale = renditaRivalutata * 120
  const impostaRegistro = valoreCatastale * 0.09
  const impostaCatIpot = 100
  const costoAgenziaAcquisto = prezzoAcquisto * commAgenzia * (1 + iva)
  const costoTotaleAcquisto = prezzoAcquisto + costoAgenziaAcquisto + impostaRegistro + impostaCatIpot + notaio

  const costoRist = mqNetti * costoRistMq
  const incassiTotali = (op.lotti || []).reduce((s, l) => s + num(l.prezzoVendita), 0)
  const costoAgenziaRivendita = incassiTotali * commAgenzia * (1 + iva)
  const costoTotale = costoTotaleAcquisto + costoRist + pulizia + pratica + costoAgenziaRivendita
  const guadagno = incassiTotali - costoTotale
  const rendimento = costoTotale > 0 ? guadagno / costoTotale : 0

  return {
    renditaRivalutata,
    valoreCatastale,
    impostaRegistro,
    impostaCatIpot,
    costoAgenziaAcquisto,
    costoTotaleAcquisto,
    costoRist,
    costoAgenziaRivendita,
    costoTotale,
    incassiTotali,
    guadagno,
    rendimento,
  }
}

export function num(v) { return parseFloat(v) || 0 }
export function fmt(v) {
  if (v === undefined || v === null || isNaN(v)) return '—'
  return v.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
export function pct(v) {
  if (v === undefined || v === null || isNaN(v)) return '—'
  return (v * 100).toFixed(1) + '%'
}
