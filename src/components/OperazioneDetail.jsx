import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { calcolaRiepilogo, num, fmt, pct } from '../App'

const TABS = ['📊 Riepilogo', '🏠 Acquisto', '🔨 Costi lavori', '🏷️ Lotti vendita', '👥 Partecipanti', '💰 Tassazione & IMU', '📝 Note']

export default function OperazioneDetail({ op, onBack, isMaster }) {
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
            style={{ background: 'transparent', border: 'none', fontSize: 20, fontWeight: 600, padding: 0, color: 'var(--text)', width: '100%' }}
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

      {tab === 0 && <TabRiepilogo op={local} calc={calc} updateField={updateField} isMaster={isMaster} />}
      {tab === 1 && <TabAcquisto op={local} calc={calc} update={updateField} />}
      {tab === 2 && <TabCostiLavori op={local} calc={calc} update={updateField} update2={update} />}
      {tab === 3 && <TabLotti op={local} calc={calc} update={update} />}
      {tab === 4 && <TabPartecipanti op={local} calc={calc} update={update} />}
      {tab === 5 && <TabTassazione op={local} calc={calc} update={update} updateField={updateField} />}
      {tab === 6 && <TabNote op={local} update={updateField} />}

      {isMaster && (
        <div className="delete-zone">
          <button className="btn-danger" onClick={eliminaOperazione}>🗑️ Elimina operazione</button>
        </div>
      )}
    </div>
  )
}

// ---- Tab Riepilogo ----
function TabRiepilogo({ op, calc, updateField, isMaster }) {
  const isPositivo = calc.guadagno >= 0

  // Durata
  let durataGiorni = null, durataMesi = null
  if (op.dataAcquisto && op.dataRivendita) {
    durataGiorni = Math.round((new Date(op.dataRivendita) - new Date(op.dataAcquisto)) / (1000 * 60 * 60 * 24))
    durataMesi = (durataGiorni / 30.44).toFixed(1)
  }

  return (
    <div>
      <div className={`highlight-box ${isPositivo ? '' : 'red'}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 16 }}>
          {[
            { l: 'Investimento totale', v: fmt(calc.costoTotale) },
            { l: 'Incassi stimati', v: fmt(calc.incassiTotali) },
            { l: 'Guadagno lordo', v: fmt(calc.guadagno), color: isPositivo ? 'var(--green)' : 'var(--red)' },
            { l: 'Rendimento', v: pct(calc.rendimento), color: isPositivo ? 'var(--green)' : 'var(--red)' },
          ].map((m, i) => (
            <div key={i}>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{m.l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Codice accesso — solo master */}
      {isMaster && (
        <div className="card">
          <div className="card-title">🔑 Codice accesso cantiere</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="text"
              inputMode="numeric"
              value={op.codiceAccesso || ''}
              onChange={e => updateField('codiceAccesso', e.target.value)}
              placeholder="es. 4821"
              style={{ maxWidth: 140, fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Condividi questo codice con i partecipanti del cantiere</span>
          </div>
        </div>
      )}

      {/* Date e durata */}
      <div className="card">
        <div className="card-title">📅 Durata operazione</div>
        <div className="field-grid">
          <div className="field">
            <label>Data acquisto</label>
            <input type="date" value={op.dataAcquisto || ''} onChange={e => updateField('dataAcquisto', e.target.value)} />
          </div>
          <div className="field">
            <label>Data rivendita (prevista/effettiva)</label>
            <input type="date" value={op.dataRivendita || ''} onChange={e => updateField('dataRivendita', e.target.value)} />
          </div>
        </div>
        {durataGiorni !== null && (
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <div className="result-box" style={{ flex: 1 }}><div className="rl">Giorni</div><div className="rv">{durataGiorni}</div></div>
            <div className="result-box" style={{ flex: 1 }}><div className="rl">Mesi</div><div className="rv">{durataMesi}</div></div>
            <div style={{ flex: 2, alignSelf: 'center' }}>
              {durataGiorni > 5 * 365
                ? <div className="ok" style={{ margin: 0 }}>✓ Oltre 5 anni: nessuna tassa plusvalenza</div>
                : <div className="warn-box" style={{ margin: 0 }}>⚠️ Entro 5 anni: possibile plusvalenza al 26%</div>
              }
            </div>
          </div>
        )}
      </div>

      {/* Metriche al mq — NUOVE */}
      <div className="card">
        <div className="card-title">📐 Analisi al mq (su {calc.mqCommerciali} mq commerciali)</div>
        <div className="result-grid">
          <div className="result-box">
            <div className="rl">Prezzo acquisto al mq</div>
            <div className="rv">{fmt(calc.prezzoAcquistoAlMq)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Acquisto con costi al mq</div>
            <div className="rv">{fmt(calc.prezzoAcquistoConCostiAlMq)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Prezzo rivendita al mq</div>
            <div className="rv">{fmt(calc.prezzoRivenditaAlMq)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Costi e spese al mq</div>
            <div className="rv">{fmt(calc.costiSpeseAlMq)}</div>
          </div>
          <div className="result-box" style={{ background: 'var(--green-bg)', border: '1px solid #34d39930' }}>
            <div className="rl">Guadagno al mq (con spese)</div>
            <div className="rv" style={{ color: calc.guadagnoAlMqConSpese >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(calc.guadagnoAlMqConSpese)}</div>
          </div>
          <div className="result-box">
            <div className="rl">Guadagno al mq (senza spese)</div>
            <div className="rv">{fmt(calc.guadagnoAlMqSenzaSpese)}</div>
          </div>
        </div>
      </div>

      {/* Struttura costi */}
      <div className="card">
        <div className="card-title">Struttura dei costi</div>
        <div className="result-grid">
          {[
            { l: 'Prezzo acquisto', v: fmt(num(op.prezzAcquisto)) },
            { l: 'Commissione + IVA acquisto', v: fmt(calc.costoAgenziaAcquisto) },
            { l: 'Imposta di registro', v: fmt(calc.impostaRegistro) },
            { l: 'Imp. catastale/ipotecaria', v: fmt(calc.impostaCatIpot) },
            { l: 'Notaio', v: fmt(num(op.costoNotaio)) },
            { l: 'Totale acquisto', v: fmt(calc.costoTotaleAcquisto), accent: true },
            { l: 'Ristrutturazione', v: fmt(calc.costoRist) },
            { l: 'Altri costi (pulizia, condominio, ecc.)', v: fmt(calc.altriCosti) },
            { l: 'Commissione rivendita (50%)', v: fmt(calc.costoAgenziaRivendita) },
          ].map((m, i) => (
            <div key={i} className="result-box" style={m.accent ? { background: 'var(--bg)', border: '1px solid var(--border2)' } : {}}>
              <div className="rl">{m.l}</div>
              <div className="rv" style={m.accent ? { color: 'var(--accent2)' } : {}}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quote partecipanti */}
      {(op.partecipanti || []).length > 0 && (
        <div className="card">
          <div className="card-title">👥 Quote partecipanti</div>
          {(op.partecipanti || []).map((p, i) => {
            const q = num(p.quota) / 100
            const bonusP = p.attivo
              ? (num(op.bonusGestione) / 100) * (op.lotti || []).reduce((s, l) => s + Math.max(0, num(l.prezzoVendita) - num(l.prezzoMinimo)), 0) * (num(p.quotaBonus) / 100)
              : 0
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 110px 110px', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{p.nome || '—'}</div>
                  <span className={`tag-regime ${p.regime === 'forfettario' ? 'tag-forfettario' : 'tag-dipendente'}`}>{p.regime}</span>
                  {p.attivo && <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--green)' }}>⚡</span>}
                </div>
                <div style={{ color: 'var(--accent2)', fontWeight: 600 }}>{pct(q)}</div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Investe</div><strong>{fmt(calc.costoTotale * q)}</strong></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Bonus</div><strong style={{ color: 'var(--green)' }}>{bonusP > 0 ? '+' + fmt(bonusP) : '—'}</strong></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Guadagna</div><strong style={{ color: (calc.guadagno * q + bonusP) >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(calc.guadagno * q + bonusP)}</strong></div>
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
            <label>Commissione agenzia acquisto</label>
            <input type="number" step="0.01" value={op.commissioneAgenzia || ''} onChange={e => update('commissioneAgenzia', e.target.value)} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{pct(num(op.commissioneAgenzia))} → {fmt(calc.costoAgenziaAcquisto)}</span>
          </div>
          <div className="field">
            <label>IVA su commissione</label>
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
          <div className="result-box"><div className="rl">Rendita rivalutata (+5%)</div><div className="rv">{fmt(calc.renditaRivalutata)}</div></div>
          <div className="result-box"><div className="rl">Valore catastale (×120)</div><div className="rv">{fmt(calc.valoreCatastale)}</div></div>
          <div className="result-box"><div className="rl">Imposta di registro (9%)</div><div className="rv">{fmt(calc.impostaRegistro)}</div></div>
          <div className="result-box"><div className="rl">Imp. catastale + ipotecaria</div><div className="rv">{fmt(calc.impostaCatIpot)}</div></div>
          <div className="result-box" style={{ background: 'var(--bg)', border: '1px solid var(--border2)' }}>
            <div className="rl">TOTALE ACQUISTO</div>
            <div className="rv" style={{ color: 'var(--accent2)' }}>{fmt(calc.costoTotaleAcquisto)}</div>
          </div>
        </div>
      </div>
      <div className="info-box">
        ℹ️ Imposta di registro calcolata sul valore catastale (rendita × 1.05 × 120) al 9%, con €100 fissi per imposte catastale e ipotecaria. Operazione come seconda casa.
      </div>
    </div>
  )
}

// ---- Tab Costi Lavori ----
function TabCostiLavori({ op, calc, update, update2 }) {
  const vociCapitolato = op.vociCapitolato || []

  function addVoce() {
    update2({ vociCapitolato: [...vociCapitolato, { id: Date.now(), desc: '', importo: 0 }] })
  }
  function updateVoce(idx, field, val) {
    update2({ vociCapitolato: vociCapitolato.map((v, i) => i === idx ? { ...v, [field]: val } : v) })
  }
  function removeVoce(idx) {
    update2({ vociCapitolato: vociCapitolato.filter((_, i) => i !== idx) })
  }
  const totCapitolato = vociCapitolato.reduce((s, v) => s + num(v.importo), 0)

  return (
    <div>
      <div className="card">
        <div className="card-title">Dati immobile</div>
        <div className="field-grid">
          <div className="field">
            <label>Mq netti calpestabili (appartamento iniziale)</label>
            <input type="number" value={op.mqNetti || ''} onChange={e => update('mqNetti', e.target.value)} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Base per calcolo costo ristrutturazione</span>
          </div>
          <div className="field">
            <label>Mq commerciali</label>
            <input type="number" value={op.mqCommerciali || ''} onChange={e => update('mqCommerciali', e.target.value)} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Base per calcolo metriche al mq</span>
          </div>
          <div className="field">
            <label>Costo ristrutturazione al mq (€)</label>
            <input type="number" value={op.costoRistMq || ''} onChange={e => update('costoRistMq', e.target.value)} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Totale: {fmt(calc.costoRist)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">📋 Capitolato lavori</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
          Inserisci le voci dal tuo Excel. Tutti i partecipanti possono modificarle.
        </div>
        {vociCapitolato.length > 0 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 34px', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Descrizione</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Importo (€)</span>
              <span></span>
            </div>
            {vociCapitolato.map((v, i) => (
              <div key={v.id || i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 34px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input value={v.desc || ''} onChange={e => updateVoce(i, 'desc', e.target.value)} placeholder="es. Rifacimento bagno" style={{ fontSize: 13 }} />
                <input type="number" value={v.importo || ''} onChange={e => updateVoce(i, 'importo', e.target.value)} placeholder="€" style={{ fontSize: 13 }} />
                <button className="btn-icon" onClick={() => removeVoce(i)}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent2)' }}>Totale capitolato: {fmt(totCapitolato)}</span>
            </div>
          </div>
        )}
        <button className="btn-ghost" style={{ marginTop: 4 }} onClick={addVoce}>+ Aggiungi voce</button>
      </div>

      <div className="card">
        <div className="card-title">Altri costi</div>
        <div className="field-grid">
          {[
            { label: 'Pulizia casa e androne (€)', key: 'pulizia' },
            { label: 'Pratica comunale + diritti enti (€)', key: 'praticaComune' },
            { label: 'Tabelle millesimali (€)', key: 'tabelleMillesimali' },
            { label: 'Spese condominiali stimate (€)', key: 'speseCondominio', sub: 'Per tutta la durata del possesso' },
            { label: 'Allacci e utenze (€)', key: 'allacci' },
          ].map(f => (
            <div key={f.key} className="field">
              <label>{f.label}</label>
              <input type="number" value={op[f.key] || ''} onChange={e => update(f.key, e.target.value)} />
              {f.sub && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{f.sub}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Riepilogo costi lavori</div>
        <div className="result-grid">
          <div className="result-box"><div className="rl">Ristrutturazione (€/mq × {op.mqNetti} mq)</div><div className="rv">{fmt(calc.costoRist)}</div></div>
          <div className="result-box"><div className="rl">Capitolato dettaglio</div><div className="rv">{fmt(totCapitolato)}</div></div>
          <div className="result-box"><div className="rl">Pulizia</div><div className="rv">{fmt(num(op.pulizia))}</div></div>
          <div className="result-box"><div className="rl">Pratica comunale</div><div className="rv">{fmt(num(op.praticaComune))}</div></div>
          <div className="result-box"><div className="rl">Tabelle millesimali</div><div className="rv">{fmt(num(op.tabelleMillesimali))}</div></div>
          <div className="result-box"><div className="rl">Spese condominiali</div><div className="rv">{fmt(num(op.speseCondominio))}</div></div>
          <div className="result-box"><div className="rl">Allacci e utenze</div><div className="rv">{fmt(num(op.allacci))}</div></div>
          <div className="result-box"><div className="rl">Commissione rivendita (50%)</div><div className="rv">{fmt(calc.costoAgenziaRivendita)}</div></div>
        </div>
      </div>

      <div className="warn-box">
        ⚠️ Verificare: rapporto aeroilluminante (finestre ≥ 1/8 pavimento), fattibilità scarichi nuovo bagno/cucina, regolamento condominiale (no divieto frazionamento).
      </div>
    </div>
  )
}

// ---- Tab Lotti ----
function TabLotti({ op, calc, update }) {
  const lotti = op.lotti || []

  function addLotto() {
    update({ lotti: [...lotti, { id: Date.now(), nome: `Appartamento ${lotti.length + 1}`, mqNetti: 0, prezzoVendita: 0, prezzoMinimo: 0 }] })
  }
  function updateLotto(idx, field, val) {
    update({ lotti: lotti.map((l, i) => i === idx ? { ...l, [field]: val } : l) })
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 130px 130px 80px 34px', gap: 8, marginBottom: 4 }}>
              {['Nome', 'Mq', 'Prezzo minimo', 'Prezzo vendita', '€/mq', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            {lotti.map((l, i) => {
              const mq = num(l.mqNetti), prz = num(l.prezzoVendita)
              const xMq = mq > 0 ? Math.round(prz / mq) : null
              const surplus = num(l.prezzoVendita) - num(l.prezzoMinimo)
              return (
                <div key={l.id || i}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 130px 130px 80px 34px', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                    <input value={l.nome || ''} onChange={e => updateLotto(i, 'nome', e.target.value)} style={{ fontSize: 13 }} />
                    <input type="number" value={l.mqNetti || ''} onChange={e => updateLotto(i, 'mqNetti', e.target.value)} placeholder="mq" style={{ fontSize: 13 }} />
                    <input type="number" value={l.prezzoMinimo || ''} onChange={e => updateLotto(i, 'prezzoMinimo', e.target.value)} placeholder="€ min" style={{ fontSize: 13 }} />
                    <input type="number" value={l.prezzoVendita || ''} onChange={e => updateLotto(i, 'prezzoVendita', e.target.value)} placeholder="€" style={{ fontSize: 13 }} />
                    <span style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>{xMq ? `${xMq}€` : '—'}</span>
                    <button className="btn-icon" onClick={() => removeLotto(i)}>✕</button>
                  </div>
                  {surplus > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--green)', marginBottom: 8, paddingLeft: 4 }}>
                      ↑ Surplus su minimo: {fmt(surplus)} → andrà a chi ha partecipato attivamente
                    </div>
                  )}
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
            <div className="result-box"><div className="rl">Incassi totali</div><div className="rv" style={{ color: 'var(--green)' }}>{fmt(calc.incassiTotali)}</div></div>
            <div className="result-box"><div className="rl">Incassi minimi</div><div className="rv">{fmt(lotti.reduce((s, l) => s + num(l.prezzoMinimo), 0))}</div></div>
            <div className="result-box"><div className="rl">Surplus totale</div><div className="rv" style={{ color: 'var(--green)' }}>{fmt(lotti.reduce((s, l) => s + Math.max(0, num(l.prezzoVendita) - num(l.prezzoMinimo)), 0))}</div></div>
            <div className="result-box"><div className="rl">Commissione rivendita (50%)</div><div className="rv" style={{ color: 'var(--red)' }}>− {fmt(calc.costoAgenziaRivendita)}</div></div>
            <div className="result-box"><div className="rl">Guadagno operazione</div><div className="rv" style={{ color: calc.guadagno >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(calc.guadagno)}</div></div>
            <div className="result-box"><div className="rl">Rendimento</div><div className="rv" style={{ color: calc.rendimento >= 0 ? 'var(--green)' : 'var(--red)' }}>{pct(calc.rendimento)}</div></div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Tab Partecipanti ----
function TabPartecipanti({ op, calc, update }) {
  const partecipanti = op.partecipanti || []
  const totaleQuote = partecipanti.reduce((s, p) => s + num(p.quota), 0)
  const quoteOk = Math.abs(totaleQuote - 100) < 0.1
  const surplusTotale = (op.lotti || []).reduce((s, l) => s + Math.max(0, num(l.prezzoVendita) - num(l.prezzoMinimo)), 0)
  const poolBonus = surplusTotale * (num(op.bonusGestione) / 100)
  const totQuoteBonus = partecipanti.filter(p => p.attivo).reduce((s, p) => s + num(p.quotaBonus), 0)
  const bonusOk = Math.abs(totQuoteBonus - 100) < 0.1 || !partecipanti.some(p => p.attivo)

  function addP() {
    update({ partecipanti: [...partecipanti, { id: Date.now(), nome: '', quota: 0, regime: 'dipendente', redditoAnnuo: 0, attivo: false, quotaBonus: 0 }] })
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
        <div className="card-title">Partecipanti</div>
        {partecipanti.map((p, i) => (
          <div key={p.id || i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 140px 120px 34px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input value={p.nome || ''} onChange={e => updateP(i, 'nome', e.target.value)} placeholder="Nome e cognome" style={{ fontSize: 13 }} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Quota %</div>
                <input type="number" step="0.1" value={p.quota || ''} onChange={e => updateP(i, 'quota', e.target.value)} style={{ fontSize: 13 }} />
              </div>
              <select value={p.regime || 'dipendente'} onChange={e => updateP(i, 'regime', e.target.value)} style={{ fontSize: 13 }}>
                <option value="dipendente">Dipendente</option>
                <option value="forfettario">Forfettario</option>
              </select>
              {p.regime === 'dipendente' && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>Reddito annuo (€)</div>
                  <input type="number" value={p.redditoAnnuo || ''} onChange={e => updateP(i, 'redditoAnnuo', e.target.value)} placeholder="es. 35000" style={{ fontSize: 13 }} />
                </div>
              )}
              {p.regime === 'forfettario' && <div />}
              <button className="btn-icon" onClick={() => removeP(i)}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={p.attivo || false} onChange={e => updateP(i, 'attivo', e.target.checked)} />
                Partecipante attivo (ha contribuito alla gestione)
              </label>
              {p.attivo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>% del bonus pool:</span>
                  <input type="number" value={p.quotaBonus || ''} onChange={e => updateP(i, 'quotaBonus', e.target.value)} style={{ width: 70, fontSize: 13 }} placeholder="%" />
                </div>
              )}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button className="btn-ghost" onClick={addP}>+ Aggiungi partecipante</button>
          {partecipanti.length > 0 && (
            <span style={{ fontSize: 13, color: quoteOk ? 'var(--green)' : 'var(--yellow)' }}>
              Quote: <strong>{totaleQuote.toFixed(1)}%</strong> {quoteOk ? '✓' : '⚠ devono fare 100%'}
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">🏆 Bonus gestione</div>
        <div className="field-grid" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>% del surplus destinata agli attivi</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="number" value={op.bonusGestione || ''} onChange={e => update('bonusGestione', e.target.value)} placeholder="es. 50" style={{ maxWidth: 100 }} />
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>% — Pool: {fmt(poolBonus)}</span>
            </div>
          </div>
        </div>
        {surplusTotale > 0 && partecipanti.some(p => p.attivo) && (
          <div>
            {partecipanti.filter(p => p.attivo).map((p, i) => {
              const bonusP = poolBonus * (num(p.quotaBonus) / 100)
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span>{p.nome} ({p.quotaBonus || 0}% del pool)</span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>+{fmt(bonusP)}</span>
                </div>
              )
            })}
            {!bonusOk && <div className="warn-box" style={{ marginTop: 8 }}>⚠️ Le % bonus degli attivi devono fare 100% (attuale: {totQuoteBonus.toFixed(1)}%)</div>}
          </div>
        )}
        {surplusTotale === 0 && <div style={{ fontSize: 13, color: 'var(--text3)' }}>Nessun surplus. Inserisci prezzi minimi nei lotti.</div>}
      </div>

      {partecipanti.length > 0 && calc.costoTotale > 0 && (
        <div className="card">
          <div className="card-title">Riepilogo finale</div>
          {partecipanti.map((p, i) => {
            const q = num(p.quota) / 100
            const bonusP = p.attivo ? poolBonus * (num(p.quotaBonus) / 100) : 0
            const guadagnoFinale = calc.guadagno * q + bonusP
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 110px 110px', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13, alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{p.nome || '—'}</div>
                  <span className={`tag-regime ${p.regime === 'forfettario' ? 'tag-forfettario' : 'tag-dipendente'}`}>{p.regime}</span>
                  {p.attivo && <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--green)' }}>⚡ attivo</span>}
                </div>
                <div style={{ color: 'var(--accent2)', fontWeight: 600 }}>{pct(q)}</div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Investe</div><strong>{fmt(calc.costoTotale * q)}</strong></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Bonus</div><strong style={{ color: 'var(--green)' }}>{bonusP > 0 ? '+' + fmt(bonusP) : '—'}</strong></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Guadagno totale</div><strong style={{ color: guadagnoFinale >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(guadagnoFinale)}</strong></div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- Tab Tassazione & IMU ----
function TabTassazione({ op, calc, update, updateField }) {
  const partecipanti = op.partecipanti || []
  const aliquotaImu = num(op.aliquotaImu) || 0.0106
  const annoiPossesso = op.dataAcquisto && op.dataRivendita
    ? Math.max(1 / 12, (new Date(op.dataRivendita) - new Date(op.dataAcquisto)) / (1000 * 60 * 60 * 24 * 365))
    : null
  const surplusTotale = (op.lotti || []).reduce((s, l) => s + Math.max(0, num(l.prezzoVendita) - num(l.prezzoMinimo)), 0)
  const poolBonus = surplusTotale * (num(op.bonusGestione) / 100)

  return (
    <div>
      <div className="info-box" style={{ marginBottom: 14 }}>
        ℹ️ <strong>Forfettario:</strong> scaglioni IRPEF separati — non si sommano al reddito forfettario.<br />
        ℹ️ <strong>Dipendente:</strong> redditi cumulati → scaglioni più alti.<br />
        ℹ️ Possibile alternativa: <strong>imposta sostitutiva 26%</strong> sulla plusvalenza se vendita entro 5 anni.
      </div>

      <div className="card">
        <div className="card-title">🏛️ IMU</div>
        <div className="field-grid">
          <div className="field">
            <label>Aliquota IMU (default 1.06%)</label>
            <input type="number" step="0.0001" value={op.aliquotaImu || 0.0106} onChange={e => updateField('aliquotaImu', e.target.value)} />
          </div>
          <div className="field">
            <label>Valore catastale calcolato</label>
            <input type="text" value={fmt(calc.valoreCatastale)} disabled style={{ color: 'var(--text2)' }} />
          </div>
        </div>
        {annoiPossesso ? (
          <div className="result-grid" style={{ marginTop: 10 }}>
            <div className="result-box"><div className="rl">IMU annua totale immobile</div><div className="rv">{fmt(calc.valoreCatastale * aliquotaImu)}</div></div>
            <div className="result-box"><div className="rl">Durata possesso</div><div className="rv">{annoiPossesso.toFixed(2)} anni</div></div>
            <div className="result-box"><div className="rl">IMU totale stimata</div><div className="rv" style={{ color: 'var(--red)' }}>{fmt(calc.valoreCatastale * aliquotaImu * annoiPossesso)}</div></div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 8 }}>Inserisci le date nel Riepilogo per calcolare l'IMU totale.</div>
        )}
      </div>

      {partecipanti.length === 0 && <div className="warn-box">⚠️ Aggiungi i partecipanti per vedere il calcolo fiscale individuale.</div>}

      {partecipanti.map((p, i) => {
        const q = num(p.quota) / 100
        const bonusP = p.attivo ? poolBonus * (num(p.quotaBonus) / 100) : 0
        const guadagnoLordo = calc.guadagno * q + bonusP
        const imuPersonale = annoiPossesso ? calc.valoreCatastale * aliquotaImu * annoiPossesso * q : 0
        const guadagnoDopoImu = guadagnoLordo - imuPersonale
        if (guadagnoLordo <= 0) return null
        return (
          <div key={i} className="tax-card">
            <div className="tax-card-head">
              <div>
                <strong>{p.nome || 'Partecipante ' + (i + 1)}</strong>
                <span style={{ marginLeft: 8 }} className={`tag-regime ${p.regime === 'forfettario' ? 'tag-forfettario' : 'tag-dipendente'}`}>{p.regime}</span>
                {p.attivo && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--green)' }}>⚡ attivo</span>}
              </div>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>Lordo: {fmt(guadagnoLordo)}</span>
            </div>
            {imuPersonale > 0 && <div className="tax-row"><span>IMU quota {pct(q)} × {annoiPossesso?.toFixed(1)} anni</span><span style={{ color: 'var(--red)' }}>− {fmt(imuPersonale)}</span></div>}
            <div className="tax-row"><span>Guadagno dopo IMU</span><span style={{ fontWeight: 600 }}>{fmt(guadagnoDopoImu)}</span></div>
            <hr className="divider" />
            {p.regime === 'forfettario'
              ? <TassForfettario guadagno={guadagnoDopoImu} />
              : <TassDipendente guadagno={guadagnoDopoImu} redditoAnnuo={num(p.redditoAnnuo)} />
            }
          </div>
        )
      })}

      <div className="warn-box" style={{ marginTop: 14 }}>
        ⚠️ Se vendita entro 5 anni: valutare <strong>imposta sostitutiva 26%</strong> sulla plusvalenza.<br />
        Se acquistato con <strong>prima casa</strong>: rischio perdita benefici e sanzioni salvo riacquisto entro 1 anno.
      </div>
    </div>
  )
}

function TassForfettario({ guadagno }) {
  const scaglioni = [{ da: 0, a: 28000, al: 0.23 }, { da: 28000, a: 50000, al: 0.33 }, { da: 50000, a: Infinity, al: 0.43 }]
  let rim = guadagno, tot = 0
  const righe = []
  for (const s of scaglioni) {
    if (rim <= 0) break
    const base = Math.min(rim, s.a - s.da)
    const t = base * s.al
    if (base > 0) { righe.push({ label: `Scaglione ${pct(s.al)} su ${fmt(base)}`, t }); tot += t }
    rim -= base
  }
  return (
    <div>
      {guadagno > 36000 && <div className="warn-box" style={{ marginBottom: 8, fontSize: 12 }}>⚠️ Supera €36.000 — attenzione al limite forfettario!</div>}
      {righe.map((r, i) => <div key={i} className="tax-row"><span>{r.label}</span><span style={{ color: 'var(--red)' }}>− {fmt(r.t)}</span></div>)}
      <div className="tax-total"><span>Netto stimato</span><span style={{ color: 'var(--green)' }}>{fmt(guadagno - tot)}</span></div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>IRPEF: {fmt(tot)} — aliquota effettiva: {pct(tot / guadagno)}</div>
    </div>
  )
}

function TassDipendente({ guadagno, redditoAnnuo }) {
  const scaglioni = [{ da: 0, a: 28000, al: 0.23 }, { da: 28000, a: 50000, al: 0.35 }, { da: 50000, a: Infinity, al: 0.43 }]
  function calcIrpef(r) {
    let tot = 0, rim = r
    for (const s of scaglioni) { if (rim <= 0) break; const b = Math.min(rim, s.a - s.da); tot += b * s.al; rim -= b }
    return tot
  }
  const irpefAgg = calcIrpef(redditoAnnuo + guadagno) - calcIrpef(redditoAnnuo)
  return (
    <div>
      <div className="tax-row"><span>Reddito da lavoro</span><span>{fmt(redditoAnnuo)}</span></div>
      <div className="tax-row"><span>Guadagno immobiliare</span><span>{fmt(guadagno)}</span></div>
      <div className="tax-row"><span>Reddito totale cumulato</span><span style={{ fontWeight: 600 }}>{fmt(redditoAnnuo + guadagno)}</span></div>
      <div className="tax-row"><span>IRPEF aggiuntiva sull'immobile</span><span style={{ color: 'var(--red)', fontWeight: 600 }}>− {fmt(irpefAgg)}</span></div>
      <div className="tax-total"><span>Netto stimato</span><span style={{ color: 'var(--green)' }}>{fmt(guadagno - irpefAgg)}</span></div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Aliquota marginale: {pct(irpefAgg / guadagno)}</div>
    </div>
  )
}

// ---- Tab Note ----
function TabNote({ op, update }) {
  return (
    <div className="card">
      <div className="card-title">Note e appunti liberi</div>
      <textarea
        rows={14}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text)', padding: 12, fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
        value={op.note || ''}
        onChange={e => update('note', e.target.value)}
        placeholder="Appunti, link utili, contatti agenzia, stato trattativa…"
      />
    </div>
  )
}
