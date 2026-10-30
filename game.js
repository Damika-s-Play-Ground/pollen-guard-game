import { renderBossWarnings } from './src/boss-warning-ui.js';
import { FixedStepClock, hashGameplayState, normalizeRunSave, saleRefund, towerUpgradeQuote, getEffectiveTowerStats, towersAreLinked, isUnsupportedRunVersion, RUN_SAVE_VERSION, assignRunEntityIds } from './src/game-core.js';
import { DEFAULT_GAME_SPEED, toggleGameSpeed } from './src/simulation-speed.js';
import { createGameLoop } from './src/game-loop.js';
import { createInspectorDisplaySignature, createRenderGate, createRenderSignature } from './src/render-gate.js';
import { modes, maps, towersDef, towerRoles, enemyCombatProfiles } from './src/game-data.js';
import { CAMPAIGN_WAVES, registerCustomWaveSchedules, validateWaveSchedules, waveSchedulesForMap, WAVE_SCHEDULE_VERSION } from './src/waves.js';
import { COMBAT_RULES, COMBAT_INTERACTION_MATRIX, canHitTarget } from './src/combat-rules.js';
import { createEnemy, stepCombat } from './src/combat-simulation.js';
import { BOSS_VARIANTS, bossLeakCost } from './src/boss-encounters.js';
import { towerAbilityTargets } from './src/combat-actions.js';
import { chooseTargetForTower, targetPriorityInfo } from './src/targeting.js';
import { ACTION_LOG_VERSION, MAX_RUN_ACTIONS, appendTickAction, createRunSeed } from './src/action-log.js';
import { applyPlayerAction, createReplayPlayback, validateTowerPlacement } from './src/game-actions.js';
import { parseRunExport, serializeRunExport } from './src/run-transfer.js';
import { clearRunBackupAfterReset, runHasGameplayProgress, selectRecoverableRun, writeRunWithBackup } from './src/run-storage.js';
import { createRunSaveSnapshot } from './src/run-save.js';
import { projectSavedRunToRuntime } from './src/run-restore.js';
import { runSaveFailureMessage } from './src/run-save-ui.js';
import { registerOfflineSupport } from './src/offline-support.js';
import { compareRunSummaries, normalizeRunHistory, recordCompletedRun, RUN_HISTORY_STORAGE_KEY, verifyRecordedReplay } from './src/run-history.js';
import { renderRunHistory } from './src/run-history-ui.js';
import { findTowerTestPlacements, runTowerTestRange, towerTestRangeChoices } from './src/tower-test-range.js';
import { renderTowerTestRange } from './src/tower-test-range-ui.js';
import { addCustomMapToCollection, customMapToRuntimeMap, customMapWaveSchedules, normalizeCustomMapCollection, CUSTOM_MAP_STORAGE_KEY } from './src/map-editor.js';
import { renderMapEditor } from './src/map-editor-ui.js';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, CHALLENGE_RULES, difficultyFor, normalizeChallengeRules } from './src/challenge-rules.js';
import { createRunState, transitionRunState, runStateSaveFlags, runStateStopsClock } from './src/run-state.js';
import { clearResearchLoadout, earnedResearchPoints, normalizeResearchState, purchaseResearchNode, researchLoadoutIds, researchStartingAdjustment, selectResearchNode } from './src/research-tree.js';
import { equipRelic, unequipRelic, normalizeRelicState, relicLoadoutIds } from './src/relics.js';
import { calculatePathLength, distanceToPath } from './src/path-geometry.js';
import { createEnemyRouteGeometry } from './src/air-routes.js';
import { defaultGateRoute, gateSwitchesForMap, pathForGateRoute, summarizeGateRoute } from './src/gate-routes.js';
import { bindCanvasPointerInput, bindKeyboardInput, findTowersAtPoint, movePlacementCursor, shouldPrioritizeBuildPick, worldRadiusForCssPixels } from './src/game-input.js';
import { createStaticMapCache, drawBattlefield, shotRecoil } from './src/game-renderer.js';
import { createRenderSnapshots } from './src/render-snapshot.js';
import { towerArtSvg } from './src/tower-art.js';
import { createProfileStorage, UI_SETTINGS_STORAGE_KEY } from './src/profile-storage.js';
import { createAutoStartController, isAutoStartEligible } from './src/auto-start.js';
import { buildAutoStartControlView } from './src/auto-start-ui.js';
import { requiresUpgradeBranchConfirmation } from './src/upgrade-confirmation.js';
import { buildBestWaveRecord, buildRunProgressEvents } from './src/profile-progression.js';
import { CAMPAIGN_MISSIONS, CAMPAIGN_MISSION_BY_ID, buildMissionCompletion } from './src/campaign.js';
import { buildMissionMasteryProgress, missionMasteryResultText } from './src/mission-mastery.js';
import { ENEMY_INTEL, enemyIntelFor, firstEncounterIntel } from './src/enemy-intel.js';
import { buildEnemyBriefingView, filterEnemyGuide as filterEnemyGuideCards, renderEnemyBriefing, renderEnemyGuide } from './src/enemy-guide-ui.js';
import { buildPlacementHintView, movePlacementConfirmation, renderPlacementHint } from './src/placement-ui.js';
import { hideTowerSelectionChooser, showTowerSelectionChooser } from './src/selection-chooser-ui.js';
import { advanceTutorialPracticeState, beginTutorialPracticeState, createTutorialPracticeState, finishTutorialPracticeState, resetTutorialPracticeState } from './src/tutorial-progress.js';
import { buildTutorialCoachView, clearTutorialCoach, renderTutorialCoach, renderTutorialStep } from './src/tutorial-ui.js';
import { DEFAULT_KEY_BINDINGS, bindKey, keyCodeLabel } from './src/keyboard-bindings.js';
import { keyboardActionLabels as buildKeyboardActionLabels, renderKeyboardBindings as presentKeyboardBindings } from './src/keyboard-bindings-ui.js';
import { shouldEmitParticles } from './src/visual-preferences.js';
import { createGameAudio } from './src/game-audio.js';
import { appendCosmeticParticles } from './src/effect-budget.js';
import { buildWavePreviewView, buildWaveTimelineView, renderWavePreview, renderWaveTimeline } from './src/wave-ui.js';
import { shouldShowAirRoute } from './src/air-route-visibility.js';
import { renderTowerCatalog, updateTowerCatalogAffordability } from './src/tower-catalog-ui.js';
import { renderTowerInspector, renderTowerUpgradeAction, renderTowerUpgradePreview, renderTowerTargetStatus } from './src/tower-inspector-ui.js';
import { renderTowerAbilityDock } from './src/tower-ability-dock-ui.js';
import { buildHudView, renderHud } from './src/hud-ui.js';
import { buildRunDebrief, createCombatPerformance, registerCombatTower } from './src/combat-performance.js';
import { renderResultsScreen } from './src/results-ui.js';
import { createConfirmationFlow } from './src/confirmation-flow.js';
import { ACHIEVEMENT_DEFINITIONS, renderAchievements as renderProfileAchievements, renderMapOptions as renderProfileMapOptions, renderCampaignMap as renderProfileCampaignMap, renderResearchTree as renderProfileResearchTree, renderRelicLoadout as renderProfileRelicLoadout } from './src/profile-ui.js';
import { buildTowerInspectorModel, buildTowerUpgradeAction, buildTowerUpgradePreview, buildTowerTargetStatus, isTowerLinkedToAnother } from './src/tower-inspector-model.js';
import { buildTowerAbilityDockModel, buildTowerAbilityPreview } from './src/tower-ability-dock-model.js';
import { renderUiSettings } from './src/settings-ui.js';
import { bindUiSettingsControls } from './src/settings-controller.js';
import { MAX_RUN_IMPORT_BYTES, bindRunTransferControls, renderRunTransferStatus, runImportFailureMessage, runImportWriteFailureMessage } from './src/run-transfer-ui.js';
import { renderCombatReference } from './src/combat-reference-ui.js';
import { activateGuardianPulse, advanceMeadowGuardian, GUARDIAN_PULSE_COOLDOWN } from './src/meadow-guardian.js';
import { createMissionKitState } from './src/mission-kit.js';
import { buildSpellPreview, DEFAULT_SPELL_LOADOUT, normalizeSpellLoadout, SPELLS } from './src/spells.js';
import { terrainBonusForTower, terrainZoneAt } from './src/terrain.js';
import { advanceDroppedSeeds, createSeedObjective, SEED_RECOVERY_RULE, seedObjectiveTally } from './src/seed-objective.js';
import { boardChallengeForRun, CHALLENGE_SPELL_LOADOUT, importChallengeCode, recordChallengeBest } from './src/challenge-board.js';
import { renderChallengeBoard } from './src/challenge-board-ui.js';
import { ENDLESS_CHOICES, endlessChoiceDue, endlessChoiceRequired } from './src/endless-mode.js';
import { renderEndlessChoices } from './src/endless-mode-ui.js';

let savedCustomMaps=normalizeCustomMapCollection(null);
try{savedCustomMaps=normalizeCustomMapCollection(JSON.parse(localStorage.getItem(CUSTOM_MAP_STORAGE_KEY)||'null'));}catch{}
for(const customMap of savedCustomMaps.maps){const runtime=customMapToRuntimeMap(customMap),schedules=customMapWaveSchedules(customMap);if(runtime&&schedules){maps[runtime.id]=runtime;registerCustomWaveSchedules(runtime.id,schedules);}}
for(const [mapId,schedules] of Object.entries(CAMPAIGN_WAVES)){
  const waveValidation=validateWaveSchedules(schedules);
  if(!waveValidation.valid)throw new Error(`Invalid ${mapId} wave data: ${waveValidation.reason}`);
}

(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const canvas = byId('game');
  const ctx = canvas.getContext('2d');
  let canvasDisplayScale = 1;
  const syncCanvasDisplayScale = () => {
    const scale = canvas.clientWidth / canvas.width;
    canvasDisplayScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  };
  const canvasScaleObserver = 'ResizeObserver' in window ? new ResizeObserver(syncCanvasDisplayScale) : null;
  if (canvasScaleObserver) canvasScaleObserver.observe(canvas);
  else window.addEventListener('resize', syncCanvasDisplayScale);
  syncCanvasDisplayScale();
  const staticMapCache = createStaticMapCache((width,height)=>{const layer=document.createElement('canvas');layer.width=width;layer.height=height;return layer;});
  const selectedInspectorRenderGate=createRenderGate(),upgradePreviewRenderGate=createRenderGate(),targetStatusRenderGate=createRenderGate(),abilityDockRenderGate=createRenderGate();
  const magnifierCanvas=byId('mapMagnifier'),magnifierCtx=magnifierCanvas.getContext('2d');
  const defenderSheet=byId('defenderSheet');
  const defenderSheetToggle=byId('defenderSheetToggle');
  const mobileLayout=window.matchMedia('(max-width: 700px)');
  const placementFlowLayout=window.matchMedia('(max-width: 860px)');
  const mapFooter=byId('mapFooter');
  const syncCombatDockHeight=()=>document.documentElement.style.setProperty('--combat-dock-height',`${Math.ceil(mapFooter.getBoundingClientRect().height)}px`);
  if('ResizeObserver' in window)new ResizeObserver(syncCombatDockHeight).observe(mapFooter);else window.addEventListener('resize',syncCombatDockHeight);
  syncCombatDockHeight();
  function setDefenderSheetOpen(open) { defenderSheet.classList.toggle('open',Boolean(open));defenderSheetToggle.setAttribute('aria-expanded',String(Boolean(open))); }
  setDefenderSheetOpen(!mobileLayout.matches);
  syncPlacementConfirmHost();
  mobileLayout.addEventListener('change',event=>{setDefenderSheetOpen(!event.matches);syncPlacementConfirmHost();if(selectedTower)updateSelectedActionPlacement();});
  placementFlowLayout.addEventListener('change',syncPlacementConfirmHost);
  renderCombatReference({
    note:byId('combatRuleNote'), matrixBody:byId('combatMatrixBody'), profileBody:byId('enemyProfileBody'),
    rules:COMBAT_RULES, matrix:COMBAT_INTERACTION_MATRIX, profiles:enemyCombatProfiles, document
  });
  const RUN_KEY = 'pollen-guard.run.v2';
  const RUN_BACKUP_KEY = 'pollen-guard.run.backup.v1';
  let pauseRunHistoryPlayback=()=>{};
  const highContrastEnemyColors = { mite:'#d55e00',zip:'#f0e442',armored:'#0072b2',shield:'#56b4e9',splitter:'#009e73',flyer:'#cc79a7',crumb:'#e69f00',boss:'#332288',healer:'#a98b68',carrier:'#008b83',burrower:'#8a5b28' };
  const profileStorage = createProfileStorage(() => localStorage, {
    mapIds: Object.keys(maps), achievementIds: ACHIEVEMENT_DEFINITIONS.map(([id]) => id)
  });
  let profile = profileStorage.loadProfile();
  profile.research=normalizeResearchState(profile.research,earnedResearchPoints(profile));
  let researchLoadout=researchLoadoutIds(profile.research);
  profile.relics=normalizeRelicState(profile.relics,profile.completedMissions);
  let relicLoadout=relicLoadoutIds(profile.relics);
  const uiSettings = profileStorage.loadSettings();
  const autoStartController=createAutoStartController();
  autoStartController.setEnabled(uiSettings.autoStartWaves);
  let explicitAnimationPreference=false;try{const saved=JSON.parse(localStorage.getItem(UI_SETTINGS_STORAGE_KEY)||'null');explicitAnimationPreference=['full','reduced','off'].includes(saved?.animation);}catch{}
  if(!explicitAnimationPreference&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){uiSettings.animation='reduced';uiSettings.shake=false;}
  let selectedMap = 'meadow', gateRoute='default',gateSwitchesRemaining=0,terrainRulesVersion=1, challenge = 'classic', difficulty=DEFAULT_DIFFICULTY, challengeRules=[], challengeBoardId=null, importedBoardChallenge=null, challengeImportPreview=null, path = maps.meadow.path, pathLength = 0, routeGeometry = createEnemyRouteGeometry(maps.meadow,WAVE_SCHEDULE_VERSION);
  const terrainAt=point=>terrainRulesVersion>=1?terrainZoneAt(selectedMap,point):'ground';
  const initialResearchStart=researchStartingAdjustment(researchLoadout);
  let cash=220+initialResearchStart.cash, lives=Math.max(1,20+initialResearchStart.lives), popped=0, wave=0, bloomCharge=0, economyRulesVersion=1, waveScheduleVersion=WAVE_SCHEDULE_VERSION, towers=[], enemies=[], shots=[], particles=[];
  let endlessModifier=null,endlessChoiceWave=0;
  let guardianMode='none', guardian=null, guardianMoveActive=false, guardianMoveOrigin=null;
  let seedObjective=null;
  let seedObjectiveControls=null;
  let spellLoadout=normalizeSpellLoadout(uiSettings.spellLoadout||DEFAULT_SPELL_LOADOUT), rejuvenationField=null;
  const towerRecoilAt=new Map();
  const renderSnapshots=createRenderSnapshots();
  let selectedType='sprout', selectedTower=null, placementCandidate=null, abilityPreview=null, aimedSpellId=null, spellTargetStart=null, repeatBuild=true, towerFilter='all', tutorialStep=0, tutorialPractice=createTutorialPracticeState(), tutorialReturnToSavedRun=Boolean(uiSettings.tutorialReturnToSavedRun), spawnQueue=[], spawnClock=0, waveTimelineKey='', enemyGuideWaveKey='', enemyBriefingKey='';
  let previewHasFlyer=false;
  const aimedSpellControls=new Map();
  let runState=createRunState();
  let combatPerformance=createCombatPerformance();
  let speed=DEFAULT_GAME_SPEED, intermission=0, saveClock=0, pointer={x:-99,y:-99,inside:false}, soundOn=!!uiSettings.sound, keyBindings={...uiSettings.keyBindings}, pendingKeyBinding=null;
  const gameAudio=createGameAudio({
    AudioContextCtor:window.AudioContext||window.webkitAudioContext,
    getSettings:()=>({soundEnabled:soundOn,masterVolume:uiSettings.masterVolume,musicVolume:uiSettings.musicVolume,effectsVolume:uiSettings.effectsVolume})
  });
  let magnifierEnabled=false;
  const simulationClock=new FixedStepClock();
  let nextEntityId=1, storageErrorShown=false, futureSaveProtected=false;
  let runSeed=createRunSeed(), simulationTick=0, actionLog=[], actionLogComplete=true, actionLogLimitShown=false;
  const config = () => modes[challenge] || modes.classic;
  const runIsRunning=()=>runState.basePhase==='running'||(runState.basePhase==='user-paused'&&runState.resumePhase==='running');
  const runIsActivelyRunning=()=>runState.phase==='running';
  const runIsPaused=()=>runState.basePhase==='user-paused';
  const runIsOver=()=>runState.basePhase==='won'||runState.basePhase==='lost';
  function transitionRun(event) { runState=transitionRunState(runState,event); }
  const confirmationFlow=createConfirmationFlow({
    dialog:byId('confirmDialog'), title:byId('confirmTitle'), message:byId('confirmText'), accept:byId('confirmAccept'),
    document, fallbackFocus:canvas,
    onOpen:()=>{transitionRun({type:'DIALOG_OPEN'});updateHud();},
    onHudUpdate:()=>updateHud()
  });

  function loadJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  }
  function persistProfile() { profileStorage.saveProfile(profile); }
  function saveUiSettings() { profileStorage.saveSettings(uiSettings); }
  function applyUiSettings() {
    renderUiSettings({
      app:document.querySelector('.app'), root:document.documentElement, body:document.body, settings:uiSettings,
      controls:{
        animation:byId('animationSelect'), shake:byId('shakeToggle'), flashes:byId('flashToggle'),
        masterVolume:byId('masterVolume'), masterVolumeValue:byId('masterVolumeValue'),
        musicVolume:byId('musicVolume'), musicVolumeValue:byId('musicVolumeValue'),
        effectsVolume:byId('effectsVolume'), effectsVolumeValue:byId('effectsVolumeValue'),
        compact:byId('compactToggle'), palette:byId('paletteSelect'), textSize:byId('textSizeSelect'), autoStartWaves:byId('autoStartWaves'),
        alwaysShowAirRoute:byId('alwaysShowAirRoute')
      }
    });
  }
  function renderKeyboardBindings() { presentKeyboardBindings({root:byId('keyboardBindings'),guideHelp:byId('guideKeyHelp'),towersDef,keyBindings,document}); }
  function handleBindingKeydown(event) {
    if(!pendingKeyBinding)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.code==='Escape'){pendingKeyBinding=null;byId('keyboardBindingStatus').textContent='Shortcut change canceled.';renderKeyboardBindings();return;}
    const result=bindKey(keyBindings,pendingKeyBinding,event.code);
    if(!result.ok){byId('keyboardBindingStatus').textContent=`${result.reason} Press another key or Escape.`;return;}
    keyBindings=result.bindings;uiSettings.keyBindings=keyBindings;saveUiSettings();pendingKeyBinding=null;
    byId('keyboardBindingStatus').textContent='Shortcut saved.';renderKeyboardBindings();renderTowerOptions();
  }
  function requestConfirmation(title,message,action,acceptLabel='Continue') {
    confirmationFlow.request(title,message,action,acceptLabel);
  }
  function changeRulesOrTrail(label,apply) {
    if(tutorialPractice.active){setToast('Finish or end practice before changing the trail or rules.');return;}
    if(wave||towers.length||hasPendingSavedGarden()){
      requestConfirmation('Start a fresh garden?',`Changing ${label} resets your current wave and defenders. Continue?`,apply,'Start fresh');
      return;
    }
    apply();
  }
  function showResults(won,masteryResult,{profileSaved=true}={}) {
    renderResultsScreen({
      kicker:byId('resultsKicker'), title:byId('resultsTitle'), description:byId('resultsText'),
      wave:byId('resultWave'), popped:byId('resultPopped'), petals:byId('resultPetals'), record:byId('resultRecord'),
      debrief:byId('runDebrief')
    }, {
      won, wave, popped, petals:Math.floor(cash),
      record:maps[selectedMap]?.customMap?'Custom maps do not award campaign bests or challenge scores.':!profileSaved?'This result could not be saved on this device. Free browser storage and try again.':challengeBoardId?'Challenge result saved as a local personal best on this device. Challenge codes do not verify scores.':`Personal best: wave ${Math.max(0,...Object.values(profile.bestWave||{}))}`,
      report:buildRunDebrief(combatPerformance,{mapName:maps[selectedMap].name,challengeLabel:challengeDisplayLabel(),won})
    }, document);
    const mission=CAMPAIGN_MISSION_BY_ID[selectedMap];
    const masteryElement=byId('missionMasteryResult');
    masteryElement.hidden=!mission;
    masteryElement.textContent=mission?missionMasteryResultText(masteryResult,{difficulty,mission}):'';
    if(mission){
      const record=profile.missionRecords?.[mission.id];
      byId('resultsText').textContent+=` ${mission.name}: ${mission.objective} ${won?(record?.objectiveMet?'Objective met.':'Mission cleared; objective not met this run.'):'Mission incomplete.'}`;
    }
    if(seedObjective){
      const tally=seedObjectiveTally(seedObjective),objectiveMet=tally.safe>=2;
      const seedResult=won?(objectiveMet?'Seed objective met.':'Garden cleared; seed objective not met.'):(objectiveMet?'Seed condition met, but the garden was lost.':'Run ended before recovering enough seeds.');
      byId('resultsText').textContent+=` Seed Recovery: ${tally.safe}/${tally.total} seeds safe (${tally.recovered} recovered, ${tally.escaped} escaped). ${seedResult}`;
    }
    if(maps[selectedMap]?.customMap){
      const objective=maps[selectedMap].customObjective;
      byId('resultsText').textContent+=won
        ?` Custom objective met: ${lives} seeds remain (target ${objective.minLives}).`
        :` Custom objective missed: keep ${objective.minLives} seeds through wave 15; ${lives} remain.`;
    }
    byId('resultsDialog').showModal();transitionRun({type:'DIALOG_OPEN'});
  }
  function updateTutorial() {
    renderTutorialStep({
      title:byId('tutorialTitle'),description:byId('tutorialText'),progress:byId('tutorialProgress'),
      back:byId('tutorialBack'),next:byId('tutorialNext'),dots:byId('tutorialDots')
    },tutorialStep,document);
  }
  function finishTutorial() {
    tutorialPractice=finishTutorialPracticeState(tutorialPractice);uiSettings.tutorialSeen=true;uiSettings.tutorialInProgress=false;uiSettings.tutorialReturnToSavedRun=false;saveUiSettings();byId('tutorialDialog').close();clearTutorialCoach({coach:byId('tutorialCoach'),board:canvas.parentElement,document});
    if(tutorialReturnToSavedRun&&hasSavedRun())restoreRun();else resetRun();
    tutorialReturnToSavedRun=false;byId('defenderCard').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function beginTutorialPractice() {
    byId('tutorialDialog').close();tutorialPractice=beginTutorialPracticeState(tutorialPractice);
    uiSettings.tutorialInProgress=true;uiSettings.tutorialReturnToSavedRun=tutorialReturnToSavedRun;saveUiSettings();
    challenge='classic';difficulty=DEFAULT_DIFFICULTY;challengeRules=[];challengeBoardId=null;importedBoardChallenge=null;challengeImportPreview=null;selectedMap='meadow';byId('mapSelect').value=selectedMap;byId('modeSelect').value=challenge;byId('difficultySelect').value=difficulty;document.querySelectorAll('[data-challenge-rule]').forEach(input=>input.checked=false);path=maps.meadow.path;calcPath();updatePlayOptionsLabel();renderMapOptions();resetRun();
    if(mobileLayout.matches)setDefenderSheetOpen(true);
    updateTutorialCoach();
    byId('towerList').querySelector('[data-type="sprout"]')?.focus({preventScroll:true});
  }
  function updateTutorialCoach() {
    renderTutorialCoach({coach:byId('tutorialCoach'),text:byId('tutorialCoachText'),exit:byId('tutorialExitBtn'),board:canvas.parentElement,document,view:buildTutorialCoachView({active:tutorialPractice.active,task:tutorialPractice.task}),onEndPractice:finishTutorial});
  }
  function advanceTutorialPractice(action,details={}) {
    const result=advanceTutorialPracticeState(tutorialPractice,action,details);
    if(!result.advanced)return;
    tutorialPractice=result.state;
    if(result.completed){setToast('Meadow guide complete. Have fun defending the trail!');finishTutorial();return;}
    updateTutorialCoach();
  }
  function replayTutorial() {
    const liveRun=Boolean(wave||towers.length);
    if(liveRun&&!saveRun()){setToast('Practice cannot start because the current garden could not be saved.');return;}
    tutorialReturnToSavedRun=liveRun||hasSavedRun();
    uiSettings.tutorialReturnToSavedRun=tutorialReturnToSavedRun;saveUiSettings();
    tutorialStep=0;updateTutorial();byId('guideDialog').close();byId('tutorialDialog').showModal();transitionRun({type:'DIALOG_OPEN'});
  }
  function placementError(point) {
    if(!selectedType)return 'Choose a defender from the catalog first.';
    return validateTowerPlacement({challenge,challengeRules,cash,towers},selectedType,point,{path,width:canvas.width,height:canvas.height});
  }
  function syncPlacementConfirmHost() {
    const confirm=byId('placementConfirm'),destination=placementFlowLayout.matches?canvas.parentElement:byId('placementConfirmHost');
    movePlacementConfirmation({confirm,destination,activeElement:document.activeElement});
  }
  function updatePlacementHint(point=pointer) {
    syncPlacementConfirmHost();
    const error=selectedType&&point.inside?placementError(point):'';
    const def=selectedType?towersDef[selectedType]:null,terrain=point.inside?terrainAt(point):null;
    const stats=def?getEffectiveTowerStats({type:selectedType,level:1},{challenge,challengeRules,linked:false,terrain,researchLoadout,relicLoadout},def):null;
    const view=buildPlacementHintView({selectedType,selectedTower,placementCandidate,error,definition:def,stats,terrain,terrainText:terrain?terrainBonusForTower(terrain,selectedType):''});
    renderPlacementHint({hint:byId('placementHint'),confirm:byId('placementConfirm'),board:canvas.parentElement,confirmButton:byId('confirmPlacementBtn'),view});
  }
  function selectPlacedTower(tower) {
    selectedTower=tower;selectedType=null;placementCandidate=null;hideTowerSelectionChooser({chooser:byId('selectionChooser'),board:canvas.parentElement});renderTowerOptions();renderSelected();updateHud();updatePreview();revealSelectedTower();updatePlacementHint();draw();announceTowerSelection(tower);advanceTutorialPractice('select',{towerId:tower.id});
  }
  function showSelectionChooser(candidates) {
    showTowerSelectionChooser({chooser:byId('selectionChooser'),board:canvas.parentElement,candidates,towerDefinitions:towersDef,onSelect:selectPlacedTower,document});
  }
  function shakeBoard() {
    if(!uiSettings.shake||uiSettings.animation==='off')return;
    const board=document.querySelector('.board-card');board.classList.remove('shake');void board.offsetWidth;board.classList.add('shake');
  }
  function explainFreshGarden(message) {
    setToast(futureSaveProtected?'This garden is temporary. Your newer saved run is preserved.':message,futureSaveProtected?0:2300);
  }
  function saveRun() {
    if(tutorialPractice.active)return true;
    let existing=null;
    try { const raw=localStorage.getItem(RUN_KEY);existing=raw?JSON.parse(raw):null; } catch { existing=null; }
    if(isUnsupportedRunVersion(existing)){futureSaveProtected=true;setToast(`This run uses game version ${existing.version}; this version ${RUN_SAVE_VERSION} will not overwrite it.`);return false;}
    futureSaveProtected=false;
    const gateSetupChanged=gateRoute!==defaultGateRoute(maps[selectedMap])||gateSwitchesRemaining!==gateSwitchesForMap(maps[selectedMap]);
    if (runIsOver() || (!wave && !towers.length && guardianMode==='none'&&!gateSetupChanged)) { try{localStorage.removeItem(RUN_KEY);}catch{} byId('resumeBtn').disabled=hasSavedRun(); return false; }
    const run=createRunSnapshot();
    const result=writeRunWithBackup(localStorage,RUN_KEY,RUN_BACKUP_KEY,JSON.stringify(run),maps,modes);
    if(result.saved){byId('resumeBtn').disabled=false;storageErrorShown=false;return true;}
    if(result.reason==='future-primary'){futureSaveProtected=true;setToast(`This run uses a newer game version; this version ${RUN_SAVE_VERSION} will not overwrite it.`);return false;}
    byId('resumeBtn').disabled=!hasSavedRun();
    if(!storageErrorShown){setToast(runSaveFailureMessage(result));storageErrorShown=true;}
    return false;
  }
  function createRunSnapshot() {
    return createRunSaveSnapshot({version:RUN_SAVE_VERSION,economyRulesVersion,terrainRulesVersion,waveScheduleVersion,seedVersion:1,runSeed,simulationTick,actionLogVersion:ACTION_LOG_VERSION,actionLog,actionLogComplete,selectedMap,gateRoute,gateSwitchesRemaining,challenge,difficulty,challengeRules,challengeBoardId,endlessModifier,endlessChoiceWave,seedObjective,guardianMode,guardian,spellLoadout,rejuvenationField,researchLoadout,relicLoadout,cash,lives,popped,wave,bloomCharge,towers,enemies,shots,spawnQueue,spawnClock,combatPerformance,...runStateSaveFlags(runState),intermission,speed,gameTime,nextEntityId});
  }
  function loadRunHistory() {
    try { return normalizeRunHistory(JSON.parse(localStorage.getItem(RUN_HISTORY_STORAGE_KEY)||'null')); }
    catch { return normalizeRunHistory(null); }
  }
  function storeRunHistory(run, outcome) {
    try {
      const milestones=[...(profile.achievements||[]).map(id=>`achievement:${id}`),...(profile.completedMissions||[]).map(id=>`mission:${id}:complete`),...Object.entries(profile.missionMastery||{}).flatMap(([missionId,difficulties])=>Object.entries(difficulties||{}).flatMap(([difficulty,tiers])=>Object.entries(tiers||{}).filter(([,earned])=>earned===true).map(([tier])=>`mastery:${missionId}:${difficulty}:${tier}`)))];
      const next=recordCompletedRun(loadRunHistory(),run,{mapName:maps[selectedMap].name,outcome,leaks:combatPerformance.leaks.total,milestones});
      localStorage.setItem(RUN_HISTORY_STORAGE_KEY,JSON.stringify(next));return true;
    } catch { return false; }
  }
  function renderLocalRunHistory() {
    pauseRunHistoryPlayback();
    const historyUi=renderRunHistory(byId('runHistory'),loadRunHistory().entries,document,{
      onCompare:compareRunSummaries,
      onVerifyReplay(entry){
        const map=maps[entry.mapId];if(!map)return {verified:false,reason:'This map is not available in the current build.'};
        const activePath=pathForGateRoute(map,entry.gateRoute),geometry=createEnemyRouteGeometry({...map,path:activePath},entry.waveScheduleVersion);
        return verifyRecordedReplay(entry,{path:activePath,map,pathLength:geometry.pathLengthFor,positionOf:geometry.positionOf});
      },
      onCreatePlayback(entry){
        const map=maps[entry.mapId];if(!map)throw new Error('This map is not available in the current build.');
        const activePath=pathForGateRoute(map,entry.gateRoute),geometry=createEnemyRouteGeometry({...map,path:activePath},entry.waveScheduleVersion);
        return createReplayPlayback(entry.run,{path:activePath,map,pathLength:geometry.pathLengthFor,positionOf:geometry.positionOf});
      },
      onRenderPlaybackFrame(entry,state,canvas){
        const map=maps[entry.mapId];if(!map||!canvas?.getContext)return;
        const ctx=canvas.getContext('2d');if(!ctx)return;
        const route=pathForGateRoute(map,state?.gateRoute||entry.gateRoute),geometry=createEnemyRouteGeometry({...map,path:route},entry.waveScheduleVersion);
        ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=map.background||'#9bc780';ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.beginPath();route.forEach((point,index)=>index?ctx.lineTo(point[0],point[1]):ctx.moveTo(point[0],point[1]));ctx.strokeStyle=map.edge||'#d5b876';ctx.lineWidth=54;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
        ctx.beginPath();route.forEach((point,index)=>index?ctx.lineTo(point[0],point[1]):ctx.moveTo(point[0],point[1]));ctx.strokeStyle=map.trail||'#efd99e';ctx.lineWidth=42;ctx.stroke();
        for(const zone of map.buildZones||[]){ctx.fillStyle='rgba(42,83,49,.12)';ctx.fillRect(zone.x,zone.y,zone.width,zone.height);}
        for(const tower of state?.towers||[]){ctx.beginPath();ctx.arc(tower.x,tower.y,14,0,Math.PI*2);ctx.fillStyle=towersDef[tower.type]?.color||'#e9d58a';ctx.fill();ctx.strokeStyle='#203126';ctx.lineWidth=3;ctx.stroke();}
        for(const enemy of state?.enemies||[]){const point=geometry.positionOf(enemy);ctx.beginPath();ctx.arc(point.x,point.y,enemy.boss?15:enemy.radius||8,0,Math.PI*2);ctx.fillStyle=enemy.boss?'#774c9f':enemy.lane==='air'?'#36b8c8':enemy.type==='armored'?'#746e62':'#b66e48';ctx.fill();ctx.strokeStyle='#17241b';ctx.lineWidth=2;ctx.stroke();}
        for(const shot of state?.shots||[]){ctx.fillStyle='#fff2a0';ctx.fillRect(shot.x-3,shot.y-3,6,6);}
      }
    });
    pauseRunHistoryPlayback=historyUi?.pauseAll||(()=>{});
  }
  function renderPracticeRange() {
    const choices=towerTestRangeChoices();
    renderTowerTestRange(byId('towerTestRange'),document,{challenge,difficulty,challengeRules,researchLoadout,relicLoadout,
      towerTypes:choices.towers.map(id=>({id,label:towersDef[id].name})),enemyTypes:choices.enemies.map(id=>({id,label:ENEMY_INTEL[id]?.name||id})),
      onFindPlacements:types=>findTowerTestPlacements(types,selectedMap,path),
      onMeasure:scenario=>runTowerTestRange({...scenario,mapId:selectedMap,path})});
  }
  function restoreRun() {
    autoStartController.manualLaunch();
    let primaryRaw=null,backupRaw=null;
    try{primaryRaw=localStorage.getItem(RUN_KEY);backupRaw=localStorage.getItem(RUN_BACKUP_KEY);}catch{setToast('Saved run storage is unavailable. Your current garden was kept.');return;}
    const selection=selectRecoverableRun(primaryRaw,backupRaw,maps,modes),run=selection.run&&assignRunEntityIds(selection.run);
    if(!run){setToast(selection.source==='future'||selection.source==='future-backup'?'This run uses a newer game version. Your saved garden was kept.':'Saved run is invalid. Your current garden was kept.');return;}
    const restored=projectSavedRunToRuntime(run,{maps,towerDefinitions:towersDef,enemyCombatProfiles});
    selectedMap=restored.selectedMap;gateRoute=restored.gateRoute;gateSwitchesRemaining=restored.gateSwitchesRemaining; terrainRulesVersion=restored.terrainRulesVersion; economyRulesVersion=restored.economyRulesVersion??0; waveScheduleVersion=restored.waveScheduleVersion; challenge=restored.challenge; difficulty=restored.difficulty;challengeRules=restored.challengeRules;challengeBoardId=restored.challengeBoardId;endlessModifier=restored.endlessModifier;endlessChoiceWave=restored.endlessChoiceWave;importedBoardChallenge=challengeBoardId?boardChallengeForRun({id:challengeBoardId,mode:challenge,difficulty,rules:challengeRules,mapId:selectedMap,spellLoadout:restored.spellLoadout,guardianMode:restored.guardianMode,researchLoadout:restored.researchLoadout,relicLoadout:restored.relicLoadout}):null;seedObjective=restored.seedObjective;cash=restored.cash; lives=restored.lives; popped=restored.popped; wave=restored.wave;
    guardianMode=restored.guardianMode; guardian=restored.guardian;guardianMoveActive=false;guardianMoveOrigin=null;byId('guardianLoadout').value=guardianMode;
    spellLoadout=restored.spellLoadout;rejuvenationField=restored.rejuvenationField;syncSpellLoadoutChecks();
    combatPerformance=restored.combatPerformance; bloomCharge=restored.bloomCharge; towers=restored.towers;researchLoadout=[...restored.researchLoadout];relicLoadout=[...(restored.relicLoadout??[])];
    towers.forEach(tower=>registerCombatTower(combatPerformance,tower));
    enemies=restored.enemies; spawnQueue=restored.spawnQueue;
    selectedTower=null; gameTime=restored.gameTime; nextEntityId=restored.nextEntityId; shots=restored.shots;
    resetRenderSnapshots();
    spawnClock=restored.spawnClock; intermission=restored.intermission; speed=restored.speed;transitionRun({type:'RESTORE',saved:run});
    runSeed=restored.runSeed;simulationTick=restored.simulationTick;actionLog=restored.actionLog;actionLogComplete=restored.actionLogComplete;actionLogLimitShown=false;simulationClock.reset();
    path=maps[selectedMap].path; calcPath(); byId('mapSelect').value=selectedMap; byId('modeSelect').value=challenge;byId('difficultySelect').value=difficulty;document.querySelectorAll('[data-challenge-rule]').forEach(input=>input.checked=challengeRules.includes(input.dataset.challengeRule)); updatePlayOptionsLabel();
    if(uiSettings.autoStartWaves&&wave>0&&!runIsRunning()&&!runIsOver()&&challenge!=='endless')autoStartController.afterWaveClear(wave);
    setToast(selection.source==='backup'?'Recovered the previous autosave; the primary save was invalid.':'Run restored from this device.'); renderTowerOptions(); updateHud(); updatePreview(); renderSelected(); draw();
  }
  function hasSavedRun(){try{return Boolean(localStorage.getItem(RUN_KEY)||localStorage.getItem(RUN_BACKUP_KEY));}catch{return false;}}
  function setRunTransferStatus(message) { renderRunTransferStatus(byId('runTransferStatus'),message); }
  function storedRunSelection() {
    try{return selectRecoverableRun(localStorage.getItem(RUN_KEY),localStorage.getItem(RUN_BACKUP_KEY),maps,modes);}
    catch{return {run:null,source:'unavailable'};}
  }
  function hasPendingSavedGarden(){
    try {
      const primary=localStorage.getItem(RUN_KEY),backup=localStorage.getItem(RUN_BACKUP_KEY);
      if(!primary&&!backup)return false;
      const selection=selectRecoverableRun(primary,backup,maps,modes),run=selection.run;
      if(!run)return true; // Preserve malformed and future-version saves.
      return runHasGameplayProgress(run);
    } catch { return true; }
  }
  function exportRunFile() {
    const hasActiveRun=!runIsOver()&&(wave>0||towers.length>0);
    if(hasActiveRun&&!saveRun()){setRunTransferStatus('The current run could not be saved, so no export was created.');return;}
    const selection=storedRunSelection();
    if(!selection.run){setRunTransferStatus(selection.source==='future'||selection.source==='future-backup'?'This save belongs to a newer game version and cannot be exported here.':'There is no valid saved run to export.');return;}
    const blob=new Blob([serializeRunExport(selection.run)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`pollen-guard-${selection.run.selectedMap}-wave-${selection.run.wave}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
    setRunTransferStatus(`Exported wave ${selection.run.wave} on ${maps[selection.run.selectedMap].name}. Keep this file somewhere safe.`);
  }
  async function importRunFile(file) {
    if(!file)return;
    if(file.size>MAX_RUN_IMPORT_BYTES){setRunTransferStatus('That file is larger than the 5 MB import limit.');return;}
    let raw;
    try{raw=await file.text();}catch{setRunTransferStatus('The selected file could not be read.');return;}
    const parsed=parseRunExport(raw,maps,modes);
    if(!parsed.ok){
      setRunTransferStatus(runImportFailureMessage(parsed.reason));return;
    }
    if(!runIsOver()&&(wave>0||towers.length>0)&&!saveRun()){setRunTransferStatus('Your current garden could not be saved, so import was canceled.');return;}
    const imported=parsed.run;
    requestConfirmation('Import this garden?',`Load wave ${imported.wave} on ${maps[imported.selectedMap].name}? Your current valid save takes the recovery slot; later autosaves rotate that one-slot backup. Export first to keep both runs long-term.`,()=>{
      const result=writeRunWithBackup(localStorage,RUN_KEY,RUN_BACKUP_KEY,JSON.stringify(imported),maps,modes);
      if(!result.saved){
        setRunTransferStatus(runImportWriteFailureMessage(result));return;
      }
      futureSaveProtected=false;byId('resumeBtn').disabled=false;restoreRun();setRunTransferStatus(`Imported wave ${imported.wave} on ${maps[imported.selectedMap].name}. Your prior run is in the recovery slot until the next autosave.`);
    },'Import run');
  }
  function recordPlayerAction(type,payload={}) {
    if(actionLog.length>=MAX_RUN_ACTIONS){actionLogComplete=false;if(!actionLogLimitShown){setToast('Action history reached its storage limit; this run can continue, but a full replay will not be available.');actionLogLimitShown=true;}return false;}
    const next=appendTickAction(actionLog,simulationTick,type,payload);
    if(!next)throw new Error(`Invalid recorded player action: ${type}`);
    actionLog=next;return true;
  }
  function performPlayerAction(type,payload={}) {
    const state={selectedMap,gateRoute,gateSwitchesRemaining,terrainRulesVersion,economyRulesVersion,waveScheduleVersion,challenge,difficulty,challengeRules,endlessModifier,endlessChoiceWave,seedObjective,guardianMode,guardian,spellLoadout,rejuvenationField,cash,lives,popped,wave,bloomCharge,towers,enemies,shots,spawnQueue,spawnClock,combatPerformance,running:runIsActivelyRunning(),paused:runState.phase==='user-paused',gameOver:runIsOver(),intermission,gameTime,nextEntityId};
    const result=applyPlayerAction(state,{type,payload},{path,width:canvas.width,height:canvas.height,pathLength,positionOf:enemyPosition,waveLimit:config().limit,selectedMap,map:maps[selectedMap]});
    if(!result.ok)return result;
    ({cash,lives,popped,wave,bloomCharge,towers,enemies,shots,spawnQueue,spawnClock,intermission,gameTime,nextEntityId,guardian,rejuvenationField,gateRoute,gateSwitchesRemaining,endlessModifier,endlessChoiceWave,seedObjective}=state);
    if(type==='switchGate')calcPath();
    if(type==='startWave'&&state.running)transitionRun({type:'START_WAVE'});
    if(type==='placeTower')transitionRun({type:'BEGIN_PLANNING'});
    recordPlayerAction(type,payload);updateGatePanel();
    return result;
  }
  function beginGuardianMove() {
    if(guardianMode!=='guardian'||!guardian||guardian.downTimer>0||runIsOver())return;
    if(aimedSpellId)cancelAimedSpell();
    guardianMoveOrigin={selectedType};selectedType=null;guardianMoveActive=true;
    pointer={x:guardian.targetX,y:guardian.targetY,inside:true};renderTowerOptions();canvas.focus({preventScroll:true});updateGuardianControls();draw();
  }
  function endGuardianMove() {
    if(!guardianMoveActive)return;
    guardianMoveActive=false;selectedType=guardianMoveOrigin?.selectedType??null;guardianMoveOrigin=null;
    updateGuardianControls();renderTowerOptions();updatePlacementHint();draw();
  }
  function commitGuardianMove(point) {
    const result=performPlayerAction('moveGuardian',{x:Math.round(point.x*100)/100,y:Math.round(point.y*100)/100});
    if(!result.ok){setToast(result.reason);return false;}
    endGuardianMove();setToast('Guardian is moving to the new position.');saveRun();return true;
  }
  function useGuardianPulse() {
    const result=performPlayerAction('guardianPulse');if(!result.ok){setToast(result.reason);return;}
    setToast(`Pollen Pulse slowed ${result.affected.length} ground pest${result.affected.length===1?'':'s'}.`);playCue('snare');updateHud();saveRun();draw();
  }
  function clearCompatibleBackup(){clearRunBackupAfterReset(localStorage,RUN_KEY,RUN_BACKUP_KEY);}
  function calcPath() { const map=maps[selectedMap];if(!map.gateRoutes){gateRoute='default';gateSwitchesRemaining=0;}else if(!Object.hasOwn(map.gateRoutes,gateRoute)){gateRoute=defaultGateRoute(map);gateSwitchesRemaining=gateSwitchesForMap(map);}path=pathForGateRoute(map,gateRoute);pathLength=calculatePathLength(path);routeGeometry=createEnemyRouteGeometry({...map,path},waveScheduleVersion);updateGatePanel?.(); }
  function updateGatePanel(){
    const panel=byId('routeGatePanel'),options=byId('gateRouteOptions'),map=maps[selectedMap],routes=map?.gateRoutes;
    panel.hidden=!routes;options.replaceChildren();if(!routes)return;
    const ids=Object.keys(routes),summaries=ids.map(id=>[id,summarizeGateRoute(routes[id])]),maxLength=Math.max(...summaries.map(([,s])=>s.length));
    byId('gateSwitchesText').textContent=`${gateSwitchesRemaining} planning switch${gateSwitchesRemaining===1?'':'es'} left`;
    byId('gateRouteHelp').textContent=`Dashed previews show both trails. Longer routes keep pests in defender range longer; turns shift coverage. Switches are available only between waves, with no pests still on the board.`;
    const canSwitch=!runIsActivelyRunning()&&runState.phase!=='user-paused'&&!runIsOver()&&!enemies.length&&!spawnQueue.length&&gateSwitchesRemaining>0;
    for(const id of ids){
      const route=routes[id],summary=summaries.find(([key])=>key===id)[1],button=document.createElement('button'),small=document.createElement('small');
      button.type='button';button.className='route-gate-option';button.setAttribute('aria-pressed',String(gateRoute===id));button.disabled=!canSwitch;
      button.textContent=`${route.label}${gateRoute===id?' · selected':''}`;
      const relative=summary.length===maxLength?'Longest exposure':summary.length===Math.min(...summaries.map(([,s])=>s.length))?'Shortest exposure':'Alternate exposure';
      small.textContent=`${Math.round(summary.length)} map units · ${summary.turns} bends · ${relative}`;button.append(small);
      button.addEventListener('click',()=>{const result=performPlayerAction('switchGate',{routeId:id});if(!result.ok){setToast(result.reason);return;}setToast(`${route.label} selected · ${gateSwitchesRemaining} switches left.`);updateGatePanel();saveRun();draw();});
      options.append(button);
    }
  }
  function setToast(message,duration=2300) { const toast=byId('toast'); toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true');toast.textContent=message; clearTimeout(setToast.timer); setToast.timer=duration>0?setTimeout(()=>toast.textContent='',duration):null; }
  function announceKeyboardStatus(message) { clearTimeout(announceKeyboardStatus.timer);announceKeyboardStatus.timer=setTimeout(()=>{byId('keyboardAnnouncement').textContent=message;},350); }
  function announceTowerSelection(tower) { const def=towersDef[tower.type];announceKeyboardStatus(`Selected ${def.name}, level ${tower.level}, targeting ${tower.targetMode||'First'}. Use the inspector controls to upgrade, change targeting, or sell.`); }
  const playCue=(cue,variant)=>gameAudio.play(cue,variant);
  function unlock(id) { if(maps[selectedMap]?.customMap)return;if(!profile.achievements.includes(id)){profile.achievements.push(id);persistProfile();renderAchievements();setToast(`Milestone earned: ${ACHIEVEMENT_DEFINITIONS.find(a=>a[0]===id)?.[1]||id}`);playCue('achievement');} }
  function checkProgress() {
    if(challengeBoardId||maps[selectedMap]?.customMap)return;
    for(const event of buildRunProgressEvents(profile,{challenge,selectedMap,wave,popped,towerCount:towers.length})){
      if(event.type==='achievement'){unlock(event.id);continue;}
      if(event.type==='map'){
        if(!profile.unlockedMaps.includes(event.id))profile.unlockedMaps.push(event.id);
        persistProfile();
        setToast(`New trail unlocked: ${maps[event.id].name}`);
        continue;
      }
      if(event.type==='bestWave'){profile.bestWave[event.key]=event.value;persistProfile();}
    }
    renderMapOptions();
  }
  function renderAchievements() {
    renderProfileAchievements({document,root:byId('achievements'),count:byId('achievementCount'),recordInfo:byId('recordInfo'),definitions:ACHIEVEMENT_DEFINITIONS,profile});
  }
  function renderChallenges(now=new Date()) {
    const root=byId('challengeBoard'),active=document.activeElement;
    const restore= root.contains(active)
      ? active.matches('[data-challenge-code]')?{kind:'challenge',value:active.dataset.challengeCode}
        :active.matches('[data-copy-challenge-code]')?{kind:'copy',value:active.closest('.challenge-board-card')?.querySelector('input')?.value}
          :active.id==='challengeImportBtn'?{kind:'import-button'}:active.id==='challengeCodeImport'?{kind:'import-input',value:active.value}:null
      :null;
    renderChallengeBoard({document,root,bests:profile.challengeBests,now,imported:challengeImportPreview,activeId:challengeBoardId});
    if(!restore)return;
    const controls=restore.kind==='challenge'?[...root.querySelectorAll('[data-challenge-code]')]
      :restore.kind==='copy'?[...root.querySelectorAll('[data-copy-challenge-code]')]
        :restore.kind==='import-button'?[byId('challengeImportBtn')]:[byId('challengeCodeImport')];
    const target=restore.kind==='challenge'?controls.find(item=>item.dataset.challengeCode===restore.value)
      :restore.kind==='copy'?controls.find(item=>item.closest('.challenge-board-card')?.querySelector('input')?.value===restore.value):controls[0];
    if(target&&restore.kind==='import-input')target.value=restore.value;
    target?.focus({preventScroll:true});
  }
  function activateBoardChallenge(descriptor) {
    if(challengeBoardId===descriptor.id)return;
    changeRulesOrTrail('the challenge',()=>{
      challenge=descriptor.mode;difficulty=descriptor.difficulty;challengeRules=[...descriptor.rules];selectedMap=descriptor.mapId;spellLoadout=[...descriptor.spellLoadout];
      challengeBoardId=descriptor.id;importedBoardChallenge=descriptor;
      guardianMode='none';byId('guardianLoadout').value='none';byId('mapSelect').value=selectedMap;byId('modeSelect').value=challenge;byId('difficultySelect').value=difficulty;
      document.querySelectorAll('[data-challenge-rule]').forEach(input=>input.checked=challengeRules.includes(input.dataset.challengeRule));
      byId('modeSelect').value=challenge;updatePlayOptionsLabel();renderMapOptions();applyChallenge();
      renderChallenges();setToast(`${descriptor.cadence==='daily'?'Daily':'Weekly'} garden selected for ${descriptor.period} UTC. The challenge date stays with this run.`);
    });
  }
  const researchRulesEligible=()=>!tutorialPractice.active&&!challengeBoardId&&challenge==='classic'&&difficulty==='standard'&&challengeRules.length===0;
  const relicRulesEligible=researchRulesEligible;
  const researchCanRespec=()=>researchRulesEligible()&&!tutorialPractice.active&&!hasPendingSavedGarden()&&(runIsOver()||(!wave&&!towers.length&&!runIsActivelyRunning()));
  function renderResearch() {
    const root=byId('researchTree');if(!root)return;
    renderProfileResearchTree({document,root,profile,canRespec:researchCanRespec()});
    if(!researchRulesEligible()){
      const note=document.createElement('p');note.className='research-lock';
      note.textContent='Research effects are locked in non-Classic, non-Standard, or modified-rule challenges. Resume or explicitly restart any saved garden before changing research.';
      root.append(note);
    }
    renderRelics();
  }
  function renderRelics() {
    const root=byId('relicLoadout');if(!root)return;
    renderProfileRelicLoadout({document,root,profile,canRefit:relicRulesEligible()&&!hasPendingSavedGarden()&&(runIsOver()||(!wave&&!towers.length&&!runIsActivelyRunning()))});
    if(!relicRulesEligible()){
      const note=document.createElement('p');note.className='relic-lock';
      note.textContent='Relic effects are locked in non-Classic, non-Standard, or modified-rule challenges; benchmark runs start without relic effects.';
      root.append(note);
    }
  }
  function renderMapOptions() {
    renderProfileMapOptions({document,select:byId('mapSelect'),maps,unlockedMaps:profile.unlockedMaps,selectedMap,missions:CAMPAIGN_MISSIONS});
    for(const option of byId('mapSelect').options)if(maps[option.value]?.customMap)option.disabled=false;
    const customSelected=Boolean(maps[selectedMap]?.customMap);
    if(customSelected){challenge='classic';difficulty='standard';challengeRules=[];challengeBoardId=null;importedBoardChallenge=null;guardianMode='none';byId('modeSelect').value='classic';byId('difficultySelect').value='standard';byId('guardianLoadout').value='none';document.querySelectorAll('[data-challenge-rule]').forEach(control=>control.checked=false);}
    for(const option of byId('modeSelect').options)option.disabled=customSelected&&option.value!=='classic';
    byId('difficultySelect').disabled=customSelected;
    document.querySelectorAll('[data-challenge-rule]').forEach(control=>control.disabled=customSelected);
    byId('guardianLoadout').disabled=customSelected;
    renderCampaignMap();
  }
  function saveCustomEditorMap(map){
    const result=addCustomMapToCollection(savedCustomMaps,map);if(!result.ok)return result;
    try{localStorage.setItem(CUSTOM_MAP_STORAGE_KEY,JSON.stringify(result.collection));}catch{return {ok:false,reason:'This device could not save the custom map. Existing maps were preserved.'};}
    savedCustomMaps=result.collection;
    const authored=savedCustomMaps.maps.at(-1),runtime=customMapToRuntimeMap(authored),schedules=customMapWaveSchedules(authored);
    if(!runtime||!registerCustomWaveSchedules(runtime.id,schedules))return {ok:false,reason:'The validated map could not be registered for play.'};
    maps[runtime.id]=runtime;renderMapOptions();return {ok:true};
  }
  function testPlayCustomMap(mapId){if(!maps[mapId]?.customMap)return;byId('mapSelect').value=mapId;byId('mapSelect').dispatchEvent(new Event('change',{bubbles:true}));}
  function renderLocalMapEditor(){renderMapEditor(byId('mapEditor'),document,{existingMaps:savedCustomMaps.maps,onSave:saveCustomEditorMap,onTest:testPlayCustomMap});}
  function renderCampaignMap() {
    renderProfileCampaignMap({document,root:byId('campaignMapNodes'),missions:CAMPAIGN_MISSIONS,profile,selectedMap,difficulty});
    byId('campaignMapSummary').textContent=`Campaign map · ${profile.completedMissions.length} of ${CAMPAIGN_MISSIONS.length} cleared`;
  }
  function selectCampaignMission(mapId) {
    const mission=CAMPAIGN_MISSION_BY_ID[mapId];
    if(!mission||!profile.unlockedMaps.includes(mapId))return;
    byId('mapSelect').value=mapId;
    byId('mapSelect').dispatchEvent(new Event('change',{bubbles:true}));
  }
  function challengeDisplayLabel() { return challenge==='sudden'&&guardianMode==='ward'?'Sudden death · 3 seeds with Pollen Ward':config().label; }
  function syncSpellLoadoutChecks(){document.querySelectorAll('input[data-spell]').forEach(input=>{input.checked=spellLoadout.includes(input.dataset.spell);input.disabled=Boolean(challengeBoardId);const preview=buildSpellPreview(input.dataset.spell);input.parentElement.querySelector('[data-spell-preview]').textContent=`${preview.range} · ${preview.area} · ${preview.duration} · ${preview.cost}`;});byId('spellLoadoutCount').textContent=`${spellLoadout.length} of 3 selected${challengeBoardId?' · shared challenge kit':''}`;}
  function updatePlayOptionsLabel() {
    const suddenOption=byId('modeSelect').querySelector('option[value="sudden"]');
    suddenOption.textContent=guardianMode==='ward'?'Sudden death · 3 seeds with Pollen Ward':'Sudden death · 1 seed';
    byId('playOptionsLabel').textContent=`Battle setup · ${maps[selectedMap].name} · ${challengeDisplayLabel()} · ${DIFFICULTIES[difficulty].label}${challengeRules.length?` · ${challengeRules.map(rule=>CHALLENGE_RULES[rule].label).join(' + ')}`:''}${challengeBoardId?` · ${importedBoardChallenge?.cadence==='weekly'?'Weekly':'Daily'} ${importedBoardChallenge?.period||'challenge'} UTC`:''}`;
    byId('spellLoadoutConfig').querySelector('summary').textContent=`Equipped spells · ${spellLoadout.length}/3`;
  }
  function createSpellControls(){
    const dock=byId('abilityDock');
    for(const spellId of ['rootTrap','lineGust','rejuvenation']){
      const spell=SPELLS[spellId],preview=buildSpellPreview(spellId),card=document.createElement('section'),button=document.createElement('button'),small=document.createElement('small'),cancel=document.createElement('button');
      card.className='ability-card aimed-spell-card';card.hidden=true;button.type='button';button.dataset.spell=spellId;button.textContent=`${spell.name} · ${preview.cost}`;small.setAttribute('aria-live','polite');
      cancel.type='button';cancel.textContent='Cancel aim';cancel.hidden=true;cancel.className='spell-aim-cancel';
      small.textContent=`${preview.range} · ${preview.area} · ${preview.duration} · ${preview.cost}`;card.append(button,small,cancel);dock.append(card);button.addEventListener('click',()=>beginAimedSpell(spellId));cancel.addEventListener('click',cancelAimedSpell);aimedSpellControls.set(spellId,{card,button,small,cancel,preview});
    }
  }
  function refreshSpellControls(){
    for(const spellId of ['bloom','snare']){
      const button=byId(spellId==='bloom'?'bloomBtn':'snareBtn');button.closest('.ability-card').hidden=!spellLoadout.includes(spellId);
      const preview=buildSpellPreview(spellId),status=byId(spellId==='bloom'?'bloomStatus':'snareStatus');
      status.textContent=`${preview.range} · ${preview.area} · ${preview.duration} · ${preview.cost}`;
    }
    for(const [spellId,control] of aimedSpellControls){
      const eligibleEnemy=spellId==='rootTrap'?enemies.some(enemy=>canHitTarget({canHitAir:false},enemy)):enemies.some(enemy=>canHitTarget({canHitAir:true},enemy));
      const eligibleDefender=towers.some(tower=>!towersDef[tower.type].supportStructure);
      const equipped=spellLoadout.includes(spellId),hasTarget=spellId==='rejuvenation'?eligibleDefender:eligibleEnemy;
      const ready=runIsActivelyRunning()&&!runIsOver()&&cash>=SPELLS[spellId].cost&&hasTarget;
      control.card.hidden=!equipped;control.button.disabled=!ready;
      control.button.setAttribute('aria-pressed',String(aimedSpellId===spellId));control.cancel.hidden=aimedSpellId!==spellId;
      control.small.textContent=aimedSpellId===spellId?(spellId==='lineGust'&&spellTargetStart?'Choose the gust endpoint; Escape cancels.':'Aim on the battlefield; Escape cancels.'):
        !hasTarget?(spellId==='rejuvenation'?'Place an attacking defender before casting.':'Wait for a valid pest to reach the trail.'):
        `${control.preview.range} · ${control.preview.area} · ${control.preview.duration} · ${control.preview.cost}`;
    }
  }
  function renderTowerOptions() {
    byId('prospectiveLabel').textContent=selectedType?`Building · ${towersDef[selectedType].icon} ${towersDef[selectedType].name} · ${towersDef[selectedType].cost} petals`:'No build pick · choose a defender to place';
    renderTowerCatalog({document,root:byId('towerList'),towersDef,towerRoles,selectedType,filter:towerFilter,challenge,challengeRules,researchLoadout,relicLoadout,keyBindings,keyCodeLabel,getEffectiveTowerStats,towerArtSvg,cash,showAll:byId('towerList').dataset.showAll==='true'});
    document.querySelectorAll('.tower-option').forEach(button=>button.addEventListener('click',()=>{const shortfall=Math.max(0,towersDef[button.dataset.type].cost-cash);if(shortfall){setToast(`Need ${shortfall} more petals.`);return;}if(guardianMoveActive)endGuardianMove();if(aimedSpellId)cancelAimedSpell();selectedType=button.dataset.type;renderTowerOptions();renderSelected();updatePreview();updatePlacementHint();draw();canvas.focus({preventScroll:true});}));
    document.querySelectorAll('.catalog-more').forEach(button=>button.addEventListener('click',()=>{const root=byId('towerList');const expanded=button.getAttribute('aria-expanded')==='true';root.dataset.showAll=String(!expanded);if(expanded&&selectedType&&!['sprout','dew','puff'].includes(selectedType))selectedType=null;renderTowerOptions();byId('towerList').querySelector('.catalog-more')?.focus({preventScroll:true});}));
    document.querySelectorAll('.tower-filter').forEach(button=>{button.classList.toggle('active',button.dataset.filter===towerFilter);button.setAttribute('aria-pressed',String(button.dataset.filter===towerFilter));});
    byId('cancelPlacementBtn').style.display=selectedType?'block':'none';
    const chosen=selectedType&&towersDef[selectedType];
    const chosenStats=chosen&&getEffectiveTowerStats({type:selectedType,level:1},{challenge:chosen.supportStructure?'classic':challenge,challengeRules:chosen.supportStructure?[]:challengeRules,linked:false,researchLoadout,relicLoadout},chosen);
    const supportDetail=chosen?.supportStructure==='beacon'?`buffs up to 3 eligible attackers within ${Math.round(chosenStats.range)} map units with ${Math.round((1-chosenStats.buffMultiplier)*100)}% shorter attack interval, once each; 48-unit footprint.`:chosen?.supportStructure==='trap'?`slows the first ${Math.max(0,chosen.triggerLimit-(researchLoadout.includes('compost-lattice')?1:0))} unique ground pests to enter its ${Math.round(chosenStats.range)} map units ring for ${chosen.slowDuration}s, then expires; footprint ${chosen.footprint} units.`:chosen?.role;
    byId('towerDetail').textContent=chosen?`${chosen.name} · ${chosen.supportStructure?supportDetail:chosen.income?`+${chosenStats.income} petals/wave`:`${chosenStats.damage} damage/hit · ${(1/chosenStats.rate).toFixed(1)} attacks/s`} · ${chosen.range?`range ${Math.round(chosenStats.range)} map units · `:''}${chosen.supportStructure?'':`${chosen.role} · `}${chosen.cost} petals.`:'Choose a defender to preview its role and range.';
    updatePlacementHint();
  }
  function selectedUpgradeCost(tower) { return towerUpgradeQuote(tower,towersDef[tower.type]).cost; }
  function updateUpgradePreview() {
    const linked=isTowerLinkedToAnother(selectedTower,towers,towersLinked);
    const text=buildTowerUpgradePreview({tower:selectedTower,towers,challenge,challengeRules,linked,cash,terrain:terrainAt(selectedTower),researchLoadout,relicLoadout});
    if(upgradePreviewRenderGate.shouldRender(text))renderTowerUpgradePreview({document,text});
  }
  function updateTargetIndicator() {
    const linked=isTowerLinkedToAnother(selectedTower,towers,towersLinked);
    const text=buildTowerTargetStatus({tower:selectedTower,enemies,challenge,challengeRules,linked,enemyPosition,isRunning:runIsRunning(),terrain:terrainAt(selectedTower),researchLoadout,relicLoadout});
    if(targetStatusRenderGate.shouldRender(text))renderTowerTargetStatus({document,text});
  }
  function updateSelectedAbilityDock() {
    const view=buildTowerAbilityDockModel({tower:selectedTower,enemies,wave,gameTime,isRunning:runIsActivelyRunning(),gameOver:runIsOver(),abilityPreview,enemyPosition});
    if(abilityDockRenderGate.shouldRender(createRenderSignature(view)))renderTowerAbilityDock({document,view});
  }
  function renderSelected() {
    if(abilityPreview&&abilityPreview.towerId!==selectedTower?.id)abilityPreview=null;
    if(!selectedTower)abilityPreview=null;
    updateSelectedActionPlacement();
    const linked=isTowerLinkedToAnother(selectedTower,towers,towersLinked);
    const view=selectedTower?buildTowerInspectorModel({selectedTower,towers,challenge,challengeRules,linked,cash,wave,gameTime,terrain:terrainAt(selectedTower),researchLoadout,relicLoadout,tutorialActive:tutorialPractice.active,tutorialTask:tutorialPractice.task,tutorialTowerId:tutorialPractice.towerId,
      onChooseBranch:index=>{const result=performPlayerAction('chooseBranch',{towerId:selectedTower.id,branch:index});if(result.ok){renderSelected();saveRun();}}
    }):{empty:true};
    const signature=createInspectorDisplaySignature({towerId:selectedTower?.id??null,view});
    if(selectedInspectorRenderGate.shouldRender(signature))renderTowerInspector({document,canvasHost:canvas.parentElement,view});
    updateUpgradePreview();updateTargetIndicator();updateSelectedAbilityDock();
  }
  let rememberedSelectedActionFocus=null;
  document.addEventListener('focusin',event=>{
    const context=byId('selectedContext');
    rememberedSelectedActionFocus=context?.contains(event.target)?event.target:null;
  },true);
  document.addEventListener('pointerdown',event=>{
    const context=byId('selectedContext'),target=event.target instanceof Element?event.target.closest('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'):null;
    rememberedSelectedActionFocus=context?.contains(target)?target:null;
  },true);
  function updateSelectedActionPlacement() {
    const context=byId('selectedContext'),side=document.querySelector('.side'),mobile=mobileLayout.matches;
    const destination=mobile?canvas.parentElement:byId('selectedActionHost');
    if(context.parentElement!==destination){
      const focusedControl=context.contains(document.activeElement)?document.activeElement:
        document.activeElement===document.body&&context.contains(rememberedSelectedActionFocus)?rememberedSelectedActionFocus:null;
      if(mobile)destination.insertBefore(context,byId('battlefieldSummary'));
      else destination.append(context);
      focusedControl?.focus({preventScroll:true});
    }
    const selected=Boolean(selectedTower),toggle=byId('changeBuildPickBtn'),expanded=side.classList.contains('show-build');
    side.classList.toggle('has-selected-actions',selected);
    if(!selected){rememberedSelectedActionFocus=null;side.classList.remove('show-build');toggle.hidden=true;toggle.setAttribute('aria-expanded','false');byId('defenderCardTitle').textContent='Choose a defender';byId('defenderCardMode').textContent='BUILD PICK';return;}
    toggle.hidden=false;toggle.setAttribute('aria-expanded',String(expanded));toggle.textContent=expanded?'Hide build choices':'Choose another defender';
    byId('defenderCardTitle').textContent='Selected defender';byId('defenderCardMode').textContent='INSPECT';
  }
  function revealSelectedTower() {
    if(!selectedTower)return;
    if(mobileLayout.matches)setDefenderSheetOpen(true);
  }
  function updateHud() {
    updateTowerCatalogAffordability(byId('towerList'),cash);
    const running=runIsRunning(),gameOver=runIsOver(),paused=runIsPaused();
    const upgradeDisabled=selectedTower?selectedTower.level>=3||(selectedTower.level===1&&selectedTower.branchChoice==null)||cash<selectedUpgradeCost(selectedTower)||(tutorialPractice.active&&(tutorialPractice.task!==3||selectedTower.id!==tutorialPractice.towerId)):undefined;
    const view=buildHudView({
      cash,lives,popped,wave,lifeCapacity:config().lives+(guardianMode==='ward'?2:0),limit:config().limit,
      mapName:maps[selectedMap].name,challengeLabel:challengeDisplayLabel(),
      running,paused,gameOver,
      selectedTower:selectedTower?{name:towersDef[selectedTower.type].name,level:selectedTower.level,targetMode:selectedTower.targetMode}:null,
      roster:towers.map(tower=>({name:towersDef[tower.type].name,level:tower.level})),
      previousTowerKey:keyCodeLabel(keyBindings.previousTower),nextTowerKey:keyCodeLabel(keyBindings.nextTower),
      intermission,tutorialActive:tutorialPractice.active,tutorialTask:tutorialPractice.task,
      bloomCharge,hasEnemies:enemies.length>0,speed,
      resumeDisabled:!hasSavedRun(),upgradeDisabled
    });
    renderHud(document,view);
    renderTowerUpgradeAction({document,action:buildTowerUpgradeAction({tower:selectedTower,cash,tutorialActive:tutorialPractice.active,tutorialTask:tutorialPractice.task,tutorialTowerId:tutorialPractice.towerId})});
    if(!seedObjectiveControls){
      const legend=document.querySelector('#mapFooter .legend'),outbound=document.createElement('span'),returnPath=document.createElement('span'),status=document.createElement('span');
      outbound.textContent='→ seed cache';returnPath.textContent='← escape route';status.className='seed-objective-status';status.id='seedObjectiveStatus';status.setAttribute('aria-live','off');
      legend.append(outbound,returnPath);legend.after(status);seedObjectiveControls={outbound,returnPath,status};
    }
    for(const control of Object.values(seedObjectiveControls))control.hidden=!seedObjective;
    if(seedObjective){const tally=seedObjectiveTally(seedObjective);seedObjectiveControls.status.textContent=`Cache · ${tally.safe}/${tally.total} safe · ${tally.carried} carried · ${tally.dropped} dropped · ${tally.escaped} escaped`;}
    refreshSpellControls();
    updateGuardianControls();
    updateUpgradePreview();if(abilityPreview&&!towers.some(tower=>tower.id===abilityPreview.towerId)){abilityPreview=null;renderSelected();}else updateSelectedAbilityDock();
    updateWaveTimeline();
    updateEnemyGuide();updateEnemyBriefing();updateEndlessChoices();
    autoStartController.setEligible(autoStartEligible());
    updateAutoStartControls();
  }
  function autoStartEligible(){
    return isAutoStartEligible({
      enabled:uiSettings.autoStartWaves,challenge,wave,running:runIsRunning(),paused:runIsPaused(),gameOver:runIsOver(),
      tutorialPractice:tutorialPractice.active,hidden:document.hidden,runStateStopsClock:runStateStopsClock(runState),
      dialogOpen:Boolean(document.querySelector('dialog[open]')),
      mandatoryChoice:endlessChoiceRequired({challenge,wave,endlessChoiceWave})
    });
  }
  function updateAutoStartControls(){
    const state=autoStartController.snapshot(),status=byId('autoStartStatus'),hold=byId('holdNextWaveBtn'),toggle=byId('autoStartToggleBtn');
    const view=buildAutoStartControlView({enabled:state.enabled,challenge});
    toggle.textContent=view.label;
    toggle.setAttribute('aria-pressed',String(view.pressed));
    toggle.setAttribute('aria-label',view.ariaLabel);
    toggle.title=view.title;
    toggle.classList.toggle('active',view.active);
    hold.hidden=!state.pending;
    status.hidden=!state.enabled||challenge==='endless'||(!state.pending&&!state.held);
    if(state.pending){
      const seconds=Math.max(1,Math.ceil(state.remainingMs/1000));
      status.textContent=state.eligible?`Auto-starting wave ${wave+1} in ${seconds} seconds.`:'Auto-start paused; resuming gives a fresh 5-second countdown.';
    }else if(state.held)status.textContent='Auto-start held for this wave. Start it when you are ready.';
    else status.textContent='';
  }
  function updateEndlessChoices(){
    const required=endlessChoiceRequired({challenge,wave,endlessChoiceWave});
    const visible=challenge==='endless'&&!runIsRunning()&&!runIsOver()&&endlessChoiceDue(wave);
    const panel=byId('endlessChoices');
    renderEndlessChoices(panel,{visible,selected:visible&&!required?endlessModifier:null,document,focusFallback:runIsRunning()?byId('pauseBtn'):byId('startBtn'),onChoose:modifierId=>{
      const result=performPlayerAction('chooseEndlessModifier',{modifierId});
      if(!result.ok){setToast(result.reason);return;}
      setToast(`${ENDLESS_CHOICES[modifierId].label} selected for the next five waves.`);saveRun();updateHud();updatePreview();
    }});
    if(visible&&required&&mobileLayout.matches&&panel.dataset.promptWave!==String(wave)){
      panel.dataset.promptWave=String(wave);setDefenderSheetOpen(true);
      requestAnimationFrame(()=>{const side=defenderSheet.querySelector('.side');if(side)side.scrollTop+=panel.getBoundingClientRect().top-side.getBoundingClientRect().top-8;});
    }
  }
  function updateGuardianControls() {
    const card=byId('guardianAbilityControl');if(!card)return;
    card.hidden=guardianMode!=='guardian';
    const move=byId('guardianMoveBtn'),pulse=byId('guardianPulseBtn'),status=byId('guardianStatus');
    const moveDisabled=!guardian||runIsOver(),pulseDisabled=!guardian||!runIsActivelyRunning()||guardian.downTimer>0||guardian.pulseCooldown>0;
    if(move.disabled!==moveDisabled)move.disabled=moveDisabled;
    const pressed=String(guardianMoveActive);if(move.getAttribute('aria-pressed')!==pressed)move.setAttribute('aria-pressed',pressed);
    const moveText=guardianMoveActive?'Click grass · Enter confirms · Esc cancels':'Move guardian';if(move.textContent!==moveText)move.textContent=moveText;
    if(pulse.disabled!==pulseDisabled)pulse.disabled=pulseDisabled;
    const pulseText=guardian?.downTimer>0?'🌼 Guardian recovering':guardian?.pulseCooldown>0?`🌼 Pollen Pulse · ${guardian.pulseCooldown.toFixed(1)}s`:'🌼 Pollen Pulse';if(pulse.textContent!==pulseText)pulse.textContent=pulseText;
    const statusText=guardianMoveActive?'Choose open grass away from the trail. Arrow keys move the cursor; Enter confirms.':guardian?.downTimer>0?`Knocked down · recovers in ${guardian.downTimer.toFixed(1)}s.`:guardian?.pulseCooldown>0?`Pollen Pulse ready in ${guardian.pulseCooldown.toFixed(1)}s. Ground pests can knock the guardian down.`:'Move over safe grass. Pollen Pulse slows nearby ground pests during a wave.';
    if(status.textContent!==statusText)status.textContent=statusText;
  }
  function updateWaveTimeline() {
    const timeline=byId('waveTimeline');if(!timeline)return;
    const sunflowerIncome=towers.filter(tower=>tower.type==='sunflower').reduce((sum,tower)=>sum+getEffectiveTowerStats(tower,{terrain:terrainAt(tower),researchLoadout,relicLoadout},towersDef.sunflower).income,0);
    const key=[runState.basePhase,runState.phase,selectedMap,waveScheduleVersion,challenge,difficulty,challengeRules.join(','),endlessModifier,wave,spawnQueue.length,enemies.length,Math.ceil(intermission),sunflowerIncome].join(':');if(key===waveTimelineKey)return;waveTimelineKey=key;
    const view=buildWaveTimelineView({
      bossName:waveScheduleVersion>=2?BOSS_VARIANTS[selectedMap]?.name:undefined,
      terminal:runIsOver(),won:runState.basePhase==='won',running:runIsRunning(),paused:runIsPaused(),wave,
      scheduled:spawnQueue.length,enemyCount:enemies.length,sunflowerIncome,intermission,challenge,difficulty,challengeRules,endlessModifier,economyRulesVersion,limit:config().limit,schedules:waveSchedulesForMap(selectedMap,waveScheduleVersion)
    });
    renderWaveTimeline(timeline,view);
  }
  function guideWaveNumber() { return Math.max(1,runIsRunning()||runIsOver()?wave:wave+1); }
  function filterEnemyGuide() {
    filterEnemyGuideCards({list:byId('enemyGuideList'),empty:byId('enemyGuideEmpty'),query:byId('enemyGuideSearch').value});
  }
  function updateEnemyGuide() {
    const guideWave=guideWaveNumber(),key=`${guideWave}:${waveScheduleVersion}`;if(key===enemyGuideWaveKey)return;enemyGuideWaveKey=key;
    renderEnemyGuide({document,list:byId('enemyGuideList'),empty:byId('enemyGuideEmpty'),query:byId('enemyGuideSearch').value,intel:ENEMY_INTEL.map(info=>enemyIntelFor(info.type,waveScheduleVersion)).filter(Boolean),createEnemy,profiles:enemyCombatProfiles,leakCost:enemy=>bossLeakCost(enemy,waveScheduleVersion),guideWave});
  }
  function updateEnemyBriefing() {
    const targetWave=wave+1,intro=!runIsRunning()&&!runIsOver()?firstEncounterIntel(targetWave,waveSchedulesForMap(selectedMap,waveScheduleVersion),waveScheduleVersion):null,key=intro?`${targetWave}:${intro.type}:${waveScheduleVersion}`:'';
    if(key===enemyBriefingKey)return;enemyBriefingKey=key;
    const view=buildEnemyBriefingView({targetWave,intro,running:runIsRunning(),terminal:runIsOver()});
    renderEnemyBriefing({panel:byId('enemyBriefing'),text:byId('enemyBriefingText'),guideButton:byId('enemyBriefingGuide'),counterButton:byId('enemyBriefingCounter'),view,document});
  }
  function openEnemyGuide(type) {
    const guide=byId('enemyGuide'),search=byId('enemyGuideSearch');guide.open=true;
    if(mobileLayout.matches)setDefenderSheetOpen(true);
    search.value='';filterEnemyGuide();const card=byId('enemyGuideList').querySelector(`[data-enemy-guide="${type}"]`);
    card?.scrollIntoView({block:'nearest'});card?.focus({preventScroll:true});
  }
  function openEnemyResistance(type) {
    const matrix=$('.combat-matrix'),row=byId('enemyProfileBody').querySelector(`[data-enemy="${type}"]`);
    matrix.open=true;row?.scrollIntoView({block:'center'});row?.focus({preventScroll:true});
  }
  byId('enemyGuideSearch').addEventListener('input',filterEnemyGuide);
  byId('enemyGuideList').addEventListener('click',event=>{const type=event.target.closest('[data-enemy-resistance]')?.dataset.enemyResistance;if(type)openEnemyResistance(type);});
  byId('enemyBriefingGuide').addEventListener('click',()=>openEnemyGuide(byId('enemyBriefing').dataset.enemyIntel));
  byId('enemyBriefingCounter').addEventListener('click',event=>{
    const type=event.currentTarget.dataset.towerType;
    if(type)selectTowerShortcut(type);
  });
  byId('waveTimeline').addEventListener('click',event=>{const type=event.target.closest('[data-enemy-intel]')?.dataset.enemyIntel;if(type)openEnemyGuide(type);});
  byId('enemyPreview').addEventListener('click',event=>{const type=event.target.closest('[data-enemy-intel]')?.dataset.enemyIntel;if(type)openEnemyGuide(type);});
  function updatePreview() {
    const view=buildWavePreviewView({
      terminal:runIsOver(),won:runState.basePhase==='won',running:runIsRunning(),wave,
      bossName:waveScheduleVersion>=2?BOSS_VARIANTS[selectedMap]?.name:undefined,mapLabel:CAMPAIGN_MISSION_BY_ID[selectedMap]?`CHAPTER ${CAMPAIGN_MISSION_BY_ID[selectedMap].chapter} · ${CAMPAIGN_MISSION_BY_ID[selectedMap].name.toUpperCase()}`:maps[selectedMap].name.toUpperCase(),
      schedules:waveSchedulesForMap(selectedMap,waveScheduleVersion),difficulty,challengeRules,endless:challenge==='endless',endlessModifier
    });
    previewHasFlyer=Boolean(view.preview?.counts?.flyer);
    view.airRouteEnabled=shouldShowAirRoute({alwaysShow:uiSettings.alwaysShowAirRoute,previewHasFlyer,selectedAntiAir:Boolean(towersDef[selectedTower?.type||selectedType]?.antiAir),activeFlyer:enemies.some(enemy=>enemy.flying),supported:waveScheduleVersion>=WAVE_SCHEDULE_VERSION});
    renderWavePreview({document,enemyPreview:byId('enemyPreview'),waveThreat:byId('waveThreat'),mapNote:byId('mapNote'),waveInfo:byId('waveInfo'),view});
    if(maps[selectedMap]?.customMap){const objective=maps[selectedMap].customObjective;byId('mapNote').textContent=`${maps[selectedMap].name} · ${objective.brief} Minimum ${objective.minLives} seeds must remain.${view.airRouteEnabled?' Ground and sky routes share this custom trail.':''}`;}
    if(!wave&&!runIsRunning())byId('waveInfo').textContent+=guardianMode==='guardian'?' Optional kit: move your Meadow Guardian across safe grass; Pollen Pulse slows nearby ground pests, but a pest can knock it down briefly.':guardianMode==='ward'?' Optional kit: Pollen Ward grants two extra starting seeds instead of an active unit.':' Optional kit: choose a Meadow Guardian or Pollen Ward in mission settings; neither is required.';
    updateWaveTimeline();
  }
  function startWave() {
    if(tutorialPractice.active&&tutorialPractice.task!==4){setToast('Complete the practice steps before starting the wave.');return;}
    if(runIsRunning()||runIsPaused()||runIsOver()||wave>=config().limit)return;
    autoStartController.manualLaunch();
    const result=performPlayerAction('startWave',{wave:wave+1,early:false,bonus:0});if(!result.ok){setToast(result.reason);return;}
    if(tutorialPractice.active)cash=Math.max(cash,45);
    updatePreview();updateHud();playCue('waveStart');saveRun();if(tutorialPractice.active)advanceTutorialPractice('startWave');
  }
  function burst(x,y,color,count=7,impactKind=null,splashRadius=0) {
    if(!shouldEmitParticles(uiSettings))return;
    const created=[];
    if(impactKind||splashRadius)created.push({x,y,vx:0,vy:0,life:.2,maxLife:.2,r:5,color,impactKind:impactKind||'legacy',splashRadius});
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=18+Math.random()*68;created.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.4,maxLife:.7,r:2+Math.random()*2,color});}
    particles=appendCosmeticParticles(particles,created);
  }
  function enemyPosition(enemy){return routeGeometry.positionOf(enemy);}
  function resetRenderSnapshots(){renderSnapshots.reset(enemies,shots);}
  function showEnemyDefeat(enemy) {
    const p=enemyPosition(enemy);burst(p.x,p.y,enemy.color,enemy.boss?20:7,enemy.boss?'bossKill':'kill');playCue(enemy.boss?'bossDefeat':'enemyDefeat');
    if(popped>0)unlock('first-pop');if(enemy.boss)unlock('boss');
    renderSelected();
  }
  function towersLinked(a,b) { return towersAreLinked(a,b,towersDef,towers,researchLoadout,relicLoadout); }
  function runTowerAbility() {
    if(!selectedTower)return;const tower=selectedTower;
    const result=performPlayerAction('towerAbility',{towerId:tower.id});if(!result.ok){setToast(result.reason);return;}abilityPreview=null;
    setToast(result.effect.message);result.defeated.forEach(showEnemyDefeat);
    playCue('ability',tower.type);renderSelected();updateHud();saveRun();draw();
  }
  function previewTowerAbility() {
    if(!selectedTower||byId('towerAbilityBtn').disabled)return;
    if(towersDef[selectedTower.type].income){runTowerAbility();return;}
    abilityPreview=buildTowerAbilityPreview({tower:selectedTower,enemies,enemyPosition});
    renderSelected();draw();
  }
  function cancelTowerAbilityPreview() { if(!abilityPreview)return;abilityPreview=null;renderSelected();draw(); }
  function beginAimedSpell(spellId){
    if(aimedSpellId===spellId){cancelAimedSpell();return;}
    if(!spellLoadout.includes(spellId)){setToast('That spell is not equipped.');return;}
    if(!runIsActivelyRunning()||runIsOver()){setToast('Aim spells during an active wave.');return;}
    if(cash<SPELLS[spellId].cost){setToast(`You need ${SPELLS[spellId].cost} petals for ${SPELLS[spellId].name}.`);return;}
    if(spellId!=='rejuvenation'&&!enemies.length){setToast('Wait for pests to reach the trail before aiming this spell.');return;}
    if(guardianMoveActive)endGuardianMove();
    aimedSpellId=spellId;spellTargetStart=null;selectedType=null;placementCandidate=null;selectedTower=null;
    byId('spellLoadoutStatus').textContent=buildSpellPreview(spellId).targeting;refreshSpellControls();renderTowerOptions();renderSelected();updatePreview();canvas.focus({preventScroll:true});draw();
  }
  function cancelAimedSpell(){
    if(!aimedSpellId)return;aimedSpellId=null;spellTargetStart=null;byId('spellLoadoutStatus').textContent='Aim canceled. No petals spent.';refreshSpellControls();updatePlacementHint();updatePreview();draw();
  }
  function commitAimedSpell(point){
    if(!aimedSpellId)return;
    if(aimedSpellId==='lineGust'&&!spellTargetStart){spellTargetStart={x:point.x,y:point.y};byId('spellLoadoutStatus').textContent='Choose the gust endpoint. The preview shows its 34-unit lane; Escape cancels.';draw();return;}
    const start=aimedSpellId==='lineGust'?spellTargetStart:point;
    const payload={spellId:aimedSpellId,x:start.x,y:start.y,endX:point.x,endY:point.y};
    if(aimedSpellId!=='lineGust'){payload.endX=point.x;payload.endY=point.y;}
    const spellId=aimedSpellId,result=performPlayerAction('aimedSpell',payload);
    if(!result.ok){setToast(result.reason);return;}
    aimedSpellId=null;spellTargetStart=null;
    byId('spellLoadoutStatus').textContent=`${SPELLS[spellId].name} cast successfully.`;
    if(spellId==='rejuvenation')setToast(`Rejuvenation Field: ${result.affected.length} defender${result.affected.length===1?'':'s'} boosted for 6 seconds.`);
    else{result.affected.forEach(enemy=>{const position=enemyPosition(enemy);burst(position.x,position.y,spellId==='rootTrap'?'#8bc46d':'#83d6dc',spellId==='rootTrap'?5:4);});setToast(`${SPELLS[spellId].name} caught ${result.affected.length} pest${result.affected.length===1?'':'s'}.`);}
    playCue('ability');saveRun();updateHud();draw();
  }
  function useBloom() {
    if(tutorialPractice.active){setToast('Use Ivy Snare for this practice step.');return;}
    if(bloomCharge<100)return;const result=performPlayerAction('bloom');if(!result.ok)return;const effect=result.effect;effect.defeated.forEach(showEnemyDefeat);
    for(const enemy of effect.affected){const p=enemyPosition(enemy);burst(p.x,p.y,'#f3d875',5);}
    unlock('bloom');setToast('Bloom pulse! The whole trail is slowed.');playCue('bloom');updateHud();saveRun();
  }
  function useSnare() {
    if(tutorialPractice.active&&tutorialPractice.task!==5){setToast('Start the practice wave before using Ivy Snare.');return;}
    if(cash<45||!enemies.length)return;const result=performPlayerAction('snare');if(!result.ok)return;setToast('Ivy Snare stopped the wave!');playCue('snare');updateHud();saveRun();if(tutorialPractice.active)advanceTutorialPractice('snare');
  }
  function placeTower(point) {
    if(tutorialPractice.active&&(tutorialPractice.task!==0||selectedType!=='sprout')){setToast('Practice placement uses one Sprout Slinger first.');return;}
    const def=towersDef[selectedType];if(!def)return;const error=placementError(point);if(error){setToast(error);updatePlacementHint({...point,inside:true});return;}
    const result=performPlayerAction('placeTower',{towerId:nextEntityId,towerType:selectedType,x:point.x,y:point.y});if(!result.ok){setToast(result.reason);return;}
    selectedTower=result.tower;placementCandidate=null;byId('placementConfirm').hidden=true;if(!repeatBuild)selectedType=null;if(mobileLayout.matches)setDefenderSheetOpen(false);canvas.focus({preventScroll:true});playCue('place');if(towers.length>=8)unlock('builder');setToast(`${def.name} planted.`);advanceTutorialPractice('place',{towerId:result.tower.id,type:result.tower.type});updateHud();renderTowerOptions();renderSelected();updatePreview();updatePlacementHint();if(!mobileLayout.matches)revealSelectedTower();saveRun();draw();
  }
  function drawMapMagnifier() {
    if(!magnifierEnabled||pointer.x<0||pointer.y<0){magnifierCanvas.hidden=true;return;}
    magnifierCanvas.hidden=false;const rect=canvas.getBoundingClientRect(),sourceWidth=Math.min(canvas.width,magnifierCanvas.clientWidth*canvas.width/rect.width/2),sourceHeight=Math.min(canvas.height,magnifierCanvas.clientHeight*canvas.height/rect.height/2);
    const sx=Math.max(0,Math.min(canvas.width-sourceWidth,pointer.x-sourceWidth/2)),sy=Math.max(0,Math.min(canvas.height-sourceHeight,pointer.y-sourceHeight/2));
    magnifierCtx.clearRect(0,0,magnifierCanvas.width,magnifierCanvas.height);magnifierCtx.drawImage(canvas,sx,sy,sourceWidth,sourceHeight,0,0,magnifierCanvas.width,magnifierCanvas.height);
    magnifierCtx.strokeStyle='#f4ffd9';magnifierCtx.lineWidth=2;magnifierCtx.beginPath();magnifierCtx.moveTo(magnifierCanvas.width/2-9,magnifierCanvas.height/2);magnifierCtx.lineTo(magnifierCanvas.width/2+9,magnifierCanvas.height/2);magnifierCtx.moveTo(magnifierCanvas.width/2,magnifierCanvas.height/2-9);magnifierCtx.lineTo(magnifierCanvas.width/2,magnifierCanvas.height/2+9);magnifierCtx.stroke();
  }
  bindCanvasPointerInput(canvas,{
    move(point){pointer=point;pointer.inside=true;if(selectedType){updatePlacementHint(pointer);draw();}else if(guardianMoveActive||aimedSpellId)draw();else if(magnifierEnabled)drawMapMagnifier();},
    leave(){pointer.inside=false;updatePlacementHint(pointer);draw();},
    cancelGesture(){setToast('Drag canceled. No defender was placed.');},
    press(point,event){
      if(runIsOver())return;
      if(guardianMoveActive){pointer={...point,inside:true};commitGuardianMove(point);return;}
      if(aimedSpellId){pointer={...point,inside:true};commitAimedSpell(point);return;}
      if(shouldPrioritizeBuildPick({hasBuildPick:Boolean(selectedType),point,placementError})){
        hideTowerSelectionChooser({chooser:byId('selectionChooser'),board:canvas.parentElement});
        if(event?.pointerType==='touch'){placementCandidate=point;pointer={...point,inside:true};updatePlacementHint(pointer);draw();}
        else placeTower(point);
        return;
      }
      const hits=findTowersAtPoint(towers,point,worldRadiusForCssPixels(22,canvas));
      if(hits.length>1){showSelectionChooser(hits);return;}
      if(hits.length===1){selectPlacedTower(hits[0]);return;}
      hideTowerSelectionChooser({chooser:byId('selectionChooser'),board:canvas.parentElement});
      if(selectedType){if(event?.pointerType==='touch'){placementCandidate=point;pointer={...point,inside:true};updatePlacementHint(pointer);draw();}else placeTower(point);}
      else{selectedTower=null;renderSelected();updateHud();updatePreview();updatePlacementHint();draw();}
    }
  });
  function drawSpellOverlay(){
    if(!rejuvenationField?.duration&&!aimedSpellId)return;
    ctx.save();ctx.lineWidth=2;ctx.setLineDash([7,5]);
    if(rejuvenationField?.duration>0){ctx.strokeStyle='#b9ef72';ctx.fillStyle='#9be06d22';ctx.beginPath();ctx.arc(rejuvenationField.x,rejuvenationField.y,78,0,Math.PI*2);ctx.fill();ctx.stroke();}
    if(aimedSpellId){
      const preview=SPELLS[aimedSpellId];ctx.strokeStyle=aimedSpellId==='rootTrap'?'#9bd477':aimedSpellId==='lineGust'?'#83d6dc':'#c4ef82';ctx.fillStyle=aimedSpellId==='rootTrap'?'#9bd47722':aimedSpellId==='lineGust'?'#83d6dc22':'#c4ef8222';
      if(aimedSpellId==='lineGust'&&spellTargetStart){const dx=pointer.x-spellTargetStart.x,dy=pointer.y-spellTargetStart.y,length=Math.hypot(dx,dy),scale=length>preview.length?preview.length/length:1;ctx.strokeStyle=length>preview.length?'#ff8e7a':'#83d6dc';ctx.lineWidth=preview.width;ctx.beginPath();ctx.moveTo(spellTargetStart.x,spellTargetStart.y);ctx.lineTo(spellTargetStart.x+dx*scale,spellTargetStart.y+dy*scale);ctx.stroke();ctx.lineWidth=2;}
      else if(aimedSpellId!=='lineGust'){ctx.beginPath();ctx.arc(pointer.x,pointer.y,preview.radius,0,Math.PI*2);ctx.fill();ctx.stroke();}
    }
    ctx.restore();
  }
  function draw(renderAlpha=1) {
    renderBossWarnings(byId('bossWarnings'),enemies);
    for(const [id,launch] of towerRecoilAt)if(gameTime-launch.time>.1)towerRecoilAt.delete(id);
    const liveAbilityPreview=abilityPreview&&selectedTower?.id===abilityPreview.towerId?{...abilityPreview,targetIds:towerAbilityTargets(selectedTower,enemies,towersDef[selectedTower.type],enemyPosition).map(enemy=>enemy.id)}:null;
    const targetId=getSelectedTargetId();
    drawBattlefield(ctx,{
      width:canvas.width,height:canvas.height,displayScale:canvasDisplayScale,map:maps[selectedMap],path,pathLength,
      gateRoutePreviews:!runIsActivelyRunning()&&!enemies.length&&!spawnQueue.length&&maps[selectedMap].gateRoutes?Object.entries(maps[selectedMap].gateRoutes).map(([id,route])=>({id,label:route.label,path:route.path})):null,selectedGateRoute:gateRoute,
      airPath:waveScheduleVersion>=WAVE_SCHEDULE_VERSION?maps[selectedMap].airPath:null,
      showAirRoute:shouldShowAirRoute({alwaysShow:uiSettings.alwaysShowAirRoute,previewHasFlyer,selectedAntiAir:Boolean(towersDef[selectedTower?.type||selectedType]?.antiAir),activeFlyer:enemies.some(enemy=>enemy.flying),supported:waveScheduleVersion>=WAVE_SCHEDULE_VERSION}),
      towers,selectedTower,towersDef,towersLinked,
      selectedTowerRange(tower){const def=towersDef[tower.type];if(def.supportStructure)return getEffectiveTowerStats(tower,{researchLoadout,relicLoadout},def).range; if(!def.range)return null;const linked=towers.some(other=>other!==tower&&towersLinked(tower,other));return getEffectiveTowerStats(tower,{challenge,challengeRules,linked,terrain:terrainAt(tower),researchLoadout,relicLoadout},def).range;},
      placementPreviewRange(type,point){return getEffectiveTowerStats({type,level:1},{challenge,challengeRules,linked:false,terrain:terrainAt(point),researchLoadout,relicLoadout},towersDef[type]).range;},abilityPreview:liveAbilityPreview,
      enemies,enemyPosition:enemy=>renderSnapshots.enemyPosition(enemy,routeGeometry.pathFor,renderAlpha),shots,shotPosition:shot=>renderSnapshots.shotPosition(shot,renderAlpha),
      shotAngle(shot,alpha){const from=renderSnapshots.shotPosition(shot,alpha),target=shot.target;if(!target)return 0;const point=renderSnapshots.enemyPosition(target,routeGeometry.pathFor,alpha);return Math.atan2(point.y-(target.flying?target.radius*.85:0)-from.y,point.x-from.x);},particles,selectedType,pointer,
      placementError,palette:uiSettings.palette,highContrastEnemyColors,selectedTargetId:targetId,
      visualTime:uiSettings.animation==='full'?gameTime:0,enemyHitFlash:enemy=>renderSnapshots.hitFlash(enemy.id),
      recoilForTower:id=>shotRecoil(uiSettings.animation,gameTime,towerRecoilAt.get(id)?.time),
      guardian,guardianMoveActive,guardianCursor:pointer,seedObjective,
      recoilAngleForTower:id=>towerRecoilAt.get(id)?.angle
    },renderAlpha,staticMapCache);drawSpellOverlay();drawMapMagnifier();
  }
  function getSelectedTargetId() {
    if(!selectedTower)return null;
    const def=towersDef[selectedTower.type];if(def.income||def.supportStructure)return null;
    const linked=towers.some(other=>other!==selectedTower&&towersLinked(selectedTower,other));
    const range=getEffectiveTowerStats(selectedTower,{challenge,challengeRules,linked,researchLoadout,relicLoadout},def).range;
    const eligible=enemies.filter(enemy=>Math.hypot(selectedTower.x-enemyPosition(enemy).x,selectedTower.y-enemyPosition(enemy).y)<=range&&canHitTarget({canHitAir:def.antiAir},enemy));
    return chooseTargetForTower(selectedTower,eligible,enemyPosition)?.id??null;
  }
  function applyChallenge() {
    const hadRun=Boolean(wave||towers.length||guardian||hasSavedRun());
    gateRoute=defaultGateRoute(maps[selectedMap]);gateSwitchesRemaining=gateSwitchesForMap(maps[selectedMap]);path=pathForGateRoute(maps[selectedMap],gateRoute);
    const kit=createMissionKitState({challenge,guardianMode,path,width:canvas.width,height:canvas.height,modeDefinitions:modes}),preset=difficultyFor(difficulty,challenge);researchLoadout=researchRulesEligible()?researchLoadoutIds(profile.research):[];relicLoadout=relicRulesEligible()?relicLoadoutIds(profile.relics):[];const researchStart=researchStartingAdjustment(researchLoadout);terrainRulesVersion=1;economyRulesVersion=1;lives=Math.max(1,kit.lives+preset.livesDelta+researchStart.lives);guardian=kit.guardian;seedObjective=challengeRules.includes(SEED_RECOVERY_RULE)?createSeedObjective():null;spellLoadout=challengeBoardId?[...CHALLENGE_SPELL_LOADOUT]:normalizeSpellLoadout(uiSettings.spellLoadout);rejuvenationField=null;cash=Math.max(0,config().cash+preset.cashDelta+researchStart.cash);towers=[];enemies=[];shots=[];particles=[];spawnQueue=[];spawnClock=0;wave=0;popped=0;bloomCharge=0;endlessModifier=null;endlessChoiceWave=0;nextEntityId=1;guardianMoveActive=false;guardianMoveOrigin=null;waveScheduleVersion=WAVE_SCHEDULE_VERSION;calcPath();combatPerformance=createCombatPerformance();transitionRun({type:'RESET'});intermission=0;updateGatePanel();gameTime=0;simulationTick=0;actionLog=[];actionLogComplete=true;actionLogLimitShown=false;runSeed=createRunSeed();selectedTower=null;selectedType='sprout';simulationClock.reset();resetRenderSnapshots();syncSpellLoadoutChecks();updatePlayOptionsLabel();renderTowerOptions();renderSelected();updateHud();updatePreview();saveRun();draw();
    if(hadRun)clearCompatibleBackup();
  }
  function finishRun(won) {
    if(tutorialPractice.active){resetRun();setToast('Practice restarted with fresh resources.');return;}
    const customMap=maps[selectedMap]?.customMap===true;
    if(won&&customMap)won=lives>=maps[selectedMap].customObjective.minLives;
    transitionRun({type:won?'WIN':'LOSE'});if(aimedSpellId)cancelAimedSpell();updateGatePanel();
    let profileSaved=true;
    const persistCompletion=()=>{try{persistProfile();return true;}catch{return false;}};
    if(customMap){profileSaved=true;}
    else if(challengeBoardId){profile.challengeBests=recordChallengeBest(profile.challengeBests,challengeBoardId,{won,wave,popped,lives});profileSaved=persistCompletion();renderChallenges();}
    else {const record=buildBestWaveRecord(profile,{challenge,selectedMap,wave});profile.bestWave[record.key]=record.value;profileSaved=persistCompletion();}
    const mission=CAMPAIGN_MISSION_BY_ID[selectedMap];let masteryResult=null;
    if(mission&&won&&!challengeBoardId){
      const progress=buildMissionCompletion(profile,mission.id,{won,lives,leaks:combatPerformance.leaks.total});
      if(progress){profile={...profile,...progress};profile.research=normalizeResearchState(profile.research,earnedResearchPoints(profile));profile.relics=normalizeRelicState(profile.relics,profile.completedMissions);profileSaved=persistCompletion()&&profileSaved;renderMapOptions();renderResearch();}
    }
    if(mission&&!challengeBoardId){
      masteryResult=buildMissionMasteryProgress(profile,{missionId:mission.id,difficulty,challenge,challengeRules,guardianMode,won,lives,leaks:combatPerformance.leaks.total,towerCount:towers.length});
      if(masteryResult.changed){profile={...profile,missionMastery:masteryResult.mastery};profile.research=normalizeResearchState(profile.research,earnedResearchPoints(profile));profileSaved=persistCompletion()&&profileSaved;renderCampaignMap();renderResearch();}
    }
    byId('waveInfo').textContent=customMap?(won?`Custom objective met: ${lives} seeds remain (target ${maps[selectedMap].customObjective.minLives}).`:`Custom objective missed: keep ${maps[selectedMap].customObjective.minLives} seeds through wave 15; ${lives} remain.`):won?'All waves cleared! This garden is thriving.':'The seed pod was overrun. Try another layout or challenge rule.';
    if(won&&!challengeBoardId&&!customMap)unlock('guardian');else if(!won)shakeBoard();
    const historySaved=storeRunHistory(createRunSnapshot(),won?'won':'lost');
    if(!isUnsupportedRunVersion(loadJson(RUN_KEY,null))){try{localStorage.removeItem(RUN_KEY);}catch{}clearCompatibleBackup();}
    updateHud();renderAchievements();setToast(customMap?'Custom-map play does not award campaign progression or challenge scores.':profileSaved?(won?'Meadow saved!':combatPerformance.leaks.total?`Run ended after ${combatPerformance.leaks.total} leak${combatPerformance.leaks.total===1?'':'s'}; your best wave has been saved.`:'Run ended. Your best wave has been saved.'):'Run completed, but local progress could not be saved. Free browser storage and try again.');if(!historySaved)byId('runHistory').textContent='Run history could not be saved on this device; existing records are unchanged.';playCue(won?'victory':'defeat');showResults(won,masteryResult,{profileSaved});
  }
  let gameTime=0;
  const gameLoop=createGameLoop({
    requestFrame:callback=>requestAnimationFrame(callback),
    clock:simulationClock,
    getFrameOptions:()=>({paused:runStateStopsClock(runState)||document.hidden,speed}),
    simulateStep:dt=>{renderSnapshots.beginStep();simulate(dt);renderSnapshots.capture(enemies,shots);renderSnapshots.updateHitFlashes(enemies,dt);},
    render:alpha=>{renderSelected();draw(alpha);}
  });
  function simulate(dt) {
    gameTime+=dt;simulationTick++;
    if(!runIsRunning()&&!runIsOver()&&intermission>0){intermission=Math.max(0,intermission-dt);updateHud();}
    if(runIsRunning()&&!runIsOver()){
      const state={running:runIsRunning(),gameOver:runIsOver(),spawnQueue,spawnClock,wave,cash,lives,popped,bloomCharge,towers,enemies,shots,nextEntityId,challenge,difficulty,challengeRules,selectedMap,terrainRulesVersion,economyRulesVersion,waveScheduleVersion,intermission,performance:combatPerformance,rejuvenationField,seedObjective,researchLoadout,relicLoadout};
      const visuals={defeated:[],leaked:[],statusTicks:[],impacts:[]};
      const result=stepCombat(state,dt,{pathLength:routeGeometry.pathLengthFor,positionOf:enemyPosition,
        onDefeat:enemy=>visuals.defeated.push(enemy),onLeak:enemy=>visuals.leaked.push(enemy),
        onStatusTick:(enemy,ticks)=>visuals.statusTicks.push([enemy,ticks]),
        onShot:shot=>{if(shot.sourceTowerId!=null&&!shot.splitProjectile){const target=shot.target,point=target?enemyPosition(target):null;towerRecoilAt.set(shot.sourceTowerId,{time:gameTime,angle:point?Math.atan2(point.y-(target.flying?target.radius*.85:0)-shot.y,point.x-shot.x):0});}playCue('attackLaunch',shot.sourceTowerType);},
        onImpact:(shot,position)=>{visuals.impacts.push([shot,position]);playCue('attackImpact',shot.sourceTowerType);}});
      ({spawnQueue,spawnClock,cash,lives,popped,bloomCharge,towers,enemies,shots,nextEntityId,intermission,rejuvenationField,seedObjective}=state);
      visuals.defeated.forEach(showEnemyDefeat);
      const leakAlert=visuals.leaked.length?`${visuals.leaked.length} leak${visuals.leaked.length===1?'':'s'} · ${visuals.leaked.map(enemy=>enemy.type==='flyer'?'Sky gnat':enemy.type==='boss'?enemy.bossName||'Bramble boss':enemy.type==='zip'?'Zip mite':'enemy').join(', ')} reached the goal · ${lives} seed${lives===1?'':'s'} remain.`:'';
      visuals.leaked.forEach(enemy=>{const p=enemyPosition(enemy);burst(p.x,p.y,'#fff0ad',8);});
      visuals.statusTicks.forEach(([enemy,ticks])=>{if(ticks.some(tick=>tick.channel==='heat')){const p=enemyPosition(enemy);burst(p.x,p.y,'#ff9b4d',1);}});
      visuals.impacts.forEach(([shot,position])=>burst(position.x,position.y,shot.color,shot.splash?8:3,shot.splitProjectile?'split':shot.sourceTowerType,shot.splash||0));
      if(result.lost)finishRun(false);
      if(result.waveClear){transitionRun({type:'WAVE_CLEAR'});if(aimedSpellId)cancelAimedSpell();updateGatePanel();const {bonus,income}=result.waveClear;checkProgress();byId('waveInfo').textContent=`Wave ${wave} cleared. ${bonus} petals harvested${income?` (${income} from Sunflowers)`:''}.`;setToast('Wave reward harvested!');playCue('waveClear');if(challenge!=='endless'&&wave>=config().limit)finishRun(true);if(!runIsOver()){saveRun();if(challenge!=='endless')autoStartController.afterWaveClear(wave);}else autoStartController.manualLaunch();updatePreview();}
      if(leakAlert)setToast(leakAlert);
      updateHud();
    }
    else if(!runIsOver())advanceDroppedSeeds(seedObjective,dt);
    if(guardianMode==='guardian'&&!runIsOver()){advanceMeadowGuardian(guardian,dt,{path,width:canvas.width,height:canvas.height,enemies,enemyPosition});if(guardian.downTimer>0||guardian.pulseCooldown>0)updateGuardianControls();}
    particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.95;p.vy*=.95;});
    saveClock+=dt;if(saveClock>=1){saveClock=0;if(wave||towers.length||guardianMode!=='none')saveRun();}
  }
  function resetRun() {
    autoStartController.manualLaunch();
    aimedSpellId=null;spellTargetStart=null;byId('spellLoadoutStatus').textContent='';
    const hadRun=Boolean(wave||towers.length||guardianMode!=='none'||hasSavedRun());
    gateRoute=defaultGateRoute(maps[selectedMap]);gateSwitchesRemaining=gateSwitchesForMap(maps[selectedMap]);path=pathForGateRoute(maps[selectedMap],gateRoute);
    const kit=createMissionKitState({challenge,guardianMode,path,width:canvas.width,height:canvas.height,modeDefinitions:modes}),preset=difficultyFor(difficulty,challenge);researchLoadout=researchRulesEligible()?researchLoadoutIds(profile.research):[];relicLoadout=relicRulesEligible()?relicLoadoutIds(profile.relics):[];const researchStart=researchStartingAdjustment(researchLoadout);terrainRulesVersion=1;economyRulesVersion=1;cash=tutorialPractice.active?1200:Math.max(0,config().cash+preset.cashDelta+researchStart.cash);lives=tutorialPractice.active?99:Math.max(1,kit.lives+preset.livesDelta+researchStart.lives);popped=0;wave=0;bloomCharge=0;endlessModifier=null;endlessChoiceWave=0;guardian=kit.guardian;seedObjective=challengeRules.includes(SEED_RECOVERY_RULE)?createSeedObjective():null;spellLoadout=challengeBoardId?[...CHALLENGE_SPELL_LOADOUT]:normalizeSpellLoadout(uiSettings.spellLoadout);rejuvenationField=null;guardianMoveActive=false;guardianMoveOrigin=null;waveScheduleVersion=WAVE_SCHEDULE_VERSION;calcPath();towers=[];enemies=[];shots=[];particles=[];spawnQueue=[];spawnClock=0;nextEntityId=1;combatPerformance=createCombatPerformance();
    transitionRun({type:'RESET'});intermission=0;updateGatePanel();selectedTower=null;selectedType='sprout';speed=DEFAULT_GAME_SPEED;gameTime=0;simulationTick=0;actionLog=[];actionLogComplete=true;actionLogLimitShown=false;runSeed=createRunSeed();simulationClock.reset();resetRenderSnapshots();
    if(tutorialPractice.active)tutorialPractice=resetTutorialPracticeState(tutorialPractice);
    syncSpellLoadoutChecks();updatePlayOptionsLabel();renderTowerOptions();renderSelected();updateHud();updatePreview();draw();
    if(byId('guideDialog').open){transitionRun({type:'DIALOG_OPEN'});updateHud();}
    if(!tutorialPractice.active){saveRun();if(hadRun)clearCompatibleBackup();}else updateTutorialCoach();
  }

  byId('startBtn').onclick=()=>startWave();
  byId('autoStartToggleBtn').onclick=()=>{
    uiSettings.autoStartWaves=!uiSettings.autoStartWaves;
    saveUiSettings();applyUiSettings();autoStartController.setEnabled(uiSettings.autoStartWaves);
    if(uiSettings.autoStartWaves&&wave>0&&!runIsRunning()&&!runIsOver()&&challenge!=='endless')autoStartController.afterWaveClear(wave);
    updateAutoStartControls();
  };
  byId('holdNextWaveBtn').onclick=()=>{if(autoStartController.hold()){setToast('Auto-start held for this wave.');updateAutoStartControls();byId('startBtn').focus({preventScroll:true});}};
  byId('magnifierToggle').onclick=event=>{magnifierEnabled=!magnifierEnabled;event.currentTarget.setAttribute('aria-pressed',String(magnifierEnabled));drawMapMagnifier();};
  byId('pauseBtn').onclick=()=>{transitionRun({type:'TOGGLE_USER_PAUSE'});updateHud();updateGatePanel();saveRun();};
  byId('speedBtn').onclick=()=>{speed=toggleGameSpeed(speed);updateHud();};
  defenderSheetToggle.onclick=()=>setDefenderSheetOpen(!defenderSheet.classList.contains('open'));
  byId('guideOpenBtn').onclick=()=>{renderChallenges();renderResearch();renderLocalRunHistory();renderPracticeRange();renderLocalMapEditor();byId('guideDialog').showModal();transitionRun({type:'DIALOG_OPEN'});updateHud();};
  byId('challengeBoard').addEventListener('click',async event=>{
    const copy=event.target.closest('[data-copy-challenge-code]');
    if(copy){const input=copy.closest('.challenge-board-card')?.querySelector('input');if(!input)return;input.select();input.setSelectionRange(0,input.value.length);try{await navigator.clipboard.writeText(input.value);byId('challengeImportStatus').textContent='Challenge code copied. It contains rules only, not a score.';}catch{byId('challengeImportStatus').textContent='Challenge code selected. Copy it with your device’s copy command.';}return;}
    const play=event.target.closest('[data-challenge-code]');if(play){const result=importChallengeCode(play.dataset.challengeCode);if(result.ok)activateBoardChallenge(result.challenge);else setToast(result.reason);return;}
    if(event.target.closest('#challengeImportBtn')){const input=byId('challengeCodeImport'),result=importChallengeCode(input.value.trim());if(!result.ok){input.setAttribute('aria-invalid','true');byId('challengeImportStatus').textContent=result.reason;return;}input.removeAttribute('aria-invalid');challengeImportPreview=result.challenge;renderChallenges();byId('challengeImportStatus').textContent=`Challenge code checked for ${result.challenge.period} UTC. It does not verify results.`;}
  });
  byId('challengeBoard').addEventListener('input',event=>{if(event.target.id!=='challengeCodeImport')return;event.target.removeAttribute('aria-invalid');byId('challengeImportStatus').textContent='';});
  byId('researchTree').addEventListener('click',event=>{
    if(!researchCanRespec()){setToast('Research can only be refit between missions in a standard Classic garden.');return;}
    let next;
    const respecButton=event.target.closest('[data-research-respec]');
    let focusSelector='[data-research-respec]';
    if(respecButton)next=clearResearchLoadout(profile.research,earnedResearchPoints(profile));
    else {
      const button=event.target.closest('[data-research-node]');if(!button)return;
      const nodeId=button.dataset.researchNode,unlocked=profile.research.unlocked.includes(nodeId);
      const result=unlocked?selectResearchNode(profile.research,nodeId,earnedResearchPoints(profile)):purchaseResearchNode(profile.research,nodeId,earnedResearchPoints(profile));
      if(!result.ok){setToast(result.reason);return;}next=result.state;focusSelector=`[data-research-node="${nodeId}"]`;
    }
    profile={...profile,research:normalizeResearchState(next,earnedResearchPoints(profile))};researchLoadout=researchRulesEligible()?researchLoadoutIds(profile.research):[];persistProfile();
    if(runIsOver()||(!wave&&!towers.length&&!hasPendingSavedGarden()))resetRun();renderResearch();
    const requestedFocus=byId('researchTree').querySelector(focusSelector);
    (requestedFocus&&!requestedFocus.disabled?requestedFocus:byId('researchTree').querySelector('[data-research-node]:not(:disabled)')||byId('guideCloseBtn')).focus({preventScroll:true});
    setToast('Research loadout saved. These sidegrades apply to the next fresh garden.');
  });
  byId('relicLoadout').addEventListener('click',event=>{
    if(!relicRulesEligible()||hasPendingSavedGarden()&& !runIsOver()||!runIsOver()&&(wave||towers.length||runIsActivelyRunning())){setToast('Relics can only be refit between missions. Resume or explicitly restart this garden first.');return;}
    const button=event.target.closest('[data-relic]');if(!button)return;
    const relicId=button.dataset.relic;
    const result=profile.relics.loadout.includes(relicId)
      ?unequipRelic(profile.relics,relicId,profile.completedMissions)
      :equipRelic(profile.relics,relicId,profile.completedMissions);
    if(!result.ok){setToast(result.reason);return;}
    profile={...profile,relics:normalizeRelicState(result.state,profile.completedMissions)};relicLoadout=relicRulesEligible()?relicLoadoutIds(profile.relics):[];persistProfile();
    if(runIsOver()||(!wave&&!towers.length&&!hasPendingSavedGarden()))resetRun();renderRelics();
    const replacement=byId('relicLoadout').querySelector(`[data-relic="${relicId}"]`);(replacement&&!replacement.disabled?replacement:byId('relicLoadout').querySelector('[data-relic]:not(:disabled)')||byId('guideCloseBtn')).focus({preventScroll:true});
    setToast('Relic loadout saved for the next fresh garden.');
  });
  byId('guideCloseBtn').onclick=()=>byId('guideDialog').close();
  byId('guideDialog').addEventListener('close',()=>pauseRunHistoryPlayback());
  byId('upgradeBtn').onclick=()=>{
    if(tutorialPractice.active&&tutorialPractice.task!==3){setToast('Follow the practice steps before upgrading.');return;}
    if(!selectedTower||selectedTower.level>=3)return;const t=selectedTower,def=towersDef[t.type];
    if(t.level===1&&t.branchChoice==null){setToast('Choose one branch first.');return;}
    const quote=towerUpgradeQuote(t,def),branch=quote.branch,cost=quote.cost,level=t.level+1;
    if(cash<cost){setToast(`Need ${cost-cash} more petals.`);return;}
    const purchase=()=>{
      const remaining=Math.floor(cash-cost);
      const result=performPlayerAction('upgradeTower',{towerId:t.id,level,branch});if(!result.ok){setToast(result.reason);return;}
      setToast(level===2?`${def.name}: ${def.branches[branch][0]} · −${cost} petals · ${remaining} left.`:`${def.name} reached level ${level} · −${cost} petals · ${remaining} left.`);playCue('upgrade');advanceTutorialPractice('upgrade',{towerId:t.id});renderSelected();updateHud();saveRun();draw();
    };
    if(requiresUpgradeBranchConfirmation(t)){
      const {investedAfter,refundAfter}=quote;
      requestConfirmation(`Commit ${def.branches[branch][0]}?`,`This choice locks the ${def.branches[branch][0]} branch. Spend ${cost} petals on ${def.name}? Funds after: ${Math.floor(cash-cost)} · total investment: ${investedAfter} · sell return: ${refundAfter}.`,purchase,`Upgrade · ${cost} ✿`);
      return;
    }
    purchase();
  };
  byId('targetModeSelect').onchange=event=>{if(!selectedTower)return;if(tutorialPractice.active&&(tutorialPractice.task!==2||selectedTower.id!==tutorialPractice.towerId)){event.target.value=selectedTower.targetMode||'First';return;}const previousTargetMode=selectedTower.targetMode||'First',mode=event.target.value;if(tutorialPractice.active&&mode===previousTargetMode){setToast('Choose a different target priority to complete this step.');return;}const result=performPlayerAction('setTarget',{towerId:selectedTower.id,mode});if(!result.ok){event.target.value=previousTargetMode;setToast(result.reason);return;}advanceTutorialPractice('target',{towerId:selectedTower.id,targetMode:mode,previousTargetMode});renderSelected();saveRun();};
  byId('towerAbilityBtn').onclick=previewTowerAbility;byId('towerAbilityConfirm').onclick=runTowerAbility;byId('towerAbilityCancel').onclick=cancelTowerAbilityPreview;byId('bloomBtn').onclick=useBloom;byId('snareBtn').onclick=useSnare;
  byId('guardianMoveBtn').onclick=()=>guardianMoveActive?endGuardianMove():beginGuardianMove();byId('guardianPulseBtn').onclick=useGuardianPulse;
  byId('guardianMoveBtn').onclick=()=>guardianMoveActive?endGuardianMove():beginGuardianMove();byId('guardianPulseBtn').onclick=useGuardianPulse;
  byId('sellBtn').onclick=()=>{if(!selectedTower)return;const tower=selectedTower,refund=saleRefund(tower.invested,towersDef[tower.type].cost);requestConfirmation('Sell this defender?',`Sell ${towersDef[tower.type].name}? Investment: ${tower.invested} petals · refund: ${refund} petals.`,()=>{const result=performPlayerAction('sellTower',{towerId:tower.id,refund});if(!result.ok){setToast(result.reason);return;}selectedTower=null;renderSelected();updateHud();if(tutorialPractice.active){resetRun();setToast('Practice restarted with fresh resources.');return;}updatePreview();saveRun();draw();},`Sell · +${refund} ✿`);};
  byId('resetBtn').onclick=()=>requestConfirmation('Restart this garden?',`Restart the ${config().label} run on ${maps[selectedMap].name}? Current towers and wave progress will be lost.`,()=>{resetRun();explainFreshGarden('Fresh garden. Choose your trail and defenders.');},'Restart run');
  byId('mapSelect').onchange=event=>{const previous=selectedMap,next=event.target.value;event.target.value=previous;changeRulesOrTrail('the trail',()=>{selectedMap=next;challengeBoardId=null;path=maps[selectedMap].path;calcPath();renderMapOptions();updatePlayOptionsLabel();applyChallenge();renderChallenges();explainFreshGarden(`${maps[selectedMap].name} selected.`);});};
  byId('routeGatePanel').addEventListener('toggle',()=>{draw();});
  byId('gateRouteOptions').addEventListener('click',event=>{if(event.target.closest('.route-gate-option'))draw();});
  byId('campaignMapNodes').addEventListener('click',event=>{const mapId=event.target.closest('[data-campaign-mission]')?.dataset.campaignMission;if(mapId)selectCampaignMission(mapId);});
  byId('modeSelect').onchange=event=>{const previous=challenge,next=event.target.value;event.target.value=previous;changeRulesOrTrail('the rules',()=>{challenge=next;challengeBoardId=null;challengeRules=challengeRules.filter(rule=>!(next==='fog'&&rule==='shortReach')&&!(next==='thrifty'&&rule==='noSunflowers'));byId('modeSelect').value=challenge;document.querySelectorAll('[data-challenge-rule]').forEach(input=>input.checked=challengeRules.includes(input.dataset.challengeRule));updatePlayOptionsLabel();applyChallenge();renderChallenges();explainFreshGarden(`${config().label} rules selected.`);});};
  byId('difficultySelect').onchange=event=>{const previous=difficulty,next=event.target.value;event.target.value=previous;changeRulesOrTrail('the difficulty',()=>{difficulty=next;challengeBoardId=null;byId('difficultySelect').value=difficulty;updatePlayOptionsLabel();applyChallenge();renderChallenges();renderCampaignMap();explainFreshGarden(`${DIFFICULTIES[difficulty].label} difficulty selected.`);});};
  document.querySelectorAll('[data-challenge-rule]').forEach(input=>input.addEventListener('change',()=>{
    const next=[...document.querySelectorAll('[data-challenge-rule]:checked')].map(control=>control.dataset.challengeRule),normalized=normalizeChallengeRules(next,challenge);
    if(!normalized){input.checked=false;setToast(challenge==='fog'?'Short Reach is already active in these rules.':'Thrifty already disables Sunflowers.');return;}
    document.querySelectorAll('[data-challenge-rule]').forEach(control=>control.checked=challengeRules.includes(control.dataset.challengeRule));
    changeRulesOrTrail('the challenge rules',()=>{challengeRules=normalized;challengeBoardId=null;document.querySelectorAll('[data-challenge-rule]').forEach(control=>control.checked=challengeRules.includes(control.dataset.challengeRule));updatePlayOptionsLabel();applyChallenge();renderChallenges();explainFreshGarden(`${normalized.length?normalized.map(rule=>CHALLENGE_RULES[rule].label).join(' + '):'No extra challenge rules'} selected.`);});
  }));
  byId('guardianLoadout').onchange=event=>{const previous=guardianMode,next=event.target.value;event.target.value=previous;changeRulesOrTrail('the mission kit',()=>{guardianMode=next;challengeBoardId=null;importedBoardChallenge=null;byId('guardianLoadout').value=guardianMode;updatePlayOptionsLabel();applyChallenge();renderChallenges();explainFreshGarden(next==='guardian'?'Meadow Guardian selected. Move it over safe grass and use Pollen Pulse to slow nearby ground pests.':next==='ward'?'Pollen Ward selected. Begin with two extra seeds.':'Mission kit removed. The core mission remains fully playable.');});};
  byId('spellLoadoutConfig').addEventListener('change',event=>{
    const input=event.target.closest('[data-spell]');if(!input)return;
    const next=[...byId('spellLoadoutConfig').querySelectorAll('[data-spell]:checked')].map(option=>option.dataset.spell);
    syncSpellLoadoutChecks();
    if(next.length!==3){byId('spellLoadoutStatus').textContent='Equip exactly three spells.';return;}
    if(next.every((id,index)=>id===spellLoadout[index]))return;
    changeRulesOrTrail('the equipped spells',()=>{spellLoadout=next;uiSettings.spellLoadout=[...next];saveUiSettings();resetRun();byId('spellLoadoutStatus').textContent=`Equipped ${next.map(id=>SPELLS[id].name).join(', ')}.`;});
  });
  byId('resumeBtn').onclick=restoreRun;
  bindRunTransferControls({exportButton:byId('exportRunBtn'),importButton:byId('importRunBtn'),fileInput:byId('runImportInput'),onExport:exportRunFile,onImport:importRunFile});
  document.querySelectorAll('.tower-filter').forEach(button=>button.onclick=()=>{towerFilter=button.dataset.filter;renderTowerOptions();});
  byId('changeBuildPickBtn').onclick=()=>{const side=document.querySelector('.side'),expanded=!side.classList.contains('show-build');side.classList.toggle('show-build',expanded);updateSelectedActionPlacement();if(expanded)byId('towerList').querySelector('.tower-option')?.focus({preventScroll:true});};
  byId('cancelPlacementBtn').onclick=()=>{if(aimedSpellId){cancelAimedSpell();return;}selectedType=null;placementCandidate=null;hideTowerSelectionChooser({chooser:byId('selectionChooser'),board:canvas.parentElement});renderTowerOptions();renderSelected();updatePreview();updatePlacementHint();draw();};
  byId('confirmPlacementBtn').onclick=()=>{if(placementCandidate)placeTower(placementCandidate);};
  byId('cancelPreviewBtn').onclick=()=>{placementCandidate=null;updatePlacementHint(pointer);draw();};
  byId('repeatBuildBtn').onclick=event=>{repeatBuild=!repeatBuild;event.currentTarget.setAttribute('aria-pressed',String(repeatBuild));event.currentTarget.textContent=`Repeat build · ${repeatBuild?'On':'Off'}`;};
  byId('confirmCancel').onclick=()=>confirmationFlow.cancel();
  byId('confirmAccept').onclick=()=>confirmationFlow.accept();
  byId('resultsClose').onclick=()=>byId('resultsDialog').close();
  byId('resultsRestart').onclick=()=>{byId('resultsDialog').close();resetRun();explainFreshGarden('Fresh garden. Choose your trail and defenders.');};
  byId('tutorialNext').onclick=()=>{if(tutorialStep>=3){beginTutorialPractice();return;}tutorialStep++;updateTutorial();};
  byId('tutorialBack').onclick=()=>{tutorialStep=Math.max(0,tutorialStep-1);updateTutorial();};
  byId('tutorialSkip').onclick=finishTutorial;byId('tutorialReplayBtn').onclick=replayTutorial;
  bindUiSettingsControls({
    controls:{
      sound:byId('soundBtn'), animation:byId('animationSelect'), shake:byId('shakeToggle'), flashes:byId('flashToggle'),
      masterVolume:byId('masterVolume'), masterVolumeValue:byId('masterVolumeValue'),
      musicVolume:byId('musicVolume'), musicVolumeValue:byId('musicVolumeValue'),
      effectsVolume:byId('effectsVolume'), effectsVolumeValue:byId('effectsVolumeValue'),
      compact:byId('compactToggle'), palette:byId('paletteSelect'), textSize:byId('textSizeSelect'),autoStartWaves:byId('autoStartWaves'),alwaysShowAirRoute:byId('alwaysShowAirRoute')
    }, settings:uiSettings, saveSettings:saveUiSettings, applySettings:applyUiSettings,
    redraw:draw, syncAudio:()=>gameAudio.sync(),
    setSoundEnabled:enabled=>{soundOn=enabled;gameAudio.sync();if(enabled)playCue('soundOn');},
    onAutoStartChange:enabled=>{
      autoStartController.setEnabled(enabled);
      if(enabled&&wave>0&&!runIsRunning()&&!runIsOver()&&challenge!=='endless')autoStartController.afterWaveClear(wave);
      updateAutoStartControls();
    },
    onAirRouteChange:()=>{updatePreview();draw();}
  });
  byId('keyboardBindings').onclick=event=>{const button=event.target.closest('[data-key-binding]');if(!button)return;pendingKeyBinding=button.dataset.keyBinding;byId('keyboardBindingStatus').textContent=`Press a key for ${buildKeyboardActionLabels(towersDef)[pendingKeyBinding]}. Escape cancels.`;button.focus({preventScroll:true});};
  byId('resetKeyboardBindings').onclick=()=>{keyBindings={...DEFAULT_KEY_BINDINGS};uiSettings.keyBindings=keyBindings;saveUiSettings();pendingKeyBinding=null;byId('keyboardBindingStatus').textContent='Default shortcuts restored.';renderKeyboardBindings();renderTowerOptions();};
  document.addEventListener('keydown',handleBindingKeydown,true);
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{
    if(!document.querySelector('dialog[open]'))transitionRun({type:'DIALOG_CLOSE'});
    updateHud();
  }));
  document.addEventListener('visibilitychange',()=>{
    transitionRun({type:document.hidden?'TAB_HIDDEN':'TAB_VISIBLE'});
    autoStartController.setEligible(autoStartEligible());
    updateAutoStartControls();
  });
  bindKeyboardInput(document,()=>({
    dialogOpen:Boolean(document.querySelector('dialog[open]')),
    placementActive:Boolean(selectedType||aimedSpellId),
    guardianMoveActive,
    guardianMoveActive,
    towerTypes:Object.keys(towersDef),bindings:keyBindings
  }),command=>{
    if(command.type==='toggle-pause'){transitionRun({type:'TOGGLE_USER_PAUSE'});updateHud();updateGatePanel();saveRun();}
    else if(command.type==='cancel-placement'){if(aimedSpellId)cancelAimedSpell();else if(abilityPreview)cancelTowerAbilityPreview();else byId('cancelPlacementBtn').click();}
    else if(command.type==='move-placement-cursor'){
      const moved=movePlacementCursor(pointer,command.direction,canvas.width,canvas.height,18,placementCandidate);pointer=moved.pointer;placementCandidate=moved.candidate;updatePlacementHint(pointer);draw();
      announceKeyboardStatus(byId('placementHint').textContent);
    }
    else if(command.type==='cancel-guardian-move')endGuardianMove();
    else if(command.type==='move-guardian-cursor'){
      const moved=movePlacementCursor(pointer,command.direction,canvas.width,canvas.height,18);pointer=moved.pointer;draw();announceKeyboardStatus('Guardian destination cursor moved. Press Enter to confirm or Escape to cancel.');
    }
    else if(command.type==='commit-guardian-move')commitGuardianMove(pointer);
    else if(command.type==='cancel-guardian-move')endGuardianMove();
    else if(command.type==='move-guardian-cursor'){
      const moved=movePlacementCursor(pointer,command.direction,canvas.width,canvas.height,18);pointer=moved.pointer;draw();announceKeyboardStatus('Guardian destination cursor moved. Press Enter to confirm or Escape to cancel.');
    }
    else if(command.type==='commit-guardian-move')commitGuardianMove(pointer);
    else if(command.type==='keyboard-placement'){
      if(!pointer.inside)pointer={x:canvas.width/2,y:canvas.height/2,inside:true};
      if(aimedSpellId){commitAimedSpell(pointer);return;}
      if(placementCandidate)placeTower(placementCandidate);else{placementCandidate={x:pointer.x,y:pointer.y};updatePlacementHint(pointer);draw();}
    }
    else if(command.type==='toggle-speed'){speed=toggleGameSpeed(speed);updateHud();}
    else if(command.type==='start-wave')startWave();
    else if(command.type==='bloom')useBloom();
    else if(command.type==='snare')useSnare();
    else if(command.type==='select-tower'){selectTowerShortcut(command.towerType);if(!pointer.inside)pointer={x:canvas.width/2,y:canvas.height/2,inside:true};updatePlacementHint(pointer);draw();}
    else if(command.type==='cycle-tower')cyclePlacedTower(command.direction);
  });

  function selectTowerShortcut(type) {
    const def=towersDef[type];if(!def)return;
    if(challenge==='thrifty'&&type==='sunflower'){setToast('Sunflower is unavailable in Thrifty mode.');return;}
    towerFilter='all';if(!['sprout','dew','puff'].includes(type))byId('towerList').dataset.showAll='true';renderTowerOptions();const choice=byId('towerList').querySelector(`[data-type="${type}"]`);if(!choice)return;
    if(mobileLayout.matches)setDefenderSheetOpen(true);
    choice.click();canvas.focus({preventScroll:true});
  }
  function cyclePlacedTower(direction) {
    if(!towers.length){setToast('No placed defenders to inspect yet.');return;}
    const index=towers.findIndex(tower=>tower.id===selectedTower?.id),next=index<0?(direction>0?0:towers.length-1):(index+direction+towers.length)%towers.length;
    selectPlacedTower(towers[next]);canvas.focus({preventScroll:true});
  }

  // Start-wave preview and saved progression are available immediately.
  applyUiSettings();renderKeyboardBindings();byId('soundBtn').textContent=soundOn?'♫ Sound on':'♫ Sound muted';byId('soundBtn').setAttribute('aria-pressed',String(soundOn));
  createSpellControls();syncSpellLoadoutChecks();renderMapOptions();updatePlayOptionsLabel();renderAchievements();calcPath();renderTowerOptions();renderSelected();updateHud();updatePreview();
  let startupPrimaryRaw=null,startupBackupRaw=null,startupStorageUnavailable=false;
  try{startupPrimaryRaw=localStorage.getItem(RUN_KEY);startupBackupRaw=localStorage.getItem(RUN_BACKUP_KEY);}catch{startupStorageUnavailable=true;}
  const savedRunAtStartup=(()=>{try{return startupPrimaryRaw?JSON.parse(startupPrimaryRaw):null;}catch{return null;}})();
  byId('resumeBtn').disabled=!Boolean(startupPrimaryRaw||startupBackupRaw);
  if(startupStorageUnavailable)setToast('Saved run storage is unavailable. Your current garden remains playable, but progress may not save.',0);
  else if(isUnsupportedRunVersion(savedRunAtStartup)){futureSaveProtected=true;setToast(`Saved run uses newer game version ${savedRunAtStartup.version}; this build will preserve it.`,0);}
  else if(selectRecoverableRun(startupPrimaryRaw,startupBackupRaw,maps,modes).source==='backup')setToast('The main save is invalid. Resume will recover the previous autosave.',0);
  if(uiSettings.tutorialInProgress){
    tutorialReturnToSavedRun=Boolean(uiSettings.tutorialReturnToSavedRun);tutorialStep=3;updateTutorial();byId('tutorialText').textContent='Your practice restarts from step one after a reload. The saved garden remains protected.';byId('tutorialDialog').showModal();transitionRun({type:'DIALOG_OPEN'});
  }
  registerOfflineSupport({canApplyUpdate:()=>runIsOver()||(!wave&&!towers.length&&!enemies.length)});
  window.setInterval(()=>{
    autoStartController.setEligible(autoStartEligible());
    autoStartController.tick(()=>{if(autoStartEligible())startWave();});
    updateAutoStartControls();
  },200);
  gameLoop.start();
})();
