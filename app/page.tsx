'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  FlaskConical,
  Gauge,
  History,
  LayoutDashboard,
  Menu,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UserRound,
  X,
  Zap,
} from 'lucide-react'

type GateName = 'X' | 'H' | 'Y' | 'Z' | 'S' | 'T' | 'CNOT' | 'Measure'
type Gate = { id: string; name: GateName; qubit: number; column: number; target?: number }
type Simulation = {
  probabilities: Record<string, number>;
  counts: Record<string, number>;
  statevector: { real: number; imag: number }[];
  numQubits: number;
  backend: string;
  executionMs: number;
  timestamp: string;
}
type Experiment = { id: string; name: string; gates: Gate[]; qubits: number; simulation: Simulation }

const gateInfo: Record<GateName, { description: string; detail: string; qubits: number }> = {
  X: { description: 'Flips a qubit from 0 to 1.', detail: 'Pauli-X is the quantum NOT gate.', qubits: 1 },
  H: { description: 'Creates a balanced superposition.', detail: 'The Hadamard gate spreads amplitude evenly.', qubits: 1 },
  Y: { description: 'Rotates around the Y axis.', detail: 'A Pauli-Y rotation with a phase shift.', qubits: 1 },
  Z: { description: 'Changes phase without flipping.', detail: 'Pauli-Z leaves 0 and phases 1.', qubits: 1 },
  S: { description: 'Adds a quarter-turn phase.', detail: 'A phase gate equal to a Z rotation.', qubits: 1 },
  T: { description: 'Adds an eighth-turn phase.', detail: 'A smaller phase rotation than S.', qubits: 1 },
  CNOT: { description: 'Flips a target when control is 1.', detail: 'A controlled-X gate for two qubits.', qubits: 2 },
  Measure: { description: 'Reads a qubit as 0 or 1.', detail: 'Measurement turns amplitudes into outcomes.', qubits: 1 },
}

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'builder', label: 'Circuit Builder', icon: Code2 },
  { id: 'challenges', label: 'Challenges', icon: Target },
  { id: 'tutor', label: 'AI Tutor', icon: BrainCircuit },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
]
const defaultGates: Gate[] = [
  { id: 'h-0', name: 'H', qubit: 0, column: 0 },
  { id: 'measure-0', name: 'Measure', qubit: 0, column: 3 },
]
const learningModules = [
  {
    id: 1,
    title: 'Basics of Quantum Information',
    topics: ['Qubits', 'Quantum States', 'Classical vs Quantum'],
    level: 'Beginner',
  },
  {
    id: 2,
    title: 'Quantum Circuits',
    topics: ['Circuit Model', 'Qubit Registers', 'Circuit Depth'],
    level: 'Beginner',
  },
  {
    id: 3,
    title: 'Quantum Gates',
    topics: ['X Gate', 'H Gate', 'Y Gate', 'Z Gate', 'S Gate', 'T Gate'],
    level: 'Beginner',
  },
  {
    id: 4,
    title: 'Quantum Measurement',
    topics: ['Measurement', 'Probabilities', 'Measurement Outcomes'],
    level: 'Beginner',
  },
  {
    id: 5,
    title: 'Multi-Qubit Systems',
    topics: ['Multiple Qubits', 'Quantum Registers', 'Multi-Qubit States'],
    level: 'Intermediate',
  },
  {
    id: 6,
    title: 'Entanglement',
    topics: ['CNOT Gate', 'Bell States', 'Quantum Entanglement'],
    level: 'Intermediate',
  },
  {
    id: 7,
    title: 'Quantum Algorithms',
    topics: ['Deutsch-Jozsa', 'Grover’s Algorithm', 'Quantum Advantage'],
    level: 'Intermediate',
  },
  {
    id: 8,
    title: 'Introduction to Qiskit',
    topics: ['Circuit Creation', 'Simulation', 'Running Quantum Circuits'],
    level: 'Intermediate',
  },
]

function simulate(gates: Gate[], qubits: number): Simulation {
  const amplitudes = new Map<string, number>([['0'.repeat(qubits), 1]])
  const ordered = [...gates].sort((a, b) => a.column - b.column)
  for (const gate of ordered) {
    if (gate.name === 'Measure') continue
    const next = new Map<string, number>()
    const add = (key: string, value: number) => next.set(key, (next.get(key) || 0) + value)
    for (const [state, amp] of amplitudes) {
      const bit = state[qubits - 1 - gate.qubit]
      if (gate.name === 'X') { const flipped = state.slice(0, qubits - 1 - gate.qubit) + (bit === '0' ? '1' : '0') + state.slice(qubits - gate.qubit); add(flipped, amp) }
      else if (gate.name === 'H') { add(state, amp / Math.sqrt(2)); const flipped = state.slice(0, qubits - 1 - gate.qubit) + (bit === '0' ? '1' : '0') + state.slice(qubits - gate.qubit); add(flipped, amp * (bit === '0' ? 1 : -1) / Math.sqrt(2)) }
      else if (gate.name === 'CNOT') { const target = gate.target ?? 1; if (state[qubits - 1 - gate.qubit] === '1') { const idx = qubits - 1 - target; const flipped = state.slice(0, idx) + (state[idx] === '0' ? '1' : '0') + state.slice(idx + 1); add(flipped, amp) } else add(state, amp) }
      else add(state, amp)
    }
    amplitudes.clear(); next.forEach((v, k) => amplitudes.set(k, v))
  }
  const probabilities: Record<string, number> = {}
  for (const i of Array.from({ length: 2 ** qubits }, (_, n) => n.toString(2).padStart(qubits, '0'))) probabilities[i] = Math.round((amplitudes.get(i) || 0) ** 2 * 100) / 100
    return {
    probabilities,
    counts: Object.fromEntries(
      Object.entries(probabilities).map(([state, probability]) => [
        state,
        Math.round(probability * 1024),
      ])
    ),
    statevector: [...amplitudes.entries()].map(
      ([s, a]) => `|${s}⟩  ${a.toFixed(3)}`
    ),
    backend: 'Local Aer-compatible adapter',
    executionMs: 42,
    timestamp: new Date().toISOString(),
  }
}

function BlochSphere({ simulation }: { simulation?: Simulation }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); camera.position.z = 3
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(190, 190); ref.current.innerHTML = ''; ref.current.appendChild(renderer.domElement)
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x1d3650, transparent: true, opacity: .22, wireframe: true })); scene.add(sphere)
    const axis = new THREE.AxesHelper(1.25); scene.add(axis)
    const vector = new THREE.Vector3(0, 0, 1); const p = simulation?.probabilities || {}; if (p['1'] > .5) vector.set(0, 0, -1); if (p['0'] && p['1']) vector.set(.7, .3, .6).normalize()
    const arrow = new THREE.ArrowHelper(vector, new THREE.Vector3(0, 0, 0), 1.1, 0x64d8cb, .14, .08); scene.add(arrow)
    let frame = 0; const animate = () => { frame = requestAnimationFrame(animate); sphere.rotation.y += .004; renderer.render(scene, camera) }; animate()
    return () => { cancelAnimationFrame(frame); renderer.dispose(); ref.current?.replaceChildren() }
  }, [simulation])
  return <div ref={ref} className="bloch" aria-label="Interactive Bloch sphere" />
}

export default function Page() {
  const [active, setActive] = useState('dashboard'); const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system'); const [gates, setGates] = useState<Gate[]>(defaultGates); const [simulation, setSimulation] = useState<Simulation>(); const [experiments, setExperiments] = useState<Experiment[]>([]); const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState(''); const [running, setRunning] = useState(false); const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedGate, setSelectedGate] = useState<GateName | null>(null)
  const [qubits, setQubits] = useState(2)
  useEffect(() => {
  document.documentElement.classList.remove('light', 'dark');

  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  }
}, [theme]);
  useEffect(() => { try { setExperiments(JSON.parse(localStorage.getItem('quantumlab-experiments') || '[]')) } catch {} }, [])
  const saveExperiment = (next: Simulation) => { const item = { id: crypto.randomUUID(), name: gates.map(g => g.name).join(' → '), gates, qubits, simulation: next }; const updated = [item, ...experiments].slice(0, 8); setExperiments(updated); localStorage.setItem('quantumlab-experiments', JSON.stringify(updated)) }
 
  const addGate = (name: GateName) => {
  setSelectedGate(name)
}
  const runCircuit = async () => {
  setRunning(true)

  try {
    const response = await fetch('http://127.0.0.1:8000/api/simulate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qubits,
        gates: gates.map((g) => {
          if (g.name === 'CNOT') {
            return {
              gate: 'CNOT',
              position: g.column,
              control: g.qubit,
              target: g.target ?? 1,
            }
          }

          return {
            gate: g.name === 'Measure' ? 'MEASURE' : g.name,
            qubit: g.qubit,
            position: g.column,
          }
        }),
        shots: 1024,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend error:', errorText)
      alert(`Backend error: ${errorText}`)
      return
    }

    const result = await response.json()

    const probabilities: Record<string, number> = {}

    Object.entries(result.counts).forEach(([state, count]) => {
      probabilities[state] = (count as number) / result.shots
    })

    const simulationResult: Simulation = {
      probabilities,
      counts: result.counts,
      statevector: result.statevector,
      backend: 'Qiskit Aer',
      executionMs: result.execution_time_ms,
      timestamp: new Date().toISOString(),
    }

    setSimulation(simulationResult)
    saveExperiment(simulationResult)
    setActive('simulation')
  } catch (error) {
    console.error(error)
    alert(`Simulation failed: ${error}`)
  } finally {
    setRunning(false)
  }
}
const placeGate = (qubit: number, column: number) => {
  if (!selectedGate) return

  const newGate: Gate = {
    id: `${selectedGate}-${Date.now()}`,
    name: selectedGate,
    qubit,
    column,
    target: selectedGate === 'CNOT'
      ? (qubit === 0 ? 1 : 0)
      : undefined,
  }

  setGates([...gates, newGate])
  setSelectedGate(null)
}
  const askTutor = async (q = question) => {
    console.log('QUESTION SENT:', q)
  if (!simulation) {
    setAnswer(
      'Run your circuit first so I can ground the explanation in your actual simulation output.'
    )
    return
  }

  try {
    const response = await fetch('http://127.0.0.1:8000/api/tutor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: q,
        qubits,
        gates: gates.map((g) => {
          if (g.name === 'CNOT') {
            return {
              gate: 'CNOT',
              position: g.column,
              control: g.qubit,
              target: g.target ?? 1,
            }
          }

          return {
            gate: g.name === 'Measure' ? 'MEASURE' : g.name,
            position: g.column,
            qubit: g.qubit,
          }
        }),
        counts: simulation.counts,
        probabilities: simulation.probabilities,
        statevector: simulation.statevector,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Tutor backend error:', errorText)
      setAnswer('The AI Tutor could not process your question right now.')
      return
    }

    const result = await response.json()

console.log('TUTOR RESPONSE:', result)
setAnswer(result.answer || 'No answer received from tutor.')
  } catch (error) {
    console.error('Tutor request failed:', error)
    setAnswer('Unable to connect to the AI Tutor backend.')
  }
}
  const summary = useMemo(() => ({ depth: gates.length ? Math.max(...gates.map(g => g.column)) + 1 : 0, used: [...new Set(gates.map(g => g.name))] }), [gates])
  const go = (id: string) => { setActive(id); setMobileOpen(false) }
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}><div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>Quantum<span>Lab</span></span></div><div className="workspace-label">LEARNING SPACE</div><nav>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={active === item.id || (active === 'simulation' && item.id === 'builder') ? 'nav-item active' : 'nav-item'} onClick={() => go(item.id)}><Icon size={17} /><span>{item.label}</span>{item.id === 'builder' && <span className="nav-dot" />}</button> })}</nav><div className="sidebar-bottom"><div className="streak"><div className="streak-icon"><Zap size={16} /></div><div><b>3 day streak</b><span>Keep learning momentum</span></div></div><button className="profile"><span className="avatar">JS</span><span><b>Jordan Smith</b><small>Beginner level</small></span><ChevronRight size={15} /></button></div></aside>
    <main className="main"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={20} /></button><div className="crumb"><span>QuantumLab</span><ChevronRight size={14} /><b>{active === 'dashboard' ? 'Dashboard' : active[0].toUpperCase() + active.slice(1)}</b></div><div className="top-actions"><span className="level-pill"><span className="level-dot" /> Level 2 <span className="muted">/ 5</span></span><div className="top-progress"><span style={{ width: '42%' }} /></div><button className="icon-button"><CircleHelp size={18} /></button><select
  value={theme}
  onChange={(e) =>
    setTheme(e.target.value as 'system' | 'light' | 'dark')
  }
  className="theme-select"
>
  <option value="system">System</option>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
</select><div className="avatar avatar-top">JS</div></div></header>
      {active === 'dashboard' && <Dashboard go={go} experiments={experiments} />}
      {active === 'learn' && <Learn go={go} />}
      {(active === 'builder' || active === 'simulation') && (
  <Builder 
  gates={gates} 
  setGates={setGates} 
  qubits={qubits}
  setQubits={setQubits}
  summary={summary}
    addGate={addGate}
    placeGate={placeGate}
    selectedGate={selectedGate}
    runCircuit={runCircuit}
    running={running}
    simulation={simulation}
    go={go}
  />
)}
      {active === 'tutor' && <Tutor simulation={simulation} gates={gates} question={question} setQuestion={setQuestion} answer={answer} askTutor={askTutor} />}
      {active === 'challenges' && <Challenges go={go} />}
      {active === 'progress' && <Progress experiments={experiments} />}
    </main>
  </div>
}

function Dashboard({ go, experiments }: { go: (s: string) => void; experiments: Experiment[] }) { return <div className="content"><section className="hero"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR QUANTUM JOURNEY</div><h1>Learn quantum computing<br /><em>by building it.</em></h1><p>Build a circuit. Run the simulation.<br className="desktop" /> See what actually happens.</p><div className="hero-actions"><button className="button primary" onClick={() => go('builder')}>Start building <ArrowRight size={16} /></button><button className="button ghost" onClick={() => go('learn')}>Continue learning</button></div></div><div className="hero-visual"><div className="orbital orbital-one" /><div className="orbital orbital-two" /><div className="hero-core"><span>Q</span></div><div className="hero-label label-top">BUILD</div><div className="hero-label label-bottom">UNDERSTAND</div></div></section><div className="section-heading"><div><span className="eyebrow">OVERVIEW</span><h2>Your progress</h2></div><button className="text-button" onClick={() => go('progress')}>View all <ArrowRight size={14} /></button></div><div className="stats-grid"><Stat icon={BookOpen} label="Concepts learned" value="0" trend="+2 this week" /><Stat icon={FlaskConical} label="Circuits built" value={String(Math.max(0, experiments.length))} trend="+4 this week" /><Stat icon={Trophy} label="Challenges completed" value="0" trend="+2 this week" /><Stat icon={Gauge} label="Current level" value="0" trend="Quantum explorer" /></div><div className="dashboard-grid"><section className="panel continue-card"><div className="panel-header"><div><span className="eyebrow">UP NEXT</span><h3>Continue learning</h3></div><span className="lesson-icon"><BrainCircuit size={18} /></span></div><div className="lesson-row"><div className="lesson-visual"><span>H</span><span>→</span><span>○</span></div><div className="lesson-copy"><b>Quantum Gates</b><span>Lesson 4 of 6 · 12 min</span><div className="progress-line"><span style={{ width: '70%' }} /></div><small>70% complete</small></div><button className="round-arrow" onClick={() => go('learn')}><ArrowRight size={16} /></button></div></section><section className="panel flow-card"><div className="panel-header"><div><span className="eyebrow">THE QUANTUMLAB METHOD</span><h3>Build → Run → See → Understand</h3></div></div><div className="flow"><FlowStep icon={Code2} label="Build" /><div className="flow-line" /><FlowStep icon={Play} label="Run" /><div className="flow-line" /><FlowStep icon={Activity} label="See" /><div className="flow-line" /><FlowStep icon={BrainCircuit} label="Understand" /></div></section></div><div className="section-heading recent-heading"><div><span className="eyebrow">YOUR LAB</span><h2>Recent experiments</h2></div><button className="text-button" onClick={() => go('builder')}>Open circuit builder <ArrowRight size={14} /></button></div><section className="panel experiments"><div className="experiment-table-head"><span>EXPERIMENT</span><span>GATES USED</span><span>RESULT</span><span>LAST RUN</span><span /></div>{(experiments.length ? experiments : [{ id: 'demo', name: 'Superposition starter', gates: defaultGates, qubits: 2, simulation: simulate(defaultGates, 2) }]).slice(0, 3).map(exp => <div className="experiment-row" key={exp.id}><div className="experiment-name"><span className="experiment-icon"><FlaskConical size={16} /></span><span><b>{exp.name}</b><small>{exp.qubits} qubits · {exp.gates.length} operations</small></span></div><div className="gate-pills">{exp.gates.slice(0, 3).map(g => <span key={g.id}>{g.name}</span>)}</div><b className="result-text">{Object.entries(exp.simulation.probabilities).filter(([, v]) => v).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(' · ')}</b><span className="muted">Just now</span><button className="table-arrow" onClick={() => go('builder')}><ArrowRight size={15} /></button></div>)}</section></div> }
function Stat({ icon: Icon, label, value, trend }: { icon: typeof BookOpen; label: string; value: string; trend: string }) { return <div className="stat-card"><div className="stat-top"><span className="stat-icon"><Icon size={16} /></span><span className="stat-trend">{trend}</span></div><strong>{value}</strong><span>{label}</span></div> }
function FlowStep({ icon: Icon, label }: { icon: typeof Code2; label: string }) { return <div className="flow-step"><span><Icon size={16} /></span><small>{label}</small></div> }

function Builder({ 
  gates, 
  setGates, 
  qubits,
  setQubits,
  summary,
  addGate,
  placeGate,
  selectedGate,
  runCircuit,
  running,
  simulation,
  go,
}: any) {
  const columns = Math.max(5, summary.depth + 1)

  return (
    <div className="content">

      <div className="page-intro">
        <div>
          <span className="eyebrow">QUANTUM LAB</span>
          <h1>Circuit Builder</h1>
          <p>
            Select a gate from the palette, then click a qubit cell to place it.
          </p>
        </div>

        <button
          className="button primary"
          onClick={runCircuit}
          disabled={running}
        >
          {running ? 'Running...' : 'Run Circuit'}
          <Play size={15} />
        </button>
      </div>


      <div className="builder-layout">

        {/* GATE PALETTE */}
        <section className="panel gate-palette">

          <div className="panel-header">
            <div>
              <span className="eyebrow">GATE PALETTE</span>
              <h3>Choose a Gate</h3>
            </div>
          </div>

          <div className="gate-list">

            {(Object.keys(gateInfo) as GateName[]).map(name => (

              <button
                key={name}
                className={`palette-gate ${
                  selectedGate === name ? 'selected' : ''
                } ${
                  ['X', 'H', 'CNOT', 'Measure'].includes(name)
                    ? ''
                    : 'optional'
                }`}
                onClick={() => addGate(name)}
              >

                <span className="gate-symbol">
                  {name === 'Measure' ? 'M' : name}
                </span>

                <span>
                  <b>{name}</b>
                  <small>{gateInfo[name].description}</small>
                </span>

                <Plus size={14} />

              </button>

            ))}

          </div>

        </section>


        {/* CIRCUIT */}
        <section className="panel circuit-panel">

          <div className="panel-header">

            <div>
              <span className="eyebrow">CIRCUIT</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
  <button
    className="button ghost small"
    onClick={() => setQubits(q => q + 1)}
  >
    + Add Qubit
  </button>

  <button
    className="button ghost small"
    onClick={() => setQubits(q => Math.max(1, q - 1))}
    disabled={qubits <= 1}
  >
    − Remove Qubit
  </button>
</div>
            </div>

          </div>


          <div className="circuit-canvas">

            <div className="column-labels">
  <span />

  {Array.from(
    { length: columns },
    (_, i) => (
      <span key={i}>{i + 1}</span>
    )
  )}
</div>
  



            {Array.from({ length: qubits }, (_, q) => (

              <div
                className="qubit-row"
                key={q}
              >

                <b>Qubit {q}</b>


                <div className="wire">

                  <div className="wire-line" />


                  {Array.from(
  { length: columns },
  (_, col) => (
    <div
      className={`slot ${
        selectedGate ? 'ready-to-place' : ''
      }`}
      key={col}
      onClick={() => placeGate(q, col)}
    >
      {gates
        .filter(
          (g: Gate) =>
            g.qubit === q &&
            g.column === col
        )
        .map((g: Gate) => (
          <button
            key={g.id}
            className={`placed-gate ${
              g.name === 'Measure' ? 'M' : g.name
            }`}
            title="Remove gate"
            onClick={(e) => {
              e.stopPropagation()

              setGates(
                gates.filter(
                  (x: Gate) => x.id !== g.id
                )
              )
            }}
          >
            {g.name === 'Measure'
              ? 'M'
              : g.name === 'CNOT'
                ? '●'
                : g.name}
          </button>
        ))}
                

        {(() => {
          const cnot = gates.find(
            (g: Gate) =>
              g.name === 'CNOT' &&
              g.column === col &&
              g.target === q
          )

          return cnot ? (
            <button
              className="placed-gate"
              title="CNOT target"
              onClick={(e) => {
                e.stopPropagation()

                setGates(
                  gates.filter(
                    (x: Gate) => x.id !== cnot.id
                  )
                )
              }}
            >
              ⊕
            </button>
          ) : null
        })()}
        {(() => {
  const cnot = gates.find(
    (g: Gate) =>
      g.name === 'CNOT' &&
      g.column === col &&
      g.target === q
  )

  if (!cnot) return null

  const direction = cnot.qubit < q ? 'up' : 'down'

  return (
    <span
      className={`cnot-connector ${direction}`}
      aria-hidden="true"
    />
  )
})()}

    
    </div>
  )
)}

                </div>

              </div>

            ))}

          </div>


          <div className="circuit-caption">

            <span>
              <span className="status-dot" />
              {gates.length} gates placed
            </span>

            <span>
              {selectedGate
                ? `Selected ${selectedGate}. Click a qubit cell to place it.`
                : 'Select a gate from the palette.'}
            </span>

          </div>

        </section>

      </div>


      {/* SIMULATION RESULT */}

      {simulation && (

        <section className="simulation-grid">


          <div className="panel">

            <div className="panel-header">

              <div>
                <span className="eyebrow">
                  LATEST RESULT
                </span>

                <h3>Probability Distribution</h3>

              </div>
              

            </div>


            <div className="probability-chart">

  {Object.entries(simulation.probabilities)
    .filter(([, value]) => value)
    .map(([state, probability]) => (

      <div
        className="probability-row"
        key={state}
      >

        <b className="probability-state">
          |{state}⟩
        </b>

        <div className="probability-bar">
          <div
            className="probability-fill"
            style={{
              width: `${(probability as number) * 100}%`,
            }}
          />
        </div>

        <span className="probability-value">
          {Math.round(
            (probability as number) * 100
          )}%
        </span>

      </div>

    ))}

</div>
<div className="counts-section">

  <span className="eyebrow">RAW SHOTS</span>

  <h4>Measurement Counts</h4>

  <div className="counts-list">

    {Object.entries(simulation.counts)
      .filter(([, count]) => Number(count) > 0)
      .map(([state, count]) => (

        <div className="count-row" key={state}>

          <b>|{state}⟩</b>

          <span>{Number(count)}</span>

        </div>

      ))}

  </div>

</div>

          </div>
          


          <div className="panel">

            <div className="panel-header">

              <div>
                <span className="eyebrow">
                  VISUALIZATION
                </span>

                <h3>
                  Bloch Sphere
                </h3>
              </div>

            </div>

            <BlochSphere simulation={simulation} />
            <div className="statevector-section">

  <span className="eyebrow">QUANTUM STATE</span>

  <h4>Statevector</h4>

  <div className="statevector-list">

    {simulation.statevector.map((amplitude: { real: number; imag: number }, index: number) => {
      const magnitude = Math.sqrt(
        amplitude.real * amplitude.real +
        amplitude.imag * amplitude.imag
      )

      return (
        <div className="statevector-row" key={index}>

          <b>
            |{index.toString(2).padStart(simulation.numQubits, '0')}⟩
          </b>

          <span>
            {amplitude.real.toFixed(3)}
            {amplitude.imag >= 0 ? ' + ' : ' - '}
            {Math.abs(amplitude.imag).toFixed(3)}i
          </span>

          <span>
            P = {(magnitude * magnitude).toFixed(3)}
          </span>

        </div>
      )

    })}

  </div>

</div>

          </div>


        </section>

      )}

    </div>
  )
}

function Learn({ go }: { go: (s: string) => void }) {
  const lessons = [
    {
      title: 'What is a qubit?',
      tag: 'FOUNDATIONS',
      icon: '0 / 1',
      copy: 'A qubit is the basic unit of quantum information. Unlike a classical bit, it can exist in a combination of 0 and 1.',
      tone: 'blue',
    },
    {
      title: 'Quantum gates',
      tag: 'FOUNDATIONS',
      icon: 'H',
      copy: 'Quantum gates are the building blocks of circuits. Each gate applies a specific transformation to a qubit.',
      tone: 'teal',
    },
    {
      title: 'Superposition',
      tag: 'CORE CONCEPT',
      icon: '±',
      copy: 'Superposition allows a qubit to exist in a combination of possible states before measurement.',
      tone: 'purple',
    },
    {
      title: 'Entanglement',
      tag: 'CORE CONCEPT',
      icon: '∞',
      copy: 'Entanglement creates a strong relationship between qubits, so their measurement outcomes become correlated.',
      tone: 'gold',
    },
    {
      title: 'X gate',
      tag: 'QUANTUM GATES',
      icon: 'X',
      copy: 'The X gate flips a qubit from 0 to 1 or from 1 to 0. It is similar to a classical NOT operation.',
      tone: 'blue',
    },
    {
      title: 'Hadamard gate',
      tag: 'QUANTUM GATES',
      icon: 'H',
      copy: 'The Hadamard gate creates an equal superposition of 0 and 1 when applied to a qubit in the |0⟩ state.',
      tone: 'teal',
    },
    {
      title: 'CNOT gate',
      tag: 'QUANTUM GATES',
      icon: '⊗',
      copy: 'The CNOT gate changes the target qubit depending on the state of the control qubit.',
      tone: 'purple',
    },
    {
      title: 'Measurement',
      tag: 'CORE CONCEPT',
      icon: 'M',
      copy: 'Measurement converts a quantum state into a classical result that can be observed as 0 or 1.',
      tone: 'gold',
    },
    {
      title: 'Quantum circuits',
      tag: 'FOUNDATIONS',
      icon: '▣',
      copy: 'A quantum circuit is a sequence of gates applied to qubits to perform a quantum computation.',
      tone: 'blue',
    },
    {
      title: 'Probability',
      tag: 'CORE CONCEPT',
      icon: '%',
      copy: 'Quantum states produce measurement outcomes with probabilities that can be estimated by running the circuit many times.',
      tone: 'teal',
    },
    {
      title: 'Statevector',
      tag: 'CORE CONCEPT',
      icon: 'ψ',
      copy: 'A statevector represents the amplitudes of all possible basis states of a quantum system.',
      tone: 'purple',
    },
    {
      title: 'Quantum experiments',
      tag: 'PRACTICE',
      icon: '⚛',
      copy: 'Build, run and observe circuits to connect quantum concepts with actual simulation results.',
      tone: 'gold',
    },
  ]

  return (
    <div className="content">
      <div className="page-intro">
        <div>
          <span className="eyebrow">THE BASICS</span>
          <h1>Learn quantum computing</h1>
          <p>
            No heavy math required. Start with the ideas, then see them in
            action.
          </p>
        </div>

        <div className="lesson-progress">
          <span>0 of 12 concepts</span>

          <div className="progress-line">
            <span style={{ width: '66%' }} />
          </div>
        </div>
      </div>

      <div className="learn-grid">
        {lessons.map((lesson, i) => (
          <article className="lesson-card" key={lesson.title}>
            <div className={`lesson-card-art ${lesson.tone}`}>
              <span>{lesson.icon}</span>
              <small>0 — 1</small>
            </div>

            <div className="lesson-card-content">
              <span className="eyebrow">{lesson.tag}</span>

              <h3>{lesson.title}</h3>

              <p>{lesson.copy}</p>

              <button
                className="text-button"
                onClick={() => go('builder')}
              >
                Try it yourself
                <ArrowRight size={14} />
              </button>
            </div>

            <span className="lesson-number">
              {String(i + 1).padStart(2, '0')}
            </span>
          </article>
        ))}
      </div>
    </div>
  )
}
function Tutor({ simulation, gates, question, setQuestion, answer, askTutor }: any) {
  console.log('TUTOR ANSWER PROP:', answer)

  const suggestions = [
    'Why did I get this result?',
    'Explain my circuit step by step',
    'What does this gate do?',
    'Can you explain this like a beginner?'
  ]

  return (
    <div className="content tutor-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">GROUNDED LEARNING</span>
          <h1>AI tutor</h1>
          <p>Your circuit is the lesson. Ask questions about what you actually ran.</p>
        </div>

        <span className="grounded-badge">
          <span className="status-dot" /> Circuit context connected
        </span>
      </div>

      <div className="tutor-layout">
        <section className="panel tutor-chat">
          <div className="chat-header">
            <span className="tutor-avatar">
              <BrainCircuit size={20} />
            </span>

            <div>
              <h3>QuantumLab tutor</h3>
              <span>
                <span className="status-dot" /> Ready to explain
              </span>
            </div>
          </div>

          <div className="chat-body">
            <div className="message tutor-message">
              <span className="message-avatar">
                <Sparkles size={13} />
              </span>

              <div>
                <p>
                  {simulation
                    ? 'I can see your latest experiment. Ask me why the simulator returned that result.'
                    : 'Run a circuit first, then I can explain the exact result it produced.'}
                </p>
              </div>
            </div>

            {answer && (
              <div className="message tutor-message">
                <span className="message-avatar">
                  <Sparkles size={13} />
                </span>

                <div>
                  <p>{answer}</p>
                </div>
              </div>
            )}

            {!answer && (
              <div className="suggestions">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      setQuestion(s)
                      askTutor(s)
                    }}
                  >
                    {s}
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="chat-input">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  askTutor()
                }
              }}
              placeholder="Ask about your circuit..."
            />

            <button
              className="send-button"
              onClick={() => {
                console.log('ASK TUTOR CLICKED')
                askTutor()
              }}
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </section>

        <aside className="tutor-context panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">LIVE CONTEXT</span>
              <h3>What I&apos;m looking at</h3>
            </div>

            <Check size={17} className="success-text" />
          </div>

          <div className="context-block">
            <span>Your circuit</span>
            <div className="mini-circuit">
              {gates.map((g: Gate) => (
                <b key={g.id}>{g.name}</b>
              ))}
            </div>
          </div>

          <div className="context-block">
            <span>Qubits</span>
            <b>2 qubits</b>
          </div>

          <div className="context-block">
            <span>Simulation output</span>
            <b>{simulation ? 'Available' : 'Not run yet'}</b>
          </div>

          <div className="grounding-note">
            <ShieldIcon />
            <span>
              I&apos;ll never invent a result. If the simulator hasn&apos;t run,
              I&apos;ll tell you.
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}
function ShieldIcon() { return <span className="shield-icon"><Check size={12} /></span> }

function Challenges({ go }: { go: (s: string) => void }) {
  const [selected, setSelected] = useState<any>(null)
  const [prediction, setPrediction] = useState('')
  const [checked, setChecked] = useState(false)

  const challenges = [
    {
      n: '01',
      title: 'Two possible outcomes',
      copy: 'Create a circuit that produces an equal probability of two outcomes.',
      difficulty: 'Beginner',
      concept: 'Superposition',
      circuit: ['|0⟩', 'H', 'Measure'],
      task: 'Place an H gate on the qubit and predict the measurement probabilities.',
      question: 'What probability do you expect for 0 and 1?',
      answer: '50/50',
      explanation:
        'The H gate creates an equal superposition, so measurements are approximately 50% 0 and 50% 1.'
    },
    {
      n: '02',
      title: 'Flip the bit',
      copy: 'Apply an X gate and predict the result before you run it.',
      difficulty: 'Beginner',
      concept: 'X gate',
      circuit: ['|0⟩', 'X', 'Measure'],
      task: 'Place an X gate on the qubit and predict the measurement result.',
      question: 'What will the qubit measure?',
      answer: '1',
      explanation:
        'The X gate flips the qubit from |0⟩ to |1⟩, so the measurement should be 1.'
    },
    {
      n: '03',
      title: 'Build a superposition',
      copy: 'Use an H gate to create a 50/50 measurement.',
      difficulty: 'Beginner',
      concept: 'H gate',
      circuit: ['|0⟩', 'H', 'Measure'],
      task: 'Build a circuit with an H gate and predict the measurement distribution.',
      question: 'What probability do you expect for 0 and 1?',
      answer: '50/50',
      explanation:
        'The Hadamard gate creates an equal superposition, giving approximately 50% probability for each outcome.'
    },
    {
      n: '04',
      title: 'Control the outcome',
      copy: 'Build a two-qubit circuit using a CNOT gate.',
      difficulty: 'Intermediate',
      concept: 'CNOT',
      circuit: ['q₀ ── X ──●', 'q₁ ───────X'],
      task: 'Use X on the control qubit, then connect it to the target using CNOT.',
      question: 'Which gate should connect the control and target qubits?',
      answer: 'CNOT',
      explanation:
        'CNOT uses one qubit as the control and flips the target qubit when the control is 1.'
    },
    {
      n: '05',
      title: 'Make an entangled pair',
      copy: 'Create a simple experiment where two qubits become connected.',
      difficulty: 'Intermediate',
      concept: 'Entanglement',
      circuit: ['q₀ ── H ──●', 'q₁ ───────X'],
      task: 'Create a Bell pair using an H gate followed by a CNOT gate.',
      question: 'Which gate sequence creates this entangled pair?',
      answer: 'H + CNOT',
      explanation:
        'Applying H to the first qubit creates superposition, and CNOT then creates entanglement between the two qubits.'
    }
  ]

  const openChallenge = (challenge: any) => {
    setSelected(challenge)
    setPrediction('')
    setChecked(false)
  }

  const checkAnswer = () => {
    setChecked(true)
  }

  const isCorrect =
    selected &&
    prediction.trim().toLowerCase() === selected.answer.toLowerCase()

  if (selected) {
    return (
      <div className="content">
        <div className="page-intro">
          <div>
            <span className="eyebrow">
              {selected.difficulty} · {selected.concept}
            </span>

            <h1>{selected.title}</h1>

            <p>{selected.copy}</p>
          </div>

          <button
            className="button ghost small"
            onClick={() => setSelected(null)}
          >
            ← Back to challenges
          </button>
        </div>

        <section className="challenge-workspace">
          <div className="challenge-card">

            <span className="eyebrow">YOUR TASK</span>

            <h2>Build this circuit</h2>

            <p>{selected.task}</p>

            <div
              style={{
                margin: '24px 0',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)'
              }}
            >
              <span className="eyebrow">CIRCUIT TO BUILD</span>

              <div
                style={{
                  marginTop: '16px',
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  lineHeight: '2'
                }}
              >
                {(selected.circuit ?? []).map((item: string, index: number) => (
                  <div key={index}>{item}</div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <span className="eyebrow">PREDICT THE RESULT</span>

              <h3 style={{ marginTop: '8px' }}>
                {selected.question}
              </h3>
            </div>

            <input
              className="challenge-input"
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
              placeholder={
                selected.concept === 'X gate'
                  ? 'Example: 1'
                  : selected.concept === 'CNOT'
                  ? 'Example: CNOT'
                  : selected.concept === 'Entanglement'
                  ? 'Example: H + CNOT'
                  : 'Example: 50/50'
              }
              disabled={checked}
            />

            {!checked && (
              <button
                className="button primary"
                onClick={checkAnswer}
                disabled={!prediction.trim()}
              >
                Check answer
                <Check size={15} />
              </button>
            )}

            {checked && (
              <div
                className={`challenge-feedback ${
                  isCorrect ? 'correct' : 'incorrect'
                }`}
                style={{ marginTop: '20px' }}
              >
                <strong>
                  {isCorrect ? '✓ Correct!' : 'Not quite'}
                </strong>

                <p>
                  {isCorrect
                    ? selected.explanation
                    : `Expected answer: ${selected.answer}. ${selected.explanation}`}
                </p>
              </div>
            )}

            {checked && (
              <div style={{ marginTop: '20px' }}>
                <button
                  className="button primary"
                  onClick={() => go('builder')}
                >
                  Try it in Circuit Builder
                  <ArrowRight size={15} />
                </button>
              </div>
            )}

          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="content">

      <div className="page-intro">
        <div>
          <span className="eyebrow">PRACTICE ARENA</span>

          <h1>Challenges</h1>

          <p>
            Predict, build, and verify. Every challenge uses the real simulator.
          </p>
        </div>

        <div className="challenge-score">
          <Trophy size={16} />
          <b>0 / 10</b>
          <span>completed</span>
        </div>
      </div>

      <div className="challenge-list">

        {challenges.map(c => (
          <article
            className="challenge-row"
            key={c.n}
          >
            <span className="challenge-number">
              {c.n}
            </span>

            <div className="challenge-main">

              <div>
                <span className="eyebrow">
                  {c.difficulty} · {c.concept}
                </span>

                <h3>{c.title}</h3>

                <p>{c.copy}</p>
              </div>

              <button
                className="button primary small"
                onClick={() => openChallenge(c)}
              >
                Start challenge
                <ArrowRight size={14} />
              </button>

            </div>
          </article>
        ))}

      </div>

      <section className="recommendation">

        <span className="recommendation-icon">
          <Sparkles size={18} />
        </span>

        <div>
          <span className="eyebrow">
            RECOMMENDED NEXT
          </span>

          <h3>CNOT Basics</h3>

          <p>
            You&apos;ve practiced single-qubit gates. Try connecting two
            qubits next.
          </p>
        </div>

        <button
          className="button ghost small"
          onClick={() => openChallenge(challenges[3])}
        >
          Start
          <ArrowRight size={14} />
        </button>

      </section>

    </div>
  )
}

function Progress({ experiments }: { experiments: Experiment[] }) { const concepts = [{ n: 'Qubit', status: 'Mastered', progress: 100 }, { n: 'X Gate', status: 'Mastered', progress: 100 }, { n: 'H Gate / Superposition', status: 'Practiced', progress: 72 }, { n: 'Measurement', status: 'Learning', progress: 48 }, { n: 'CNOT', status: 'Not started', progress: 0 }, { n: 'Entanglement', status: 'Not started', progress: 0 }]; return <div className="content"><div className="page-intro"><div><span className="eyebrow">YOUR JOURNEY</span><h1>Progress</h1><p>Small experiments add up to quantum intuition.</p></div><div className="level-card"><span className="level-dot" /><div><b>Level 2</b><small>Quantum explorer</small></div><strong>42%</strong></div></div><div className="progress-overview"><div className="panel big-progress"><span className="eyebrow">LEVEL PROGRESS</span><div className="big-progress-line"><span style={{ width: '42%' }} /></div><div className="progress-numbers"><b>42 XP</b><span>58 XP to Level 3</span></div><div className="xp-stats"><div><b>3</b><span>day streak</span></div><div><b>{Math.max(12, experiments.length)}</b><span>circuits built</span></div><div><b>6</b><span>challenges won</span></div></div></div><div className="panel concepts"><div className="panel-header"><div><span className="eyebrow">KNOWLEDGE MAP</span><h3>Concepts</h3></div><span className="muted">6 topics</span></div>{concepts.map(c => <div className="concept-row" key={c.n}><span className={`concept-status ${c.status.replace(' ', '-')}`}>{c.progress === 100 ? <Check size={12} /> : c.progress ? '·' : ''}</span><b>{c.n}</b><span className="concept-state">{c.status}</span><div className="mini-progress"><span style={{ width: `${c.progress}%` }} /></div></div>)}</div></div><section className="panel streak-panel"><span className="streak-icon"><Zap size={17} /></span><div><span className="eyebrow">CONSISTENCY WINS</span><h3>Your learning streak is alive</h3><p>Come back tomorrow to keep your 3-day streak going.</p></div><div className="week"><span className="active">M</span><span className="active">T</span><span className="active">W</span><span> T</span><span> F</span><span> S</span><span> S</span></div></section></div> }
