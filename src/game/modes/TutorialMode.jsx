import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { CheckCircle2, Circle, Move, Shield, Sparkles } from 'lucide-react';
import PlayerController from '../components/PlayerController';
import ShipRenderer from '../components/ShipRenderer.jsx';
import EnvironmentRenderer from '../renderers/EnvironmentRenderer';
import BulletsRenderer from '../renderers/BulletsRenderer';
import MasterRenderLoopDriver from '../components/MasterRenderLoopDriver';
import { BoundaryWithMarkers } from '../components/BoundaryMesh';
import GameHUD from '../components/GameHUD';
import { HDRSkybox } from '../components/HDRSwitcher';
import StaticCrosshair from '../components/StaticCrosshair';
import ArenaExternalLightRig from '../components/ArenaExternalLightRig';
import { useTrainingWeapons } from '../hooks/useTrainingWeapons';
import { GAME_CONFIG } from '../config/GameConfig';
import * as THREE from 'three';

const TUTORIAL_STATS_VERSION = 'v2';
const getStatsKey = (username) => `astra_tutorial_${TUTORIAL_STATS_VERSION}_stats_${username}`;
const getTimelineLatestKey = (username) => `astra_tutorial_${TUTORIAL_STATS_VERSION}_timeline_latest_${username}`;
const getTimelineArchiveKey = (username, startedAt) => `astra_tutorial_${TUTORIAL_STATS_VERSION}_timeline_${username}_${startedAt}`;
const getSyncLatestKey = (username) => `astra_tutorial_${TUTORIAL_STATS_VERSION}_sync_latest_${username}`;

const DEFAULT_TUTORIAL_LINES = [
  { id: 'intro_01', text: 'Pilot online. Welcome to ASTRA combat training.' },
  { id: 'movement_01', text: 'Movement and boost. Fly out, hold Shift, and cover the marked distance.' },
  { id: 'blink_01', text: 'Evasion drill. Tap A, D, Q, or E to Blink. Use the highlighted target square to reacquire when enemies reappear.' },
  { id: 'wall_01', text: 'Crystal Wall drill. Press 2, left click to deploy. It blocks enemy lanes, and your shots through it hit harder.' },
  { id: 'portal_01', text: 'Portal drill. Press 1 and left click. Place a beacon to recall later, or fire instantly to escape a bad fight.' },
  { id: 'combo_01', text: 'Final sequence. Blink out, deploy Wall, then Portal reposition.' },
  { id: 'outro_01', text: 'Training complete. Enter multiplayer, or stay here to keep drilling mechanics.' },
];

const PHASES = [
  {
    id: 'movement',
    title: 'Movement Calibration',
    hint: 'Fly around and cover distance. Use W/A/S/D + mouse.',
    keybind: 'W/A/S/D + Mouse',
    demo: 'Move through the arena and get comfortable with ship momentum.',
    targetLabel: 'Distance',
  },
  {
    id: 'blink',
    title: 'Blink Evasion',
    hint: 'Trigger Blink dodges with A, D, Q, or E taps.',
    keybind: 'Tap A / D / Q / E',
    demo: 'Blink bursts your ship laterally or vertically to break enemy aim.',
    targetLabel: 'Blinks',
  },
  {
    id: 'crystal_wall',
    title: 'Crystal Wall Deploy',
    hint: 'Press 2 to deploy wall mode, then left click to place.',
    keybind: '2 then Left Click',
    demo: 'Crystal Wall blocks a firing lane and gives instant cover.',
    targetLabel: 'Walls',
  },
  {
    id: 'portal',
    title: 'Portal Jump',
    hint: 'Press 1 to deploy portal, then left click to teleport.',
    keybind: '1 then Left Click',
    demo: 'Portal instantly repositions you to a safer or stronger angle.',
    targetLabel: 'Portals',
  },
  {
    id: 'combo',
    title: 'Final Combat Sequence',
    hint: 'Use Blink + Crystal Wall + Portal in one sequence.',
    keybind: 'Blink -> Wall -> Portal',
    demo: 'Chain movement, defense, and reposition to win engagements.',
    targetLabel: 'Sequence',
  },
];

const normalizePhasePrefix = (raw) => {
  if (!raw) return '';
  if (raw === 'wall' || raw === 'crystal' || raw === 'crystalwall') return 'crystal_wall';
  return raw;
};

const estimateDurationMs = (text) => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  const core = words > 0 ? (words / 155) * 60000 : 1000;
  return Math.max(1200, Math.min(8500, Math.round(core + 550)));
};

const formatSrtTime = (ms) => {
  const safe = Math.max(0, Math.floor(ms));
  const hh = String(Math.floor(safe / 3600000)).padStart(2, '0');
  const mm = String(Math.floor((safe % 3600000) / 60000)).padStart(2, '0');
  const ss = String(Math.floor((safe % 60000) / 1000)).padStart(2, '0');
  const mmm = String(safe % 1000).padStart(3, '0');
  return `${hh}:${mm}:${ss},${mmm}`;
};

const renderSrt = (cues) => cues
  .map((cue, idx) => `${idx + 1}\n${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}\n${cue.text}\n`)
  .join('\n');

const TUTORIAL_LINE_BY_PHASE = {
  movement: 'movement_01',
  blink: 'blink_01',
  crystal_wall: 'wall_01',
  portal: 'portal_01',
  combo: 'combo_01',
};

const TUTORIAL_FALLBACK_TEXT = Object.fromEntries(DEFAULT_TUTORIAL_LINES.map((line) => [line.id, line.text]));
const TUTORIAL_SPAWN_OVERRIDE_KEY = 'astra_tutorial_spawn_override_v1';
const DEFAULT_TUTORIAL_SPAWN = {
  x: -547.8,
  y: -21.9,
  z: -850.2,
  yaw: 3.751,
};
const PHASE_COACHING = {
  movement: [
    'Feather Shift boost instead of holding it constantly.',
    'Use wide arcs first, then tighten your turns.',
  ],
  blink: [
    'Blink right before enemy shots would connect.',
    'After blink, reacquire target immediately with center crosshair.',
  ],
  crystal_wall: [
    'Place Wall between you and the enemy firing lane.',
    'Shoot through your own wall when you can hold angle.',
  ],
  portal: [
    'Drop portal before committing to an angle.',
    'Use instant portal to break a bad engagement.',
  ],
  combo: [
    'Blink first to break line of sight.',
    'Wall next, then portal to a new angle.',
  ],
};

const buildTutorialAudioManifestCandidates = () => {
  const candidates = [];
  const maybeAdd = (value) => {
    if (!value || typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!candidates.includes(trimmed)) candidates.push(trimmed);
  };

  maybeAdd(window.localStorage?.getItem('astra_tutorial_audio_manifest_url'));
  maybeAdd('/export/tutorial_audio/latest-manifest.json');
  maybeAdd('/export/tutorial_audio/20260228_035105/manifest.json');
  return candidates;
};

const TutorialOpponentDemo = ({ playerPosition, playerRotation, phaseId, replaySeed }) => {
  const shipRef = useRef();
  const wallRef = useRef();
  const portalRef = useRef();
  const timerRef = useRef(0);
  const currentPosRef = useRef(new THREE.Vector3(120, 40, 120));
  const currentYawRef = useRef(0);
  const wallOpacityRef = useRef(0);
  const portalOpacityRef = useRef(0);
  const portalScaleRef = useRef(0.2);
  const arenaHalfX = (GAME_CONFIG.world?.size?.x || 2025) / 2;
  const arenaHalfZ = (GAME_CONFIG.world?.size?.z || 2025) / 2;
  const clampToArena = (vec, pad = 30) => {
    vec.x = THREE.MathUtils.clamp(vec.x, -arenaHalfX + pad, arenaHalfX - pad);
    vec.y = THREE.MathUtils.clamp(vec.y, 24, 190);
    vec.z = THREE.MathUtils.clamp(vec.z, -arenaHalfZ + pad, arenaHalfZ - pad);
    return vec;
  };

  useEffect(() => {
    timerRef.current = 0;
    wallOpacityRef.current = 0;
    portalOpacityRef.current = 0;
    portalScaleRef.current = 0.2;
  }, [phaseId, replaySeed]);

  useFrame((_, delta) => {
    const pp = playerPosition || { x: 0, y: 40, z: 0 };
    const yaw = playerRotation?.yaw || 0;
    timerRef.current += delta;

    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).normalize();
    const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();

    const anchor = new THREE.Vector3(pp.x, 40, pp.z).add(forward.multiplyScalar(130));
    const targetPos = anchor.clone();

    if (phaseId === 'blink' || phaseId === 'combo') {
      const blinkPulse = Math.floor(timerRef.current / 1.1) % 2 === 0 ? 1 : -1;
      targetPos.add(right.clone().multiplyScalar(blinkPulse * 90));
    }

    if (phaseId === 'portal' || phaseId === 'combo') {
      if ((timerRef.current % 4) > 2.2) {
        targetPos.add(right.clone().multiplyScalar(160));
      }
    }
    clampToArena(targetPos, 70);

    currentPosRef.current.lerp(targetPos, 0.08);
    currentYawRef.current += (yaw + Math.PI - currentYawRef.current) * 0.1;

    if (shipRef.current) {
      shipRef.current.position.copy(currentPosRef.current);
      shipRef.current.rotation.set(0, currentYawRef.current, 0);
    }

    const wallShouldShow = phaseId === 'crystal_wall' || (phaseId === 'combo' && (timerRef.current % 6) > 2 && (timerRef.current % 6) < 4);
    wallOpacityRef.current += (wallShouldShow ? 0.45 : -0.45) * delta * 3;
    wallOpacityRef.current = THREE.MathUtils.clamp(wallOpacityRef.current, 0, 0.75);

    if (wallRef.current) {
      const wallPos = currentPosRef.current.clone().add(
        new THREE.Vector3(Math.sin(currentYawRef.current), 0, Math.cos(currentYawRef.current)).multiplyScalar(90)
      );
      clampToArena(wallPos, 150);
      wallRef.current.position.copy(wallPos);
      wallRef.current.rotation.set(0, currentYawRef.current, 0);
      wallRef.current.material.opacity = wallOpacityRef.current;
      wallRef.current.visible = wallOpacityRef.current > 0.02;
    }

    const portalCycle = (phaseId === 'portal' || phaseId === 'combo') ? (timerRef.current % 4) : 0;
    const portalShouldShow = (phaseId === 'portal' || phaseId === 'combo') && portalCycle > 0.2 && portalCycle < 1.8;
    portalOpacityRef.current += (portalShouldShow ? 0.6 : -0.6) * delta * 3;
    portalOpacityRef.current = THREE.MathUtils.clamp(portalOpacityRef.current, 0, 0.85);
    portalScaleRef.current += (portalShouldShow ? 1 : 0.2 - portalScaleRef.current) * delta * 2.2;
    portalScaleRef.current = THREE.MathUtils.clamp(portalScaleRef.current, 0.2, 1.0);

    if (portalRef.current) {
      const pForward = new THREE.Vector3(Math.sin(currentYawRef.current), 0, Math.cos(currentYawRef.current));
      const portalPos = currentPosRef.current.clone().add(pForward.multiplyScalar(70));
      clampToArena(portalPos, 80);
      portalRef.current.position.copy(portalPos);
      portalRef.current.lookAt(currentPosRef.current.clone().add(pForward.multiplyScalar(140)));
      portalRef.current.rotation.z += delta * 1.5;
      portalRef.current.scale.setScalar(portalScaleRef.current * 24);
      portalRef.current.material.opacity = portalOpacityRef.current;
      portalRef.current.visible = portalOpacityRef.current > 0.02;
    }
  });

  return (
    <group>
      <ShipRenderer
        ref={shipRef}
        position={{ x: 120, y: 40, z: 120 }}
        rotation={{ x: 0, y: 0, z: 0 }}
        visualTilt={0}
        isBoosting={phaseId === 'blink' || phaseId === 'combo'}
      />

      <mesh ref={wallRef} visible={false}>
        <boxGeometry args={[220, 120, 4]} />
        <meshStandardMaterial color="#9f7aea" transparent opacity={0} emissive="#7c3aed" emissiveIntensity={0.5} />
      </mesh>

      <mesh ref={portalRef} visible={false}>
        <torusGeometry args={[1, 0.2, 12, 28]} />
        <meshBasicMaterial color="#00eaff" transparent opacity={0} />
      </mesh>
    </group>
  );
};

const TutorialMode = ({ playerName, onComplete, onLeaveGame, requireCompletion = false }) => {
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0 });
  const [playerRotation, setPlayerRotation] = useState({ pitch: 0, yaw: 0, roll: 0 });
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [movementDistance, setMovementDistance] = useState(0);
  const [blinkCount, setBlinkCount] = useState(0);
  const [wallCount, setWallCount] = useState(0);
  const [portalCount, setPortalCount] = useState(0);
  const [comboProgress, setComboProgress] = useState({
    blink: false,
    crystalWall: false,
    portal: false,
  });
  const [portalAbility, setPortalAbility] = useState(null);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [demoReplaySeed, setDemoReplaySeed] = useState(0);
  const [spawnOverride, setSpawnOverride] = useState(null);

  const startTimeRef = useRef(Date.now());
  const previousPositionRef = useRef(null);
  const lastDodgeActiveRef = useRef(false);
  const lastWallCooldownRef = useRef(0);
  const comboStartRef = useRef(0);
  const phaseStartMsRef = useRef(0);
  const lastCompletedPhaseRef = useRef(null);
  const tutorialDoneRef = useRef(false);
  const timelineStartTsRef = useRef(Date.now());
  const timelineRef = useRef({
    version: TUTORIAL_STATS_VERSION,
    player: playerName || 'guest',
    startedAtIso: new Date().toISOString(),
    startedAtTs: Date.now(),
    events: [],
    phases: [],
    checkpoints: [],
  });
  const voiceMapRef = useRef(new Map());
  const voiceQueueRef = useRef([]);
  const voicePlayingRef = useRef(false);
  const voiceAudioRef = useRef(null);
  const voiceUtteranceRef = useRef(null);
  const voicePlayedRef = useRef(new Set());
  const voiceManifestResolvedRef = useRef(false);
  const voiceUnlockedRef = useRef(false);

  const activePhase = PHASES[phaseIndex];
  useTrainingWeapons(playerPosition, playerRotation);

  const stopActiveVoicePlayback = () => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    voiceUtteranceRef.current = null;
    voicePlayingRef.current = false;
  };

  const playNextVoiceLine = () => {
    if (voicePlayingRef.current) return;
    if (!voiceManifestResolvedRef.current) return;
    if (!voiceUnlockedRef.current) return;
    const next = voiceQueueRef.current.shift();
    if (!next) return;

    const { id, text } = next;
    const audioUrl = voiceMapRef.current.get(id);
    voicePlayingRef.current = true;

    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        voiceAudioRef.current = audio;
        audio.preload = 'auto';
        audio.onended = () => {
          voiceAudioRef.current = null;
          voicePlayingRef.current = false;
          playNextVoiceLine();
        };
        audio.onerror = () => {
          voiceAudioRef.current = null;
          voicePlayingRef.current = false;
          playNextVoiceLine();
        };
        const playPromise = audio.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {
            voiceQueueRef.current.unshift(next);
            voiceAudioRef.current = null;
            voicePlayingRef.current = false;
          });
        }
        return;
      } catch {

      }
    }

    if (window.speechSynthesis && text) {
      const utterance = new SpeechSynthesisUtterance(text);
      voiceUtteranceRef.current = utterance;
      utterance.rate = 1.02;
      utterance.pitch = 0.95;
      utterance.onend = () => {
        voiceUtteranceRef.current = null;
        voicePlayingRef.current = false;
        playNextVoiceLine();
      };
      utterance.onerror = () => {
        voiceUtteranceRef.current = null;
        voicePlayingRef.current = false;
        playNextVoiceLine();
      };
      window.speechSynthesis.speak(utterance);
      return;
    }

    voicePlayingRef.current = false;
    playNextVoiceLine();
  };

  const queueVoiceLine = (id, { replaceQueue = false, interruptCurrent = false } = {}) => {
    if (!id || voicePlayedRef.current.has(id)) return;
    if (interruptCurrent) {
      stopActiveVoicePlayback();
    }
    if (replaceQueue) {
      voiceQueueRef.current = [];
    }
    voicePlayedRef.current.add(id);
    voiceQueueRef.current.push({ id, text: TUTORIAL_FALLBACK_TEXT[id] || '' });
    playNextVoiceLine();
  };

  const recordEvent = (type, payload = {}) => {
    const now = Date.now();
    timelineRef.current.events.push({
      type,
      atMs: now - timelineStartTsRef.current,
      atIso: new Date(now).toISOString(),
      ...payload,
    });
  };

  const persistTimeline = (extra = {}) => {
    const username = playerName || 'guest';
    const snapshot = {
      ...timelineRef.current,
      completedAtIso: new Date().toISOString(),
      totalDurationMs: Date.now() - timelineStartTsRef.current,
      ...extra,
    };
    try {
      localStorage.setItem(getTimelineLatestKey(username), JSON.stringify(snapshot));
      localStorage.setItem(getTimelineArchiveKey(username, timelineRef.current.startedAtTs), JSON.stringify(snapshot));
    } catch (error) {
      console.warn('Could not persist tutorial timeline:', error);
    }
    window.__astraTutorialTimeline = snapshot;
    return snapshot;
  };

  const buildSyncPack = (timelineSnapshot) => {
    const checkpointMap = new Map(
      (timelineSnapshot.checkpoints || []).map((cp) => [cp.id, Number(cp.atMs) || 0]),
    );
    const eventMap = new Map();
    for (const ev of timelineSnapshot.events || []) {
      if (!ev?.type) continue;
      if (!eventMap.has(ev.type)) eventMap.set(ev.type, []);
      eventMap.get(ev.type).push(Number(ev.atMs) || 0);
    }

    const resolveAnchor = (lineId) => {
      const id = String(lineId || '').toLowerCase();
      const prefix = normalizePhasePrefix(id.split('_')[0]);
      if (prefix === 'intro' && eventMap.has('tutorial_started')) return ['tutorial_started', eventMap.get('tutorial_started')[0]];
      if (prefix === 'outro' && eventMap.has('tutorial_completed')) return ['tutorial_completed', eventMap.get('tutorial_completed')[0]];
      const phaseStart = `${prefix}_start`;
      if (checkpointMap.has(phaseStart)) return [phaseStart, checkpointMap.get(phaseStart)];
      if (checkpointMap.has('movement_start')) return ['movement_start', checkpointMap.get('movement_start')];
      return ['start_zero', 0];
    };

    const cues = [];
    let rollingEndMs = 0;
    for (const line of DEFAULT_TUTORIAL_LINES) {
      const [anchorRef, anchorMs] = resolveAnchor(line.id);
      const offsetMs = line.id.startsWith('intro') ? 350 : 250;
      let startMs = anchorMs + offsetMs;
      if (startMs < rollingEndMs + 120) startMs = rollingEndMs + 120;
      const durationMs = estimateDurationMs(line.text);
      const endMs = startMs + durationMs;
      rollingEndMs = endMs;
      cues.push({
        id: line.id,
        text: line.text,
        anchorRef,
        anchorMs,
        startMs,
        endMs,
        startSec: Number((startMs / 1000).toFixed(3)),
        endSec: Number((endMs / 1000).toFixed(3)),
      });
    }

    return {
      createdAt: new Date().toISOString(),
      linesSource: 'DEFAULT_TUTORIAL_LINES',
      timelineStartedAtIso: timelineSnapshot.startedAtIso || null,
      cues,
      srt: renderSrt(cues),
    };
  };

  const progressValue = useMemo(() => {
    switch (activePhase.id) {
      case 'movement':
        return `${Math.floor(movementDistance)} / 400`;
      case 'blink':
        return `${blinkCount} / 2`;
      case 'crystal_wall':
        return `${wallCount} / 1`;
      case 'portal':
        return `${portalCount} / 1`;
      case 'combo':
        return `${Number(comboProgress.blink) + Number(comboProgress.crystalWall) + Number(comboProgress.portal)} / 3`;
      default:
        return '';
    }
  }, [activePhase.id, blinkCount, comboProgress, movementDistance, portalCount, wallCount]);

  const readinessChecks = useMemo(() => ([
    { id: 'distance', label: 'Travel 400+', done: movementDistance >= 400, value: `${Math.floor(movementDistance)} / 400` },
    { id: 'blink', label: 'Blink x2', done: blinkCount >= 2, value: `${blinkCount} / 2` },
    { id: 'wall', label: 'Wall x1', done: wallCount >= 1, value: `${wallCount} / 1` },
    { id: 'portal', label: 'Portal x1', done: portalCount >= 1, value: `${portalCount} / 1` },
  ]), [movementDistance, blinkCount, wallCount, portalCount]);

  const markComplete = () => {
    if (tutorialDone) return;
    tutorialDoneRef.current = true;
    setTutorialDone(true);
    const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const stats = {
      completedAt: new Date().toISOString(),
      elapsedSeconds,
      movementDistance: Math.floor(movementDistance),
      blinkCount,
      wallCount,
      portalCount,
    };
    try {
      localStorage.setItem(getStatsKey(playerName || 'guest'), JSON.stringify(stats));
    } catch (error) {
      console.warn('Could not persist tutorial stats:', error);
    }
    recordEvent('tutorial_completed', {
      elapsedSeconds,
      movementDistance: Math.floor(movementDistance),
      blinkCount,
      wallCount,
      portalCount,
    });
    queueVoiceLine('outro_01', { replaceQueue: true, interruptCurrent: true });
    persistTimeline({
      stats,
      finalPhase: activePhase.id,
      checkpoints: timelineRef.current.checkpoints,
      phaseSummary: timelineRef.current.phases,
    });
    try {
      const timelineSnapshot = window.__astraTutorialTimeline || persistTimeline();
      const syncPack = buildSyncPack(timelineSnapshot);
      localStorage.setItem(getSyncLatestKey(playerName || 'guest'), JSON.stringify(syncPack));
      window.__astraTutorialSyncPack = syncPack;
      console.log('Tutorial sync pack generated:', syncPack);
    } catch (error) {
      console.warn('Could not generate tutorial sync pack:', error);
    }
    if (onComplete) onComplete(stats);
  };

  const advancePhase = () => {
    const nowMs = Date.now() - timelineStartTsRef.current;
    const currentPhase = PHASES[phaseIndex];
    if (lastCompletedPhaseRef.current === currentPhase.id) {
      return;
    }
    lastCompletedPhaseRef.current = currentPhase.id;
    timelineRef.current.phases.push({
      id: currentPhase.id,
      title: currentPhase.title,
      startedAtMs: phaseStartMsRef.current,
      endedAtMs: nowMs,
      durationMs: Math.max(0, nowMs - phaseStartMsRef.current),
    });
    timelineRef.current.checkpoints.push({
      id: `${currentPhase.id}_complete`,
      atMs: nowMs,
      label: `${currentPhase.title} complete`,
    });
    recordEvent('phase_completed', { phaseId: currentPhase.id, phaseTitle: currentPhase.title });

    setPhaseIndex((prev) => {
      if (prev >= PHASES.length - 1) {
        markComplete();
        return prev;
      }
      return prev + 1;
    });
  };

  useEffect(() => {
    phaseStartMsRef.current = Date.now() - timelineStartTsRef.current;
    recordEvent('phase_started', {
      phaseId: activePhase.id,
      phaseTitle: activePhase.title,
      hint: activePhase.hint,
      keybind: activePhase.keybind,
      demo: activePhase.demo,
    });
    timelineRef.current.checkpoints.push({
      id: `${activePhase.id}_start`,
      atMs: phaseStartMsRef.current,
      label: `${activePhase.title} start`,
    });
    queueVoiceLine(TUTORIAL_LINE_BY_PHASE[activePhase.id], { replaceQueue: true, interruptCurrent: true });
  }, [activePhase.id]);

  useEffect(() => {
    const unlockVoice = () => {
      if (voiceUnlockedRef.current) return;
      voiceUnlockedRef.current = true;
      playNextVoiceLine();
    };

    window.addEventListener('pointerdown', unlockVoice, { once: true });
    window.addEventListener('keydown', unlockVoice, { once: true });

    recordEvent('tutorial_started', { player: playerName || 'guest', phaseCount: PHASES.length });
    queueVoiceLine('intro_01');

    const handleKeyDown = (event) => {
      const key = event.key?.toLowerCase();
      if (!key || event.repeat) return;
      const trackableKeys = new Set(['w', 'a', 's', 'd', 'q', 'e', '1', '2', 'shift']);
      if (!trackableKeys.has(key)) return;
      recordEvent('input_keydown', { key });
    };

    const handleMouseDown = (event) => {
      if (event.button === 0) {
        recordEvent('input_mousedown', { button: 'left' });
      } else if (event.button === 2) {
        recordEvent('input_mousedown', { button: 'right' });
      }
    };

      window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('pointerdown', unlockVoice);
      window.removeEventListener('keydown', unlockVoice);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
      persistTimeline({ interrupted: !tutorialDoneRef.current });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const candidates = buildTutorialAudioManifestCandidates();

    const loadManifest = async () => {
      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate, { cache: 'no-store' });
          if (!response.ok) continue;
          const manifest = await response.json();
          const items = Array.isArray(manifest?.items) ? manifest.items : [];
          if (!items.length) continue;
          const base = candidate.slice(0, candidate.lastIndexOf('/'));
          const nextMap = new Map();
          for (const item of items) {
            if (!item?.id || !item?.file) continue;
            nextMap.set(String(item.id), `${base}/${item.file}`);
          }
          if (!cancelled && nextMap.size > 0) {
            voiceMapRef.current = nextMap;
            voiceManifestResolvedRef.current = true;
            console.log('[TUTORIAL-AUDIO] Loaded manifest:', candidate, 'lines:', nextMap.size);
            playNextVoiceLine();
            return;
          }
        } catch {

        }
      }
      if (!cancelled) {
        voiceManifestResolvedRef.current = true;
        console.warn('[TUTORIAL-AUDIO] No manifest found, using speech synthesis fallback.');
        playNextVoiceLine();
      }
    };

    loadManifest();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activePhase.id === 'combo') {
      comboStartRef.current = Date.now();
      setComboProgress({ blink: false, crystalWall: false, portal: false });
    }
  }, [activePhase.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TUTORIAL_SPAWN_OVERRIDE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y) && Number.isFinite(parsed?.z)) {
        setSpawnOverride(parsed);
      }
    } catch {

    }
  }, []);

  useEffect(() => {
    const defaultSpawn = DEFAULT_TUTORIAL_SPAWN;
    const spawn = spawnOverride || defaultSpawn;
    const forceSpawn = () => {
      const movement = window.gameMovementState;
      if (!movement?.position) return false;
      movement.position.set(spawn.x, spawn.y, spawn.z);
      movement.yaw = Number.isFinite(spawn?.yaw) ? spawn.yaw : -Math.PI * 0.75;
      movement.pitch = 0;
      movement.roll = 0;
      if (movement.velocity?.set) {
        movement.velocity.set(0, 0, 0);
      }
      if (movement.dodge) {
        movement.dodge.isLeftDodging = false;
        movement.dodge.isRightDodging = false;
        movement.dodge.isUpDodging = false;
        movement.dodge.isDownDodging = false;
      }
      movement.initialized = true;
      movement.spawnReceived = true;
      return true;
    };

    const timer = setTimeout(forceSpawn, 150);
    const interval = setInterval(() => {
      if (forceSpawn()) {
        clearInterval(interval);
      }
    }, 120);

    const stopTimer = setTimeout(() => clearInterval(interval), 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(stopTimer);
      clearInterval(interval);
    };
  }, [spawnOverride]);

  useEffect(() => {
    const handlePortalTeleport = () => {
      recordEvent('portal_teleport');
      setPortalCount((prev) => prev + 1);
      if (activePhase.id === 'portal') {
        advancePhase();
      } else if (activePhase.id === 'combo') {
        setComboProgress((prev) => ({ ...prev, portal: true }));
      }
    };

    window.addEventListener('portal-teleport', handlePortalTeleport);
    return () => window.removeEventListener('portal-teleport', handlePortalTeleport);
  }, [activePhase.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      const gameState = window.gameMovementState;
      if (!gameState?.position) return;

      setPortalAbility(gameState.portalAbility || null);

      if (activePhase.id === 'movement') {
        if (!previousPositionRef.current) {
          previousPositionRef.current = gameState.position.clone();
        } else {
          const step = previousPositionRef.current.distanceTo(gameState.position);
          previousPositionRef.current.copy(gameState.position);

          if (step > 0 && step < 100) {
            setMovementDistance((prev) => {
              const next = prev + step;
              if (next >= 400) {
                setTimeout(() => advancePhase(), 0);
              }
              return next;
            });
          }
        }
      }

      const dodgeState = gameState.dodge;
      const isDodging = !!(
        dodgeState?.isLeftDodging ||
        dodgeState?.isRightDodging ||
        dodgeState?.isUpDodging ||
        dodgeState?.isDownDodging
      );
      if (isDodging && !lastDodgeActiveRef.current) {
        recordEvent('blink_trigger');
        setBlinkCount((prev) => {
          const next = prev + 1;
          if (activePhase.id === 'blink' && next >= 2) {
            setTimeout(() => advancePhase(), 0);
          }
          return next;
        });
        if (activePhase.id === 'combo') {
          setComboProgress((prev) => ({ ...prev, blink: true }));
        }
      }
      lastDodgeActiveRef.current = isDodging;

      const wallCooldown = gameState.crystalWallAbility?.cooldownEndTime || 0;
      if (wallCooldown > Date.now() && wallCooldown !== lastWallCooldownRef.current) {
        lastWallCooldownRef.current = wallCooldown;
        recordEvent('crystal_wall_deployed');
        setWallCount((prev) => {
          const next = prev + 1;
          if (activePhase.id === 'crystal_wall') {
            setTimeout(() => advancePhase(), 0);
          }
          return next;
        });
        if (activePhase.id === 'combo') {
          setComboProgress((prev) => ({ ...prev, crystalWall: true }));
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [activePhase.id]);

  useEffect(() => {
    if (activePhase.id !== 'combo') return;
    if (comboProgress.blink && comboProgress.crystalWall && comboProgress.portal) {
      markComplete();
      return;
    }

    if (comboStartRef.current > 0 && Date.now() - comboStartRef.current > 45000) {
      comboStartRef.current = Date.now();
      setComboProgress({ blink: false, crystalWall: false, portal: false });
    }
  }, [activePhase.id, comboProgress]);

  useEffect(() => () => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    voiceQueueRef.current = [];
    voicePlayingRef.current = false;
  }, []);

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      <Canvas
        shadows
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false, depth: true }}
      >
        <PerspectiveCamera makeDefault position={[0, 5, 10]} near={0.1} far={5000} fov={75} />
        <HDRSkybox />
        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight position={[10, 20, 10]} intensity={1.2} color="#ffffff" castShadow />
        <hemisphereLight skyColor="#87CEEB" groundColor="#362907" intensity={0.6} />
        <ArenaExternalLightRig />
        <MasterRenderLoopDriver />
        <EnvironmentRenderer loading={false} />
        <BoundaryWithMarkers />
        <TutorialOpponentDemo
          playerPosition={playerPosition}
          playerRotation={playerRotation}
          phaseId={activePhase.id}
          replaySeed={demoReplaySeed}
        />
        <PlayerController
          playerName={playerName}
          health={100}
          boost={100}
          weaponHeat={0}
          isOverheated={false}
          isTraining={true}
          onPositionChange={setPlayerPosition}
          onRotationChange={setPlayerRotation}
        />
        <BulletsRenderer />
      </Canvas>
      <StaticCrosshair />

      <div className="absolute left-4 top-20 z-20 w-[340px] bg-black/80 border border-cyan-500/40 rounded-lg p-4 text-white">
        <div className="text-cyan-300 font-semibold tracking-wide">Tutorial Run ({TUTORIAL_STATS_VERSION})</div>
        <div className="mt-1 text-[11px] uppercase tracking-wide text-orange-300">Opponent Demo: Live Arena Scale</div>
        <div className="mt-1 text-lg font-bold">{activePhase.title}</div>
        <div className="text-sm text-gray-300 mt-1">{activePhase.hint}</div>
        <div className="text-xs text-cyan-300 mt-2">Input: {activePhase.keybind}</div>
        <div className="mt-3 text-sm">
          <span className="text-gray-400">{activePhase.targetLabel}:</span>{' '}
          <span className="text-cyan-300 font-semibold">{progressValue}</span>
        </div>

        <div className="mt-4 space-y-2">
          {PHASES.map((phase, idx) => {
            const isDone = idx < phaseIndex || tutorialDone;
            const isActive = idx === phaseIndex && !tutorialDone;
            return (
              <div key={phase.id} className={`flex items-center gap-2 text-sm ${isActive ? 'text-cyan-300' : 'text-gray-300'}`}>
                {isDone ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Circle className="w-4 h-4" />}
                <span>{phase.title}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded border border-cyan-500/30 bg-cyan-950/20 p-3">
          <div className="text-xs uppercase tracking-wide text-cyan-300">Phase Coaching</div>
          <div className="mt-1 space-y-1 text-xs text-cyan-100">
            {(PHASE_COACHING[activePhase.id] || []).map((tip, idx) => (
              <div key={`${activePhase.id}_tip_${idx}`}>- {tip}</div>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded border border-green-500/30 bg-green-950/20 p-3">
          <div className="text-xs uppercase tracking-wide text-green-300">Readiness Checks</div>
          <div className="mt-2 space-y-1">
            {readinessChecks.map((check) => (
              <div key={check.id} className="flex items-center justify-between text-xs">
                <span className={check.done ? 'text-green-300' : 'text-gray-300'}>{check.label}</span>
                <span className={check.done ? 'text-green-300' : 'text-gray-400'}>{check.value}</span>
              </div>
            ))}
          </div>
        </div>

        {activePhase.id === 'combo' && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className={`p-2 rounded border ${comboProgress.blink ? 'border-green-400 text-green-300' : 'border-gray-600 text-gray-300'}`}>
              <Move className="w-3.5 h-3.5 mb-1" /> Blink
            </div>
            <div className={`p-2 rounded border ${comboProgress.crystalWall ? 'border-green-400 text-green-300' : 'border-gray-600 text-gray-300'}`}>
              <Shield className="w-3.5 h-3.5 mb-1" /> Wall
            </div>
            <div className={`p-2 rounded border ${comboProgress.portal ? 'border-green-400 text-green-300' : 'border-gray-600 text-gray-300'}`}>
              <Sparkles className="w-3.5 h-3.5 mb-1" /> Portal
            </div>
          </div>
        )}

        <button
          onClick={markComplete}
          disabled={tutorialDone}
          className="mt-4 w-full rounded border border-orange-500/60 bg-orange-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-200 hover:bg-orange-500/30 disabled:opacity-40"
        >
          Skip Tutorial
        </button>
      </div>

      {!tutorialDone && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 z-30 w-[min(92vw,760px)] bg-black/85 border border-cyan-400/60 rounded-lg p-4 text-white">
          <div className="text-cyan-300 font-semibold text-sm tracking-wide">DO THIS NOW</div>
          <div className="text-xl font-bold mt-1">{activePhase.title}</div>
          <div className="text-sm text-gray-200 mt-1">{activePhase.demo}</div>
          <div className="mt-3 inline-block px-3 py-1 rounded bg-cyan-900/40 border border-cyan-500/40 text-cyan-200 text-sm">
            {activePhase.keybind}
          </div>
          <div className="mt-2 text-xs text-cyan-200/90">Complete this action and the tutorial advances automatically.</div>
        </div>
      )}

      {!tutorialDone && (
        <div className="absolute left-1/2 bottom-8 -translate-x-1/2 z-20 px-4 py-2 rounded border border-white/25 bg-black/70 text-white text-sm">
          {activePhase.hint}
        </div>
      )}

      <GameHUD
        playerHealth={100}
        playerBoost={100}
        weaponHeat={0}
        isOverheated={false}
        gameMode="tutorial"
        onLeaveGame={requireCompletion ? undefined : onLeaveGame}
        portalAbility={portalAbility}
      />
    </div>
  );
};

export default TutorialMode;
