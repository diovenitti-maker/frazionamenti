import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { calcolaRiepilogo, num, fmt, pct } from '../App'

const TABS = ['📊 Riepilogo', '🏠 Acquisto', '🔨 Ristrutturazione', '🏷️ Lotti vendita', '👥 Partecipanti', '💰 Tassazione', '📝 Note']

export default function OperazioneDetail({ op, onBack }) {
  const [tab, setTab] = useState(0)
  const [local, setLocal] = useState(op)
  const saveTimer = useRef(null)

  useEffect(() => { setLocal(op) }, [op])

  function update(fields) {
    const next = { ...local, ...fields }
    setLocal(next)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateDoc(doc(db, 'frazionamenti', op.id), fields).catch(console.error)
    }, 600)
  }

  function updateField(key, val) { update({ [key]: val }) }

  async function eliminaOperazione() {
    if (!confirm('Eliminare definitivamente questa operazione?')) return
    await deleteDoc(doc(db, 'frazionamenti', op.id))
    onBack()
  }

  const calc = calcolaRiepilogo(local)

  return (
    <div className="detail-wrap">
      <div className="detail-header">
        <button className="btn-ghost" onClick={onBack}>← Indietro</button>
        <div className="detail-header-info">
          <input
            style={{ background: 'transparent', border: 'none', fontSize: 20, fontWeight: 600, padding: '0', color: 'var(--text)', width: '100%' }}
            value={local.nome || ''}
            onChange={e => updateField('nome', e.target.value)}
            placeholder="Nome operazione"
          />
          <div style={{ marginTop: 8 }}>
            <div className="stato-sel">
              {['studio', 'attiva', 'conclusa'].map(s => (
                <button key={s}
                  className={`stato-btn ${local.stato === s ? 'active-' + s : ''}`}
                  onClick={() => updateField('stato', s)}>
                  {s === 'studio' ? '🔍 In studio' : s === 'attiva' ? '⚡ Attiva' : '✅ Conclusa'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t, i) => (
          <button key={i} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {tab === 0 && <TabRiepilogo calc={calc} op={local} />}
      {tab === 1 && <TabAcquisto op={local} calc={calc} update={updateField} />}
      {tab === 2 && <TabRistrutturazione op={local} calc={calc} update={updateField} />}
      {tab === 3 && <TabLotti op={local} calc={calc} update={update} />}
      {tab === 4 && <TabPartecipanti op={local} calc={calc} update={update} />}
      {tab === 5 && <TabTassazione op={local} calc={calc} />}
      {tab === 6 && <TabNote op={local} update={updateField} />}

      <div className="delete-zone">
        <button className="btn-danger" onClick={eliminaOperazione}>🗑️ Elimina operazione</button>
      </div>
    </div>
  )
}

// ---- Tab Riepilogo ----
function TabRiepilogo({ calc, op }) {
  const isPositivo = calc.guadagno >= 0

  return (
    <div>
      <div className={`highlight-box ${isPositivo ? '' : 'red'}`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Investimento totale</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(calc.costoTotale)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Incassi stimati</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(calc.incassiTotali)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Guadagno netto</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: isPositivo ? 'var(--green)' : 'var(--red)' }}>
              {fmt(calc.guadagno)}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>
            Rendimento: <strong style={{ color: isPositivo ? 'var(--green)' : 'var(--red)' }}>{pct(calc.rendimento)}</strong>
          </span>
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>
            Lotti: <strong>{(op.lotti || []).length}</strong>
          </span>
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>
            Partecipanti: <strong>{(op.partecipanti || []).length}</strong>
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Struttura dei costi</div>
        <div className="result-grid">
          <div className="result-box">
            <div className="rl">Costo acquisto</div>
            <div className="rv">{fmt(num(op.prezzAcquisto))}</div>
          </div>
          <div className="result-box">
            <div className="rl">Commissione + IVA acquisto</div>
            <div className="rv">{fmt(calc.costoAgenziaAcquisto)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Imposta di registro</div>
            <div className="rv">{fmt(calc.impostaRegistro)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Imp. catastale/ipotecaria</div>
            <div className="rv">{fmt(calc.impostaCatIpot)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Notaio</div>
            <div className="rv">{fmt(num(op.costoNotaio))}</div>
          </div>
          <div className="result-box" style={{ background: 'var(--bg)', border: '1px solid var(--border2)' }}>
            <div className="rl">Totale acquisto</div>
            <div className="rv" style={{ color: 'var(--accent2)' }}>{fmt(calc.costoTotaleAcquisto)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Ristrutturazione</div>
            <div className="rv">{fmt(calc.costoRist)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Pulizia</div>
            <div className="rv">{fmt(num(op.pulizia))}</div>
          </div>
          <div className="result-box">
            <div className="rl">Pratica comunale</div>
            <div className="rv">{fmt(num(op.praticaComune))}</div>
          </div>
          <div className="result-box">
            <div className="rl">Commissione rivendita + IVA</div>
            <div className="rv">{fmt(calc.costoAgenziaRivendita)}</div>
          </div>
        </div>
      </div>

      {(op.partecipanti || []).length > 0 && (
        <div className="card">
          <div className="card-title">Quote partecipanti</div>
          {(op.partecipanti || []).map((p, i) => {
            const quotaFraz = num(p.quota) / 100
            const investimento = calc.costoTotale * quotaFraz
            const guadagno = calc.guadagno * quotaFraz
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 120px', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{p.nome}</div>
                  <span className={`tag-regime ${p.regime === 'forfettario' ? 'tag-forfettario' : 'tag-dipendente'}`}>{p.regime || 'dipendente'}</span>
                </div>
                <div style={{ color: 'var(--accent2)', fontWeight: 600 }}>{pct(quotaFraz)}</div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Investe</div>
                  <div>{fmt(investimento)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Guadagna</div>
                  <div style={{ color: guadagno >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fmt(guadagno)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Tab Acquisto ----
function TabAcquisto({ op, calc, update }) {
  return (
    <div>
      <div className="card">
        <div className="card-title">Dati acquisto</div>
        <div className="field-grid">
          <div className="field">
            <label>Prezzo acquisto (€)</label>
            <input type="number" value={op.prezzAcquisto || ''} onChange={e => update('prezzAcquisto', e.target.value)} />
          </div>
          <div className="field">
            <label>Commissione agenzia acquisto (%)</label>
            <input type="number" step="0.01" value={op.commissioneAgenzia || ''} onChange={e => update('commissioneAgenzia', e.target.value)} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{pct(num(op.commissioneAgenzia))} → costo: {fmt(calc.costoAgenziaAcquisto)}</span>
          </div>
          <div className="field">
            <label>IVA su commissione (%)</label>
            <input type="number" step="0.01" value={op.ivaAgenzia || ''} onChange={e => update('ivaAgenzia', e.target.value)} />
          </div>
          <div className="field">
            <label>Rendita catastale (€)</label>
            <input type="number" value={op.renditaCatastale || ''} onChange={e => update('renditaCatastale', e.target.value)} />
          </div>
          <div className="field">
            <label>Costo notaio atto acquisto (€)</label>
            <input type="number" value={op.costoNotaio || ''} onChange={e => update('costoNotaio', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Calcolo imposte (base catastale)</div>
        <div className="result-grid">
          <div className="result-box">
            <div className="rl">Rendita rivalutata (+5%)</div>
            <div className="rv">{fmt(calc.renditaRivalutata)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Valore catastale (×120)</div>
            <div className="rv">{fmt(calc.valoreCatastale)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Imposta di registro (9%)</div>
            <div className="rv">{fmt(calc.impostaRegistro)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Imp. catastale + ipotecaria</div>
            <div className="rv">{fmt(calc.impostaCatIpot)}</div>
          </div>
          <div className="result-box" style={{ background: 'var(--bg)', border: '1px solid var(--border2)' }}>
            <div className="rl">TOTALE ACQUISTO</div>
            <div className="rv" style={{ color: 'var(--accent2)' }}>{fmt(calc.costoTotaleAcquisto)}</div>
          </div>
        </div>
      </div>

      <div className="info-box">
        ℹ️ L'imposta di registro è calcolata sul <strong>valore catastale</strong> (rendita × 1.05 × 120) al 9%, con un minimo di €100 per le imposte catastale e ipotecaria.<br />
        Se è seconda casa non si applicano le agevolazioni prima casa.
      </div>
    </div>
  )
}

// ---- Tab Ristrutturazione ----
function TabRistrutturazione({ op, calc, update }) {
  return (
    <div>
      <div className="card">
        <div className="card-title">Dati immobile e ristrutturazione</div>
        <div className="field-grid">
          <div className="field">
            <label>Mq netti calpestabili (iniziale)</label>
            <input type="number" value={op.mqNetti || ''} onChange={e => update('mqNetti', e.target.value)} />
          </div>
          <div className="field">
            <label>Costo ristrutturazione al mq (€)</label>
            <input type="number" value={op.costoRistMq || ''} onChange={e => update('costoRistMq', e.target.value)} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Totale: {fmt(calc.costoRist)}</span>
          </div>
          <div className="field">
            <label>Pulizia casa e androne (€)</label>
            <input type="number" value={op.pulizia || ''} onChange={e => update('pulizia', e.target.value)} />
          </div>
          <div className="field">
            <label>Pratica comunale + diritti enti (€)</label>
            <input type="number" value={op.praticaComune || ''} onChange={e => update('praticaComune', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="warn-box">
        ⚠️ Prima di procedere verificare: <strong>rapporto aeroilluminante</strong> (finestre ≥ 1/8 del pavimento), fattibilità scarichi per nuovo bagno/cucina, <strong>regolamento condominiale</strong> (verifica che non vieti il frazionamento).
      </div>
    </div>
  )
}

// ---- Tab Lotti ----
function TabLotti({ op, calc, update }) {
  const lotti = op.lotti || []

  function addLotto() {
    const newLotti = [...lotti, { id: Date.now(), nome: `Appartamento ${lotti.length + 1}`, mqNetti: 0, prezzoVendita: 0 }]
    update({ lotti: newLotti })
  }

  function updateLotto(idx, field, val) {
    const newLotti = lotti.map((l, i) => i === idx ? { ...l, [field]: val } : l)
    update({ lotti: newLotti })
  }

  function removeLotto(idx) {
    update({ lotti: lotti.filter((_, i) => i !== idx) })
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">Lotti da rivendere</div>

        {lotti.length > 0 && (
          <div>
            <div className="table-head lotto-row">
              <span>Nome lotto</span><span>Mq netti</span><span>Prezzo vendita</span><span>€/mq</span><span></span>
            </div>
            {lotti.map((l, i) => {
              const mq = num(l.mqNetti)
              const prz = num(l.prezzoVendita)
              const xMq = mq > 0 ? (prz / mq).toFixed(0) : '—'
              return (
                <div key={l.id || i} className="lotto-row">
                  <input value={l.nome || ''} onChange={e => updateLotto(i, 'nome', e.target.value)} placeholder="Nome" />
                  <input type="number" value={l.mqNetti || ''} onChange={e => updateLotto(i, 'mqNetti', e.target.value)} placeholder="mq" />
                  <input type="number" value={l.prezzoVendita || ''} onChange={e => updateLotto(i, 'prezzoVendita', e.target.value)} placeholder="€" />
                  <span style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>{xMq !== '—' ? `${xMq}€` : '—'}</span>
                  <button className="btn-icon" onClick={() => removeLotto(i)}>✕</button>
                </div>
              )
            })}
          </div>
        )}

        <button className="btn-ghost" style={{ marginTop: 8 }} onClick={addLotto}>+ Aggiungi lotto</button>
      </div>

      {lotti.length > 0 && (
        <div className="card">
          <div className="card-title">Totale incassi</div>
          <div className="result-grid">
            <div className="result-box">
              <div className="rl">Incassi totali stimati</div>
              <div className="rv" style={{ color: 'var(--green)' }}>{fmt(calc.incassiTotali)}</div>
            </div>
            <div className="result-box">
              <div className="rl">Commissione rivendita + IVA</div>
              <div className="rv" style={{ color: 'var(--red)' }}>− {fmt(calc.costoAgenziaRivendita)}</div>
            </div>
            <div className="result-box">
              <div className="rl">Guadagno operazione</div>
              <div className="rv" style={{ color: calc.guadagno >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(calc.guadagno)}</div>
            </div>
            <div className="result-box">
              <div className="rl">Rendimento</div>
              <div className="rv" style={{ color: calc.rendimento >= 0 ? 'var(--green)' : 'var(--red)' }}>{pct(calc.rendimento)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="info-box">
        ℹ️ La commissione per la rivendita è calcolata sul totale degli incassi con la stessa percentuale + IVA dell'acquisto.
        Chiedere preventivo all'agenzia prima di inserire il valore finale.
      </div>
    </div>
  )
}

// ---- Tab Partecipanti ----
function TabPartecipanti({ op, calc, update }) {
  const partecipanti = op.partecipanti || []
  const totaleQuote = partecipanti.reduce((s, p) => s + num(p.quota), 0)
  const quoteOk = Math.abs(totaleQuote - 100) < 0.1

  function addPartecipante() {
    update({ partecipanti: [...partecipanti, { id: Date.now(), nome: '', quota: 0, regime: 'dipendente', redditoAnnuo: 0 }] })
  }

  function updateP(idx, field, val) {
    update({ partecipanti: partecipanti.map((p, i) => i === idx ? { ...p, [field]: val } : p) })
  }

  function removeP(idx) {
    update({ partecipanti: partecipanti.filter((_, i) => i !== idx) })
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">Partecipanti all'operazione</div>

        {partecipanti.length > 0 && (
          <div>
            <div className="table-head part-row" style={{ gridTemplateColumns: '1fr 90px 140px 34px' }}>
              <span>Nome</span><span>Quota %</span><span>Regime fiscale</span><span></span>
            </div>
            {partecipanti.map((p, i) => (
              <div key={p.id || i}>
                <div className="part-row" style={{ gridTemplateColumns: '1fr 90px 140px 34px' }}>
                  <input value={p.nome || ''} onChange={e => updateP(i, 'nome', e.target.value)} placeholder="Nome e cognome" />
                  <input type="number" step="0.1" value={p.quota || ''} onChange={e => updateP(i, 'quota', e.target.value)} placeholder="%" />
                  <select value={p.regime || 'dipendente'} onChange={e => updateP(i, 'regime', e.target.value)}>
                    <option value="dipendente">Dipendente</option>
                    <option value="forfettario">Forfettario</option>
                  </select>
                  <button className="btn-icon" onClick={() => removeP(i)}>✕</button>
                </div>
                {p.regime === 'dipendente' && (
                  <div style={{ paddingLeft: 0, marginBottom: 8 }}>
                    <div className="field" style={{ maxWidth: 220 }}>
                      <label>Reddito da lavoro annuo (€) — per calcolo IRPEF cumulato</label>
                      <input type="number" value={p.redditoAnnuo || ''} onChange={e => updateP(i, 'redditoAnnuo', e.target.value)} placeholder="es. 35000" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <button className="btn-ghost" onClick={addPartecipante}>+ Aggiungi partecipante</button>
          {partecipanti.length > 0 && (
            <span style={{ fontSize: 13, color: quoteOk ? 'var(--green)' : 'var(--yellow)' }}>
              Totale quote: <strong>{totaleQuote.toFixed(1)}%</strong> {quoteOk ? '✓' : '⚠ (devono fare 100%)'}
            </span>
          )}
        </div>
      </div>

      {partecipanti.length > 0 && calc.costoTotale > 0 && (
        <div className="card">
          <div className="card-title">Riepilogo per partecipante</div>
          {partecipanti.map((p, i) => {
            const q = num(p.quota) / 100
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px 120px 120px', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13, alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{p.nome || '—'}</div>
                  <span className={`tag-regime ${p.regime === 'forfettario' ? 'tag-forfettario' : 'tag-dipendente'}`}>{p.regime || 'dipendente'}</span>
                </div>
                <div style={{ color: 'var(--accent2)', fontWeight: 600 }}>{pct(q)}</div>
                <div>
                  <div style={{ color: 'var(--text3)', fontSize: 11 }}>Investe</div>
                  <strong>{fmt(calc.costoTotale * q)}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--text3)', fontSize: 11 }}>Incassa</div>
                  <strong>{fmt(calc.incassiTotali * q)}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--text3)', fontSize: 11 }}>Guadagna</div>
                  <strong style={{ color: calc.guadagno >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(calc.guadagno * q)}</strong>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Tab Tassazione ----
function TabTassazione({ op, calc }) {
  const partecipanti = op.partecipanti || []

  return (
    <div>
      <div className="info-box" style={{ marginBottom: 14 }}>
        ℹ️ La plusvalenza è tassata se vendi entro 5 anni dall'acquisto originale.<br />
        <strong>Plusvalenza = Incassi - Costi deducibili (acquisto + ristrutturazione + spese)</strong><br />
        Regime forfettario: gli scaglioni IRPEF <strong>non</strong> si sommano al reddito forfettario.<br />
        Regime dipendente: i redditi si <strong>cumulano</strong> con quelli da lavoro.
      </div>

      {partecipanti.length === 0 && (
        <div className="warn-box">⚠️ Aggiungi i partecipanti nella tab "Partecipanti" per vedere il calcolo fiscale individuale.</div>
      )}

      {partecipanti.map((p, i) => {
        const q = num(p.quota) / 100
        const guadagnoLordo = calc.guadagno * q
        if (guadagnoLordo <= 0) return null
        return (
          <div key={i} className="tax-card">
            <div className="tax-card-head">
              <div>
                <strong>{p.nome || 'Partecipante ' + (i + 1)}</strong>
                <span style={{ marginLeft: 8 }} className={`tag-regime ${p.regime === 'forfettario' ? 'tag-forfettario' : 'tag-dipendente'}`}>
                  {p.regime === 'forfettario' ? 'Forfettario' : 'Dipendente'}
                </span>
              </div>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(guadagnoLordo)}</span>
            </div>
            {p.regime === 'forfettario'
              ? <TassForfettario guadagno={guadagnoLordo} />
              : <TassDipendente guadagno={guadagnoLordo} redditoAnnuo={num(p.redditoAnnuo)} />
            }
          </div>
        )
      })}

      <div className="warn-box" style={{ marginTop: 14 }}>
        ⚠️ Se vendita entro 5 anni dall'acquisto originale: <strong>tassa sulla plusvalenza al 26%</strong> in alternativa agli scaglioni IRPEF (verificare con commercialista).<br />
        Se acquistato con agevolazioni <strong>prima casa</strong>: rischio perdita benefici e sanzioni salvo riacquisto entro 1 anno.
      </div>
    </div>
  )
}

function TassForfettario({ guadagno }) {
  const WARN_36K = 36000
  const scaglioni = [
    { da: 0, a: 28000, aliquota: 0.23 },
    { da: 28000, a: 50000, aliquota: 0.33 },
    { da: 50000, a: Infinity, aliquota: 0.43 },
  ]

  let rimanente = guadagno
  let totaleTasse = 0
  const righe = []
  for (const s of scaglioni) {
    if (rimanente <= 0) break
    const base = Math.min(rimanente, s.a - s.da)
    const tassa = base * s.aliquota
    if (base > 0) {
      righe.push({ label: `Scaglione ${pct(s.aliquota)} (fino a ${s.a === Infinity ? '+∞' : fmt(s.a)})`, base, tassa })
      totaleTasse += tassa
    }
    rimanente -= base
  }

  return (
    <div>
      {guadagno > WARN_36K && (
        <div className="warn-box" style={{ marginBottom: 10, fontSize: 12 }}>
          ⚠️ Guadagno supera {fmt(WARN_36K)} — attenzione al limite forfettario. Verificare con commercialista.
        </div>
      )}
      {righe.map((r, i) => (
        <div key={i} className="tax-row">
          <span>{r.label} su {fmt(r.base)}</span>
          <span style={{ color: 'var(--red)' }}>− {fmt(r.tassa)}</span>
        </div>
      ))}
      <div className="tax-total">
        <span>Netto stimato</span>
        <span style={{ color: 'var(--green)' }}>{fmt(guadagno - totaleTasse)}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
        IRPEF totale: {fmt(totaleTasse)} — aliquota effettiva: {pct(totaleTasse / guadagno)}
      </div>
    </div>
  )
}

function TassDipendente({ guadagno, redditoAnnuo }) {
  const scaglioni = [
    { da: 0, a: 28000, aliquota: 0.23 },
    { da: 28000, a: 50000, aliquota: 0.35 },
    { da: 50000, a: Infinity, aliquota: 0.43 },
  ]

  // Calcolo IRPEF sul reddito totale cumulato
  function calcolaIrpef(reddito) {
    let tot = 0
    let rim = reddito
    for (const s of scaglioni) {
      if (rim <= 0) break
      const base = Math.min(rim, s.a - s.da)
      tot += base * s.aliquota
      rim -= base
    }
    return tot
  }

  const redditoTotale = redditoAnnuo + guadagno
  const irpefTotale = calcolaIrpef(redditoTotale)
  const irpefSoloLavoro = calcolaIrpef(redditoAnnuo)
  const irpefSuGuadagno = irpefTotale - irpefSoloLavoro
  const aliquotaMarg = irpefSuGuadagno / guadagno

  return (
    <div>
      <div className="tax-row">
        <span>Reddito da lavoro annuo</span>
        <span>{fmt(redditoAnnuo)}</span>
      </div>
      <div className="tax-row">
        <span>Guadagno immobiliare</span>
        <span>{fmt(guadagno)}</span>
      </div>
      <div className="tax-row">
        <span>Reddito totale cumulato</span>
        <span style={{ fontWeight: 600 }}>{fmt(redditoTotale)}</span>
      </div>
      <div className="tax-row">
        <span>IRPEF totale (su reddito cumulato)</span>
        <span style={{ color: 'var(--red)' }}>− {fmt(irpefTotale)}</span>
      </div>
      <div className="tax-row">
        <span>IRPEF già dovuta (solo lavoro)</span>
        <span style={{ color: 'var(--text2)' }}>− {fmt(irpefSoloLavoro)}</span>
      </div>
      <div className="tax-row">
        <span>IRPEF aggiuntiva sull'immobile</span>
        <span style={{ color: 'var(--red)', fontWeight: 600 }}>− {fmt(irpefSuGuadagno)}</span>
      </div>
      <div className="tax-total">
        <span>Netto stimato dall'operazione</span>
        <span style={{ color: 'var(--green)' }}>{fmt(guadagno - irpefSuGuadagno)}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
        Aliquota marginale effettiva: {pct(aliquotaMarg)} — i redditi si cumulano con quelli da lavoro
      </div>
    </div>
  )
}

// ---- Tab Note ----
function TabNote({ op, update }) {
  return (
    <div className="card">
      <div className="card-title">Note e appunti</div>
      <textarea
        rows={12}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text)', padding: 12, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
        value={op.note || ''}
        onChange={e => update('note', e.target.value)}
        placeholder="Appunti, checklist, link utili…"
      />
      <div style={{ marginTop: 12 }} className="warn-box">
        <strong>Checklist iter operazione:</strong><br />
        □ Ricerca e vista annunci<br />
        □ Divisione planimetrica iniziale<br />
        □ Stima costo rivendita da agenzia<br />
        □ Calcolo €/mq (target 500–600€/mq ristrutturazione)<br />
        □ Regolamento condominiale (no divieto frazionamento)<br />
        □ Verifica urbanistica e catasto<br />
        □ Accordo quote tra partecipanti<br />
        □ Calcolo analitico completo<br />
        □ Rogito notarile acquisto<br />
        □ Inizio lavori<br />
        □ Pratica catastale frazionamento<br />
        □ Rogito notarile rivendita
      </div>
    </div>
  )
}
