import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore'
import OperazioneDetail from './components/OperazioneDetail'
import './App.css'

const ITER_PRE = [
  'Ricerca e vista annunci',
  'Compilazione excel al volo con ipotesi % investimento',
  'Ipotesi di frazionamento rapida',
  'Visione casa per studio muri portanti',
  'Proposta di collaborazione con agenzia',
]
const ITER_POST = [
  'Offerta vincolata (es. ottenimento progetto, vendita su carta)',
  'Compilazione completa app: capitolato, costi pratiche, DL',
  'Capitolato lavori definito (incluso pulizia casa e androne)',
  'Costi pratiche edilizie con oneri enti e DL',
  'Pratica edilizia avviata',
  'Inizio lavori',
  'Fine lavori',
  'Accatastamento / frazionamento catastale',
  'Vendite completate',
]

export default function App() {
  const [operazioni, setOperazioni] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  const [dashView, setDashView] = useState(false)

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
      prezzAcquisto: 190000,
      commissioneAgenzia: 0.04,
      ivaAgenzia: 0.22,
      renditaCatastale: 700,
      costoNotaio: 5000,
      mqNetti: 100,
      mqCommerciali: 120,
      costoRistMq: 800,
      pulizia: 500,
      praticaComune: 2000,
      tabelleMillesimali: 0,
      speseCondominio: 0,
      allacci: 0,
      aliquotaImu: 0.0106,
      bonusGestione: 50,
      vociCapitolato: [],
      lotti: [],
      partecipanti: [],
      iterPre: [],
      iterPost: [],
      dataAcquisto: '',
      dataRivendita: '',
      note: '',
    })
    setCreando(false)
    setSelected(ref.id)
  }

  if (loading) return <div className="splash"><div className="spinner" /><span>Caricamento…</span></div>

  if (selected) {
    const op = operazioni.find(o => o.id === selected)
    if (!op) { setSelected(null); return null }
    return <OperazioneDetail op={op} onBack={() => setSelected(null)} />
  }

  if (dashView) return <Dashboard operazioni={operazioni} onBack={() => setDashView(false)} ITER_PRE={ITER_PRE} ITER_POST={ITER_POST} db={db} />

  const statiLabel = { studio: '🔍 In studio', attiva: '⚡ Attiva', conclusa: '✅ Conclusa' }
  const statiColor = { studio: '#fbbf24', attiva: '#7c6af7', conclusa: '#34d399' }

  return (
    <div className="app-wrap">
      <header className="app-header">
        <div>
          <h1>🏢 Frazionamenti</h1>
          <p className="subtitle">Gestione operazioni immobiliari condivise</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setDashView(true)}>📊 Dashboard</button>
          <button className="btn-primary" onClick={nuovaOperazione} disabled={creando}>
            {creando ? '…' : '+ Nuova operazione'}
          </button>
        </div>
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
            const iterPreDone = (op.iterPre || []).length
            const iterPostDone = (op.iterPost || []).length
            return (
              <div key={op.id} className="op-card" onClick={() => setSelected(op.id)}>
                <div className="op-card-head">
                  <span className="op-nome">{op.nome}</span>
                  <span className="op-stato" style={{ color: statiColor[op.stato] || '#9090a8', background: (statiColor[op.stato] || '#9090a8') + '22' }}>
                    {statiLabel[op.stato] || op.stato}
                  </span>
                </div>
                <div className="op-metrics">
                  <div className="op-metric">
                    <span className="op-metric-label">Investimento</span>
                    <span className="op-metric-val">{fmt(calc.costoTotale)}</span>
                  </div>
                  <div className="op-metric">
                    <span className="op-metric-label">Incassi stimati</span>
                    <span className="op-metric-val">{fmt(calc.incassiTotali)}</span>
                  </div>
                  <div className="op-metric">
                    <span className="op-metric-label">Guadagno</span>
                    <span className="op-metric-val" style={{ color: calc.guadagno >= 0 ? '#34d399' : '#f87171' }}>{fmt(calc.guadagno)}</span>
                  </div>
                  <div className="op-metric">
                    <span className="op-metric-label">Rendimento</span>
                    <span className="op-metric-val" style={{ color: calc.rendimento >= 0 ? '#34d399' : '#f87171' }}>{pct(calc.rendimento)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                  <span>Iter pre: {iterPreDone}/5</span>
                  <span>Iter post: {iterPostDone}/9</span>
                  {op.dataAcquisto && op.dataRivendita && (
                    <span>📅 {Math.round((new Date(op.dataRivendita) - new Date(op.dataAcquisto)) / (1000 * 60 * 60 * 24 * 30.44))} mesi</span>
                  )}
                </div>
                <div className="op-partecipanti">
                  {(op.partecipanti || []).map((p, i) => (
                    <span key={i} className="chip">{p.nome} {pct(num(p.quota) / 100)}</span>
                  ))}
                  {!(op.partecipanti || []).length && <span className="text-muted">Nessun partecipante</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Dashboard globale ----
function Dashboard({ operazioni, onBack, ITER_PRE, ITER_POST, db }) {
  async function toggleIter(op, tipo, idx) {
    const key = tipo === 'pre' ? 'iterPre' : 'iterPost'
    const current = op[key] || []
    const next = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx]
    await updateDoc(doc(db, 'frazionamenti', op.id), { [key]: next })
  }

  const totInvestimento = operazioni.reduce((s, op) => s + calcolaRiepilogo(op).costoTotale, 0)
  const totGuadagno = operazioni.reduce((s, op) => s + calcolaRiepilogo(op).guadagno, 0)
  const attive = operazioni.filter(op => op.stato === 'attiva').length
  const inStudio = operazioni.filter(op => op.stato === 'studio').length
  const concluse = operazioni.filter(op => op.stato === 'conclusa').length

  return (
    <div className="detail-wrap">
      <div className="detail-header">
        <button className="btn-ghost" onClick={onBack}>← Operazioni</button>
        <div className="detail-header-info">
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>📊 Dashboard globale</h2>
        </div>
      </div>

      {/* KPI globali */}
      <div className="result-grid" style={{ marginBottom: 14 }}>
        <div className="result-box"><div className="rl">Operazioni totali</div><div className="rv">{operazioni.length}</div></div>
        <div className="result-box"><div className="rl">In studio</div><div className="rv" style={{ color: '#fbbf24' }}>{inStudio}</div></div>
        <div className="result-box"><div className="rl">Attive</div><div className="rv" style={{ color: '#7c6af7' }}>{attive}</div></div>
        <div className="result-box"><div className="rl">Concluse</div><div className="rv" style={{ color: '#34d399' }}>{concluse}</div></div>
        <div className="result-box"><div className="rl">Investimento totale</div><div className="rv">{fmt(totInvestimento)}</div></div>
        <div className="result-box"><div className="rl">Guadagno totale stimato</div><div className="rv" style={{ color: totGuadagno >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(totGuadagno)}</div></div>
      </div>

      {/* Iter per ogni operazione */}
      {operazioni.map(op => {
        const iterPre = op.iterPre || []
        const iterPost = op.iterPost || []
        const statiColor = { studio: '#fbbf24', attiva: '#7c6af7', conclusa: '#34d399' }
        const calc = calcolaRiepilogo(op)

        return (
          <div key={op.id} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{op.nome}</span>
                <span className="op-stato" style={{ marginLeft: 10, color: statiColor[op.stato] || '#9090a8', background: (statiColor[op.stato] || '#9090a8') + '22' }}>
                  {op.stato}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>Invest.: <strong>{fmt(calc.costoTotale)}</strong></span>
                <span style={{ color: calc.guadagno >= 0 ? 'var(--green)' : 'var(--red)' }}>Guad.: <strong>{fmt(calc.guadagno)}</strong></span>
                <span style={{ color: 'var(--text2)' }}>Rend.: <strong style={{ color: calc.rendimento >= 0 ? 'var(--green)' : 'var(--red)' }}>{pct(calc.rendimento)}</strong></span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Iter pre */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                  Iter pre-annuncio ({iterPre.length}/{ITER_PRE.length})
                </div>
                {ITER_PRE.map((voce, i) => (
                  <div key={i} onClick={() => toggleIter(op, 'pre', i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, border: '1.5px solid', flexShrink: 0,
                      borderColor: iterPre.includes(i) ? 'var(--green)' : 'var(--border2)',
                      background: iterPre.includes(i) ? 'var(--green-bg)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {iterPre.includes(i) && <span style={{ color: 'var(--green)', fontSize: 11 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: iterPre.includes(i) ? 'var(--text3)' : 'var(--text)', textDecoration: iterPre.includes(i) ? 'line-through' : 'none' }}>
                      {i + 1}. {voce}
                    </span>
                  </div>
                ))}
              </div>

              {/* Iter post */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                  Iter post-annuncio ({iterPost.length}/{ITER_POST.length})
                </div>
                {ITER_POST.map((voce, i) => (
                  <div key={i} onClick={() => toggleIter(op, 'post', i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, border: '1.5px solid', flexShrink: 0,
                      borderColor: iterPost.includes(i) ? 'var(--green)' : 'var(--border2)',
                      background: iterPost.includes(i) ? 'var(--green-bg)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {iterPost.includes(i) && <span style={{ color: 'var(--green)', fontSize: 11 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: iterPost.includes(i) ? 'var(--text3)' : 'var(--text)', textDecoration: iterPost.includes(i) ? 'line-through' : 'none' }}>
                      {i + 1}. {voce}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {operazioni.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>Nessuna operazione ancora</h2>
          <p>Crea la prima operazione dalla lista</p>
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
  const mqCommerciali = num(op.mqCommerciali) || mqNetti
  const costoRistMq = num(op.costoRistMq)
  const pulizia = num(op.pulizia)
  const pratica = num(op.praticaComune)
  const tabelleMillesimali = num(op.tabelleMillesimali)
  const speseCondominio = num(op.speseCondominio)
  const allacci = num(op.allacci)

  // Calcolo imposte acquisto
  const renditaRivalutata = renditaCat * 1.05
  const valoreCatastale = renditaRivalutata * 120
  const impostaRegistro = valoreCatastale * 0.09
  const impostaCatIpot = 100
  const costoAgenziaAcquisto = prezzoAcquisto * commAgenzia * (1 + iva)
  const costoTotaleAcquisto = prezzoAcquisto + costoAgenziaAcquisto + impostaRegistro + impostaCatIpot + notaio

  // Ristrutturazione e altri costi
  const costoRist = mqNetti * costoRistMq
  const altriCosti = pulizia + pratica + tabelleMillesimali + speseCondominio + allacci

  // Incassi e agenzia rivendita al 50%
  const incassiTotali = (op.lotti || []).reduce((s, l) => s + num(l.prezzoVendita), 0)
  const costoAgenziaRivendita = incassiTotali * commAgenzia * (1 + iva) / 2

  const costoTotale = costoTotaleAcquisto + costoRist + altriCosti + costoAgenziaRivendita
  const guadagno = incassiTotali - costoTotale
  const rendimento = costoTotale > 0 ? guadagno / costoTotale : 0

  // Metriche al mq (su mq commerciali)
  const prezzoAcquistoAlMq = mqCommerciali > 0 ? prezzoAcquisto / mqCommerciali : 0
  const prezzoAcquistoConCostiAlMq = mqCommerciali > 0 ? costoTotaleAcquisto / mqCommerciali : 0
  const prezzoRivenditaAlMq = mqCommerciali > 0 ? incassiTotali / mqCommerciali : 0
  const costiSpeseAlMq = mqCommerciali > 0 ? (costoRist + altriCosti + costoAgenziaRivendita) / mqCommerciali : 0
  const guadagnoAlMqConSpese = prezzoRivenditaAlMq - prezzoAcquistoConCostiAlMq - costiSpeseAlMq
  const guadagnoAlMqSenzaSpese = prezzoRivenditaAlMq - prezzoAcquistoAlMq

  return {
    renditaRivalutata, valoreCatastale, impostaRegistro, impostaCatIpot,
    costoAgenziaAcquisto, costoTotaleAcquisto,
    costoRist, altriCosti, costoAgenziaRivendita, costoTotale,
    incassiTotali, guadagno, rendimento,
    mqCommerciali,
    prezzoAcquistoAlMq, prezzoAcquistoConCostiAlMq,
    prezzoRivenditaAlMq, costiSpeseAlMq,
    guadagnoAlMqConSpese, guadagnoAlMqSenzaSpese,
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
