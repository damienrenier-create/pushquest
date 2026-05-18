"use client"

import React, { useState, useEffect, useRef } from 'react'
import dialogueData from '@/data/fsm_dialogue.json'

const DUO_DONE_KEY = 'fsm_duolingo_done';
const GRADE_EMOJIS: Record<string, string> = {
  APPRENTI_HALTERE: "🏋️", APPRENTI_RENARD: "🦊",
  APPRENTI_CAMARADE: "✊", LOUP_DE_PATE_STREET: "🐺",
  SAGE_APATHIQUE: "😶", APPRENTI_LINGUISTE_PASTAFARIEN: "🦉",
};

const BAN_KEY = 'fsm_nexus_ban_until';
const SHAME_KEY = 'fsm_shame_count';
const PARENTING_BAN_KEY = 'fsm_parenting_ban';

type Scores = {
  capital: number; collectif: number; sueur: number
  chill: number; logique: number; chaos: number
}

type FSMState = {
  currentNodeId: string
  scores: Scores
  status: 'IDLE' | 'PLAYING' | 'GAME_OVER' | 'DISCIPLE' | 'FAKE_CRASH'
  discipleType?: string
}

type Props = { nickname: string; userId: string }

const STORAGE_KEY = 'fsm_saved_state'

export default function SanctuaireTab({ nickname, userId }: Props) {
  const [fsmState, setFsmState] = useState<FSMState>({
    currentNodeId: 'start',
    scores: { capital: 0, collectif: 0, sueur: 0, chill: 0, logique: 0, chaos: 0 },
    status: 'IDLE'
  })
  const [isIdleTimerActive, setIsIdleTimerActive] = useState(true)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isBanned, setIsBanned] = useState<boolean>(false)
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clickTimestamps = useRef<number[]>([]);
  const condescendanceCount = useRef<number>(0);
  const resumeNodeRef = useRef<string>('start');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.status !== 'IDLE') {
          setFsmState(parsed)
          setIsIdleTimerActive(false)
        }
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      if (fsmState.status !== 'IDLE') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fsmState))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch { /* ignore */ }
  }, [fsmState])

  useEffect(() => {
    const checkBan = () => {
      const banUntil = parseInt(localStorage.getItem(BAN_KEY) || '0');
      const remaining = banUntil - Date.now();
      if (remaining > 0) {
        setIsBanned(true);
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      } else {
        setIsBanned(false);
        setTimeLeft('');
      }
    };
    checkBan();
    const interval = setInterval(checkBan, 1000);
    return () => clearInterval(interval);
  }, []);

  const resetIdleTimer = () => {
    if (!isIdleTimerActive) return
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdleTimerActive(false)
      if (fsmState.status === 'DISCIPLE') {
        setFsmState(prev => ({ ...prev, currentNodeId: 'disciple_hub' }))
      } else {
        setFsmState(prev => ({ ...prev, status: 'PLAYING', currentNodeId: 'start' }))
      }
    }, 30000)
  }

  useEffect(() => {
    if (!isIdleTimerActive) return
    window.addEventListener('mousemove', resetIdleTimer)
    window.addEventListener('keydown', resetIdleTimer)
    window.addEventListener('click', resetIdleTimer)
    window.addEventListener('touchstart', resetIdleTimer)
    resetIdleTimer()
    return () => {
      window.removeEventListener('mousemove', resetIdleTimer)
      window.removeEventListener('keydown', resetIdleTimer)
      window.removeEventListener('click', resetIdleTimer)
      window.removeEventListener('touchstart', resetIdleTimer)
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
    }
  }, [isIdleTimerActive, fsmState.status])

  // @ts-ignore
  const nodes = dialogueData.nodes as Record<string, any>
  const currentNode = nodes[fsmState.currentNodeId]

  const renderText = (text: string) => text.replace('{{nickname}}', nickname)

  const handleChoice = (choice: any) => {
    const now = Date.now();
    clickTimestamps.current = [...clickTimestamps.current.slice(-2), now];
    if (clickTimestamps.current.length === 3 && clickTimestamps.current[2] - clickTimestamps.current[0] < 2000) {
      condescendanceCount.current += 1;
      const tier = condescendanceCount.current;
      const pool = tier <= 2
        ? ['inter_condescendance_1','inter_condescendance_2','inter_condescendance_3']
        : tier <= 4
        ? ['inter_condescendance_4','inter_condescendance_5','inter_condescendance_6']
        : ['inter_condescendance_7','inter_condescendance_8','inter_condescendance_9'];
      const picked = pool[Math.floor(Math.random() * pool.length)];
      resumeNodeRef.current = fsmState.currentNodeId;
      clickTimestamps.current = [];
      setFsmState(prev => ({ ...prev, currentNodeId: picked }));
      return;
    }

    const newScores: Scores = {
      capital:   fsmState.scores.capital   + (choice.impact?.capital   || 0),
      collectif: fsmState.scores.collectif + (choice.impact?.collectif || 0),
      sueur:     fsmState.scores.sueur     + (choice.impact?.sueur     || 0),
      chill:     fsmState.scores.chill     + (choice.impact?.chill     || 0),
      logique:   fsmState.scores.logique   + (choice.impact?.logique   || 0),
      chaos:     fsmState.scores.chaos     + (choice.impact?.chaos     || 0),
    }

    if (choice.trigger === 'GAME_OVER_PARENTING') {
      const shameCount = parseInt(localStorage.getItem(SHAME_KEY) || '0') + 1;
      try {
        localStorage.setItem(PARENTING_BAN_KEY, 'true');
        localStorage.setItem(SHAME_KEY, shameCount.toString());
        localStorage.setItem(BAN_KEY, (Date.now() + 24 * 60 * 60 * 1000).toString());
        localStorage.removeItem(STORAGE_KEY);
      } catch { /* ignore */ }
      setIsBanned(true);
      setFsmState({ currentNodeId: 'start', scores: { capital:0, collectif:0, sueur:0, chill:0, logique:0, chaos:0 }, status: 'IDLE' });
      setIsIdleTimerActive(true);
      return;
    }

    if (choice.trigger === 'GAME_OVER' || choice.trigger === 'INFINITE_LOOP') {
      const shameCount = parseInt(localStorage.getItem(SHAME_KEY) || '0') + 1;
      const banDurations = [0, 30*60*1000, 2*60*60*1000];
      const banDuration = shameCount >= 3 
        ? (new Date().setHours(30,0,0,0) - Date.now()) // lendemain 6h
        : (banDurations[Math.min(shameCount-1, 2)] || 0);
      try {
        localStorage.setItem(SHAME_KEY, shameCount.toString());
        if (banDuration > 0) localStorage.setItem(BAN_KEY, (Date.now() + banDuration).toString());
        localStorage.removeItem(STORAGE_KEY);
      } catch { /* ignore */ }
      setFsmState({ ...fsmState, scores: newScores, status: 'GAME_OVER', currentNodeId: choice.nextNodeId });
      return;
    }

    if (choice.trigger === 'CLEAR_PARENTING_BAN') {
      try { localStorage.removeItem(PARENTING_BAN_KEY); } catch { /* ignore */ }
    }
    if (choice.trigger === 'SET_HAS_KIDS') {
      try { localStorage.setItem('fsm_has_kids', 'true'); } catch { /* ignore */ }
    }

    if (choice.trigger === 'GRANT_DISCIPLE') {
      if (choice.discipleType === 'APPRENTI_LINGUISTE_PASTAFARIEN') {
        try { localStorage.setItem(DUO_DONE_KEY, 'true'); } catch { /* ignore */ }
      }
      setFsmState({ currentNodeId: choice.nextNodeId, scores: newScores, status: 'DISCIPLE', discipleType: choice.discipleType })
      return
    }

    if (choice.trigger === 'FAKE_CRASH' || fsmState.currentNodeId === 'faux_crash_amorce') {
      setFsmState(prev => ({ ...prev, status: 'FAKE_CRASH', currentNodeId: 'faux_crash_amorce', scores: newScores }))
      setTimeout(() => {
        setFsmState(prev => ({ ...prev, status: 'PLAYING', currentNodeId: 'faux_crash_recovery' }))
      }, 4000)
      return
    }

    if (choice.trigger === 'RESUME_CURRENT') {
      setFsmState(prev => ({ ...prev, currentNodeId: resumeNodeRef.current, scores: newScores }));
      return;
    }
    if (choice.trigger === 'CLOSE_NEXUS') {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      setFsmState({ currentNodeId: 'start', scores: { capital:0, collectif:0, sueur:0, chill:0, logique:0, chaos:0 }, status: 'IDLE' });
      setIsIdleTimerActive(true);
      return;
    }
    if (choice.nextNodeId === 'duo_entry') {
      const hasDone = (() => { try { return localStorage.getItem(DUO_DONE_KEY)==='true'; } catch { return false; } })();
      if (hasDone) {
        setFsmState(prev => ({ ...prev, currentNodeId: 'duo_quick_test', scores: newScores }));
        return;
      }
      const parentingBan = (() => { try { return localStorage.getItem(PARENTING_BAN_KEY)==='true'; } catch { return false; } })();
      const shameCount = (() => { try { return parseInt(localStorage.getItem(SHAME_KEY)||'0'); } catch { return 0; } })();
      const target = parentingBan ? 'prof_intro_parenting_repentance'
        : shameCount >= 3 ? 'prof_intro_triple_recidiviste'
        : shameCount >= 1 ? 'prof_intro_recidiviste'
        : 'prof_intro';
      setFsmState(prev => ({ ...prev, currentNodeId: target, scores: newScores }));
      return;
    }

    let nextNode = choice.nextNodeId
    if (choice.conditionalRoutings) {
      for (const route of choice.conditionalRoutings) {
        if (newScores[route.gauge as keyof Scores] >= route.threshold) {
          nextNode = route.nextNodeId
          break
        }
      }
    }

    if (nextNode === choice.nextNodeId && (choice as any).randomFallback) {
      const rand = Math.random(); let cum = 0;
      for (const r of (choice as any).randomFallback) { cum += r.weight; if (rand < cum) { nextNode = r.nextNodeId; break; } }
    }

    setFsmState(prev => ({ ...prev, currentNodeId: nextNode, scores: newScores }))
  }

  const hardReset = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    setFsmState({ currentNodeId: 'start', scores: { capital: 0, collectif: 0, sueur: 0, chill: 0, logique: 0, chaos: 0 }, status: 'IDLE' })
    setIsIdleTimerActive(true)
  }

  if (isBanned) {
    return (
      <div className='min-h-[500px] flex flex-col items-center justify-center bg-slate-950 rounded-3xl p-8'>
        <p className='text-yellow-500/30 font-mono text-xs mb-6 text-center'>👁️👁️</p>
        <p className='text-slate-400 font-mono text-sm text-center leading-relaxed mb-8'>
          Le Nexus est fermé.<br/><br/>
          Durée de votre peine :<br/>
          <span className='text-red-500 font-bold text-lg font-mono'>{timeLeft}</span><br/><br/>
          Vous pouvez utiliser ce temps pour faire<br/>les pompes que vous n'avez pas faites.<br/><br/>
          <em className='text-slate-600'>— Le Professeur</em>
        </p>
      </div>
    )
  }

  if (fsmState.status === 'IDLE') {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-slate-950 rounded-3xl">
        <p className="text-slate-900 select-none text-xs font-mono tracking-widest">Zone restreinte.</p>
      </div>
    )
  }

  if (fsmState.status === 'FAKE_CRASH') {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-slate-950 rounded-3xl p-8">
        <div className="max-w-2xl w-full">
          <p className="text-red-500 font-mono text-xs leading-relaxed whitespace-pre-line">
            {currentNode?.text || 'CRITICAL_ERROR : SPAGHETTI_OVERFLOW_DETECTED'}
          </p>
          <p className="text-red-500/50 font-mono text-[10px] mt-4 animate-pulse">Restarting FSM core...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] bg-slate-950 rounded-3xl p-4 sm:p-8">
      <div className="max-w-2xl w-full bg-slate-900/80 p-6 sm:p-10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800">

        <div className="text-5xl sm:text-7xl text-center mb-6 sm:mb-8 animate-pulse drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
          🍝👁️👁️🍝
        </div>

        {fsmState.status === 'DISCIPLE' && fsmState.discipleType && (
          <div className="text-center mb-4">
            <span className="text-yellow-500 text-xs font-mono tracking-widest uppercase border border-yellow-800/50 px-3 py-1 rounded-full bg-yellow-950/30">
              {GRADE_EMOJIS[fsmState.discipleType ?? ''] ?? '🍝'} {fsmState.discipleType?.replace(/_/g, ' ')}
            </span>
          </div>
        )}

        <div className="min-h-[100px] flex items-center justify-center mb-8">
          <p className="text-lg sm:text-xl leading-relaxed text-center font-light text-slate-300 font-mono">
            &ldquo;{currentNode ? renderText(currentNode.text) : '...'}&rdquo;
          </p>
        </div>

        {(fsmState.status === 'PLAYING' || fsmState.status === 'DISCIPLE') && currentNode?.choices && (
          <div className="space-y-3">
            {currentNode.choices.map((choice: any, index: number) => (
              <button key={index} onClick={() => handleChoice(choice)}
                className="w-full text-left p-4 sm:p-5 bg-slate-800/50 hover:bg-yellow-900/40 border border-slate-700 hover:border-yellow-700/50 rounded-xl transition-all duration-200 group">
                <span className="text-yellow-500/40 mr-3 group-hover:text-yellow-500 transition-colors">▶</span>
                <span className="text-slate-300 text-sm sm:text-base">{choice.text}</span>
              </button>
            ))}
          </div>
        )}

        {fsmState.status === 'GAME_OVER' && (
          <div className="text-center mt-6">
            <p className="text-red-500/80 mb-6 font-mono text-sm">L&apos;anomalie a été résorbée. La connexion est perdue.</p>
            <button onClick={hardReset}
              className="px-6 py-3 bg-red-950/50 hover:bg-red-900/50 text-red-200 border border-red-800/50 rounded-lg font-mono text-sm transition-all">
              Effacer la mémoire et recommencer
            </button>
          </div>
        )}

        {fsmState.status !== 'GAME_OVER' && (
          <button onClick={hardReset}
            className="mt-8 text-slate-800 hover:text-slate-600 text-[10px] font-mono tracking-widest block mx-auto transition-colors">
            effacer la mémoire
          </button>
        )}
      </div>
    </div>
  )
}
