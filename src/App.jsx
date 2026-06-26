import { useState, useEffect } from 'react'
import { db } from './firebase'
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore'
import OperazioneDetail from './components/OperazioneDetail'
import './App.css'

const MASTER_CODE = '1012'
const STORAGE_KEY = 'fraz_codes'

const ITER_PRE_DEFAULT = [
  'Ricerca e vista annunci',
  'Compilazione excel al volo con ipotesi % investimento',
  'Ipotesi di frazionamento rapida',
  'Visione casa per studio muri portanti',
  'Proposta di collaborazione con agenzia',
]
const ITER_POST_DEFAULT = [
  'Offerta vincolata (es. ottenimento progetto, vendita su carta)',
  'Fare offerta in agenzia',
  'Compilazione completa app: costi pratiche, DL',
  'Capitolato lavori definito (incluso pulizia casa e androne)',
  'Scelta % ingresso di ogni partecipante',
  'Pratica edilizia avviata',
  'Inizio lavori',
  'Fine lavori',
  'Accatastamento / frazionamento catastale',
  'Vendite completate',
]

// ---- Helpers localStorage ----
function getSavedCodes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveCode(code) {
  const codes = getSavedCodes()
  if (!codes.includes(code)) { codes.push(code); localStorage.setItem(STORAGE_KEY, JSON.stringify(codes)) }
}
function removeSavedCodes() {
  localStorage.removeItem(STORAGE_KEY)
}
function isMaster(code) { return code === MASTER_CODE }

// ---- Schermata login ----
function LoginScreen({ onLogin }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const code = input.trim()
    if (!code) return
    onLogin(code)
    setError('Codice non riconosciuto per nessun cantiere.')
    setInput('')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Frazionamenti</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Inserisci il codice di accesso</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode="numeric"
            value={input}
            onChange={e => { setInput(e.target.value); setError('') }}
            placeholder="Codice accesso"
            autoFocus
            style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, marginBottom: 12, padding: '12px 16px' }}
          />
          {error && <div style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center', marginBottom: 10 }}>{error}</div>}
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: 12, fontSize: 15 }}>
            Accedi
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [operazioni, setOperazioni] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [dashView, setDashView] = useState(false)
  const [creando, setCreando] = useState(false)

  // Codici attivi su questo dispositivo
  const [activeCodes, setActiveCodes] = useState(() => getSavedCodes())
  const isMasterMode = activeCodes.includes(MASTER_CODE)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'frazionamenti'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setOperazioni(list)
      setLoading(false)
    })
    return unsub
  }, [])

  // Verifica codice al login
  function handleLogin(code) {
    if (isMaster(code)) {
      saveCode(code)
      setActiveCodes(getSavedCodes())
      return
    }
    // Cerca se il codice corrisponde a qualche cantiere
    const match = operazioni.find(op => op.codiceAccesso === code)
    if (match) {
      saveCode(code)
      setActiveCodes(getSavedCodes())
    }
    // Se non trova nulla, LoginScreen mostra errore
  }

  function handleLogout() {
    removeSavedCodes()
    setActiveCodes([])
    setSelected(null)
    setDashView(false)
  }

  // Filtra cantieri visibili
  const operazioniVisibili = isMasterMode
    ? operazioni
    : operazioni.filter(op => activeCodes.includes(op.codiceAccesso))

  // Se non ha codici salvati → login
  if (activeCodes.length === 0) {
    return <LoginScreen onLogin={handleLogin} />
  }

  // Se ha codici ma nessun cantiere corrisponde ancora (Firebase in caricamento)
  if (loading) return <div className="splash"><div className="spinner" /><span>Caricamento…</span></div>

  // Se ha codici ma nessun cantiere visibile → codice non valido, torna al login
  if (!isMasterMode && operazioniVisibili.length === 0 && operazioni.length > 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ marginBottom: 8 }}>Nessun cantiere trovato</h2>
          <p style={{ color: 'var(--text2)', marginBottom: 20 }}>Il codice salvato non corrisponde a nessun cantiere attivo.</p>
          <button className="btn-ghost" onClick={handleLogout}>← Cambia codice</button>
        </div>
      </div>
    )
  }

  if (selected) {
    const op = operazioniVisibili.find(o => o.id === selected)
    if (!op) { setSelected(null); return null }
    return <OperazioneDetail op={op} onBack={() => setSelected(null)} isMaster={isMasterMode} />
  }

  if (dashView) {
    return <Dashboard
      operazioni={operazioniVisibili}
      onBack={() => setDashView(false)}
      isMaster={isMasterMode}
      onLogout={handleLogout}
    />
  }

  const statiLabel = { studio: '🔍 In studio', attiva: '⚡ Attiva', conclusa: '✅ Conclusa' }
  const statiColor = { studio: '#fbbf24', attiva: '#7c6af7', conclusa: '#34d399' }

  async function nuovaOperazione() {
    setCreando(true)
    await addDoc(collection(db, 'frazionamenti'), {
      nome: 'Nuova operazione',
      stato: 'studio',
      createdAt: Date.now(),
      codiceAccesso: '',
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
      iterPreVoci: ITER_PRE_DEFAULT,
      iterPostVoci: ITER_POST_DEFAULT,
      dataAcquisto: '',
      dataRivendita: '',
      note: '',
    })
    setCreando(false)
  }

  // Aggiungi codice cantiere senza logout
  function handleAddCode(code) {
    const match = operazioni.find(op => op.codiceAccesso === code)
    if (match) {
      saveCode(code)
      setActiveCodes(getSavedCodes())
      return true
    }
    return false
  }

  return (
    <div className="app-wrap">
      <header className="app-header">
        <div>
          <h1>🏢 Frazionamenti</h1>
          <p className="subtitle">
            {isMasterMode ? '👑 Accesso master' : `${operazioniVisibili.length} cantiere${operazioniVisibili.length !== 1 ? 'i' : ''} visibile${operazioniVisibili.length !== 1 ? 'i' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!isMasterMode && <AddCodeButton onAdd={handleAddCode} />}
          <button className="btn-ghost" onClick={() => setDashView(true)}>📊 Dashboard</button>
          {isMasterMode && (
            <button className="btn-primary" onClick={nuovaOperazione} disabled={creando}>
              {creando ? '…' : '+ Nuova operazione'}
            </button>
          )}
          <button className="btn-ghost" onClick={handleLogout} style={{ fontSize: 13 }}>🚪 Esci</button>
        </div>
      </header>

      {operazioniVisibili.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏗️</div>
          <h2>Nessun cantiere visibile</h2>
          <p>I cantieri appariranno qui quando ti verrà assegnato un codice</p>
        </div>
      ) : (
        <div className="op-grid">
          {operazioniVisibili.map(op => {
            const calc = calcolaRiepilogo(op)
            const iterPreVoci = op.iterPreVoci || ITER_PRE_DEFAULT
            const iterPostVoci = op.iterPostVoci || ITER_POST_DEFAULT
            return (
              <div key={op.id} className="op-card" onClick={() => setSelected(op.id)}>
                <div className="op-card-head">
                  <span className="op-nome">{op.nome}</span>
                  <span className="op-stato" style={{ color: statiColor[op.stato] || '#9090a8', background: (statiColor[op.stato] || '#9090a8') + '22' }}>
                    {statiLabel[op.stato] || op.stato}
                  </span>
                </div>
                <div className="op-metrics">
                  <div className="op-metric"><span className="op-metric-label">Investimento</span><span className="op-metric-val">{fmt(calc.costoTotale)}</span></div>
                  <div className="op-metric"><span className="op-metric-label">Incassi stimati</span><span className="op-metric-val">{fmt(calc.incassiTotali)}</span></div>
                  <div className="op-metric"><span className="op-metric-label">Guadagno</span><span className="op-metric-val" style={{ color: calc.guadagno >= 0 ? '#34d399' : '#f87171' }}>{fmt(calc.guadagno)}</span></div>
                  <div className="op-metric"><span className="op-metric-label">Rendimento</span><span className="op-metric-val" style={{ color: calc.rendimento >= 0 ? '#34d399' : '#f87171' }}>{pct(calc.rendimento)}</span></div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                  <span>Pre: {(op.iterPre || []).length}/{iterPreVoci.length}</span>
                  <span>Post: {(op.iterPost || []).length}/{iterPostVoci.length}</span>
                  {op.dataAcquisto && op.dataRivendita && (
                    <span>📅 {Math.round((new Date(op.dataRivendita) - new Date(op.dataAcquisto)) / (1000 * 60 * 60 * 24 * 30.44))} mesi</span>
                  )}
                  {isMasterMode && op.codiceAccesso && (
                    <span style={{ color: 'var(--accent2)' }}>🔑 {op.codiceAccesso}</span>
                  )}
                </div>
                <div className="op-partecipanti">
                  {(op.partecipanti || []).map((p, i) => <span key={i} className="chip">{p.nome} {pct(num(p.quota) / 100)}</span>)}
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

// ---- Bottone aggiungi codice (per utenti non master) ----
function AddCodeButton({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')

  function submit(e) {
    e.preventDefault()
    const ok = onAdd(val.trim())
    if (ok) { setOpen(false); setVal(''); setErr('') }
    else { setErr('Codice non valido') }
  }

  if (!open) return <button className="btn-ghost" onClick={() => setOpen(true)}>+ Aggiungi cantiere</button>

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input value={val} onChange={e => { setVal(e.target.value); setErr('') }}
        placeholder="Codice cantiere" autoFocus
        style={{ width: 130, fontSize: 14, padding: '7px 10px' }} />
      {err && <span style={{ fontSize: 12, color: 'var(--red)' }}>{err}</span>}
      <button type="submit" className="btn-primary" style={{ padding: '7px 12px' }}>OK</button>
      <button type="button" className="btn-ghost" style={{ padding: '7px 10px' }} onClick={() => { setOpen(false); setErr('') }}>✕</button>
    </form>
  )
}

// ---- Dashboard globale ----
function Dashboard({ operazioni, onBack, isMaster, onLogout }) {
  const [editMode, setEditMode] = useState(false)
  const primaOp = operazioni[0]
  const [vociPre, setVociPre] = useState(primaOp?.iterPreVoci || ITER_PRE_DEFAULT)
  const [vociPost, setVociPost] = useState(primaOp?.iterPostVoci || ITER_POST_DEFAULT)

  async function toggleIter(op, tipo, idx) {
    const key = tipo === 'pre' ? 'iterPre' : 'iterPost'
    const current = op[key] || []
    const next = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx]
    await updateDoc(doc(db, 'frazionamenti', op.id), { [key]: next })
  }

  async function salvaVoci() {
    for (const op of operazioni) {
      await updateDoc(doc(db, 'frazionamenti', op.id), { iterPreVoci: vociPre, iterPostVoci: vociPost })
    }
    setEditMode(false)
  }

  const totInvestimento = operazioni.reduce((s, op) => s + calcolaRiepilogo(op).costoTotale, 0)
  const totGuadagno = operazioni.reduce((s, op) => s + calcolaRiepilogo(op).guadagno, 0)
  const statiColor = { studio: '#fbbf24', attiva: '#7c6af7', conclusa: '#34d399' }

  return (
    <div className="detail-wrap">
      <div className="detail-header">
        <button className="btn-ghost" onClick={onBack}>← Operazioni</button>
        <div className="detail-header-info">
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>📊 Dashboard {isMaster ? '👑' : ''}</h2>
        </div>
        {isMaster && (
          <button className={editMode ? 'btn-primary' : 'btn-ghost'} onClick={() => editMode ? salvaVoci() : setEditMode(true)}>
            {editMode ? '💾 Salva' : '✏️ Modifica elenchi'}
          </button>
        )}
        {editMode && <button className="btn-ghost" onClick={() => setEditMode(false)}>Annulla</button>}
      </div>

      <div className="result-grid" style={{ marginBottom: 14 }}>
        <div className="result-box"><div className="rl">Cantieri visibili</div><div className="rv">{operazioni.length}</div></div>
        <div className="result-box"><div className="rl">In studio</div><div className="rv" style={{ color: '#fbbf24' }}>{operazioni.filter(o => o.stato === 'studio').length}</div></div>
        <div className="result-box"><div className="rl">Attive</div><div className="rv" style={{ color: '#7c6af7' }}>{operazioni.filter(o => o.stato === 'attiva').length}</div></div>
        <div className="result-box"><div className="rl">Concluse</div><div className="rv" style={{ color: '#34d399' }}>{operazioni.filter(o => o.stato === 'conclusa').length}</div></div>
        <div className="result-box"><div className="rl">Investimento totale</div><div className="rv">{fmt(totInvestimento)}</div></div>
        <div className="result-box"><div className="rl">Guadagno totale stimato</div><div className="rv" style={{ color: totGuadagno >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(totGuadagno)}</div></div>
      </div>

      {editMode && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid var(--accent)' }}>
          <div className="card-title" style={{ color: 'var(--accent2)' }}>✏️ Modifica elenchi iter — validi per tutte le operazioni</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>Iter pre-annuncio</div>
              {vociPre.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 20 }}>{i + 1}.</span>
                  <input value={v} onChange={e => setVociPre(vociPre.map((x, idx) => idx === i ? e.target.value : x))} style={{ fontSize: 13, flex: 1 }} />
                  <button className="btn-icon" onClick={() => setVociPre(vociPre.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
              <button className="btn-ghost" style={{ fontSize: 12, marginTop: 4 }} onClick={() => setVociPre([...vociPre, 'Nuova voce'])}>+ Aggiungi</button>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 10 }}>Iter post-annuncio</div>
              {vociPost.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', minWidth: 20 }}>{i + 1}.</span>
                  <input value={v} onChange={e => setVociPost(vociPost.map((x, idx) => idx === i ? e.target.value : x))} style={{ fontSize: 13, flex: 1 }} />
                  <button className="btn-icon" onClick={() => setVociPost(vociPost.filter((_, idx) => idx !== i))}>✕</button>
                </div>
              ))}
              <button className="btn-ghost" style={{ fontSize: 12, marginTop: 4 }} onClick={() => setVociPost([...vociPost, 'Nuova voce'])}>+ Aggiungi</button>
            </div>
          </div>
        </div>
      )}

      {operazioni.map(op => {
        const iterPre = op.iterPre || []
        const iterPost = op.iterPost || []
        const iterPreVoci = editMode ? vociPre : (op.iterPreVoci || ITER_PRE_DEFAULT)
        const iterPostVoci = editMode ? vociPost : (op.iterPostVoci || ITER_POST_DEFAULT)
        const calc = calcolaRiepilogo(op)

        return (
          <div key={op.id} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{op.nome}</span>
                <span className="op-stato" style={{ marginLeft: 10, color: statiColor[op.stato] || '#9090a8', background: (statiColor[op.stato] || '#9090a8') + '22' }}>{op.stato}</span>
                {isMaster && op.codiceAccesso && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent2)' }}>🔑 {op.codiceAccesso}</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <span style={{ color: 'var(--text2)' }}>Invest.: <strong>{fmt(calc.costoTotale)}</strong></span>
                <span>Guad.: <strong style={{ color: calc.guadagno >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(calc.guadagno)}</strong></span>
                <span style={{ color: 'var(--text2)' }}>Rend.: <strong style={{ color: calc.rendimento >= 0 ? 'var(--green)' : 'var(--red)' }}>{pct(calc.rendimento)}</strong></span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                  Pre-annuncio ({iterPre.length}/{iterPreVoci.length})
                </div>
                {iterPreVoci.map((voce, i) => (
                  <div key={i} onClick={() => !editMode && toggleIter(op, 'pre', i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: editMode ? 'default' : 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, border: '1.5px solid', flexShrink: 0, borderColor: iterPre.includes(i) ? 'var(--green)' : 'var(--border2)', background: iterPre.includes(i) ? 'var(--green-bg)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {iterPre.includes(i) && <span style={{ color: 'var(--green)', fontSize: 11 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: iterPre.includes(i) ? 'var(--text3)' : 'var(--text)', textDecoration: iterPre.includes(i) ? 'line-through' : 'none' }}>
                      {i + 1}. {voce}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                  Post-annuncio ({iterPost.length}/{iterPostVoci.length})
                </div>
                {iterPostVoci.map((voce, i) => (
                  <div key={i} onClick={() => !editMode && toggleIter(op, 'post', i)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: editMode ? 'default' : 'pointer', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, border: '1.5px solid', flexShrink: 0, borderColor: iterPost.includes(i) ? 'var(--green)' : 'var(--border2)', background: iterPost.includes(i) ? 'var(--green-bg)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <h2>Nessun cantiere visibile</h2>
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

  const renditaRivalutata = renditaCat * 1.05
  const valoreCatastale = renditaRivalutata * 120
  const impostaRegistro = valoreCatastale * 0.09
  const impostaCatIpot = 100
  const costoAgenziaAcquisto = prezzoAcquisto * commAgenzia * (1 + iva)
  const costoTotaleAcquisto = prezzoAcquisto + costoAgenziaAcquisto + impostaRegistro + impostaCatIpot + notaio
  const costoRist = mqNetti * costoRistMq
  const altriCosti = pulizia + pratica + tabelleMillesimali + speseCondominio + allacci
  const incassiTotali = (op.lotti || []).reduce((s, l) => s + num(l.prezzoVendita), 0)
  const costoAgenziaRivendita = incassiTotali * commAgenzia * (1 + iva) / 2
  const costoTotale = costoTotaleAcquisto + costoRist + altriCosti + costoAgenziaRivendita
  const guadagno = incassiTotali - costoTotale
  const rendimento = costoTotale > 0 ? guadagno / costoTotale : 0
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
    incassiTotali, guadagno, rendimento, mqCommerciali,
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
