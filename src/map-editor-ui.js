import { createMapEditorTemplate, exportCustomMap, importCustomMap, validateCustomMap } from './map-editor.js';

function field(document,root,{id,label,value,tag='input',hint=''}){
  const wrap=document.createElement('label');wrap.className='map-editor-field';wrap.htmlFor=id;wrap.append(document.createTextNode(label));
  const control=document.createElement(tag);control.id=id;if(tag==='textarea')control.rows=id==='mapWaves'?10:4;control.value=value;
  wrap.append(control);if(hint){const note=document.createElement('small');note.textContent=hint;wrap.append(note);}root.append(wrap);return control;
}
function serializeDraft(fields){
  let waves;try{waves=JSON.parse(fields.waves.value);}catch{return {valid:false,reason:'Wave presets must be valid JSON. Edit the 15-wave array and try again.'};}
  const route=fields.route.value.split('|').map(pair=>pair.trim().split(',').map(value=>Number(value.trim())));
  const buildZones=fields.zones.value.split(';').map(row=>row.trim()).filter(Boolean).map(row=>{const [x,y,width,height]=row.split(',').map(value=>Number(value.trim()));return {x,y,width,height};});
  const checked=validateCustomMap({id:fields.id.value,name:fields.name.value,width:900,height:540,route,buildZones,
    objective:{type:'protect-seed-pod',minLives:Number(fields.minLives.value),brief:fields.brief.value},waves});
  return checked.valid?{valid:true,map:checked.map}:{valid:false,reason:checked.reason};
}
function populate(fields,map){
  fields.id.value=map.id;fields.name.value=map.name;fields.route.value=map.route.map(point=>point.join(', ')).join(' | ');
  fields.zones.value=map.buildZones.map(zone=>[zone.x,zone.y,zone.width,zone.height].join(', ')).join('; ');
  fields.minLives.value=String(map.objective.minLives);fields.brief.value=map.objective.brief;fields.waves.value=JSON.stringify(map.waves,null,2);
}
export function renderMapEditor(container,document,{onSave=()=>({ok:false,reason:'Saving is unavailable.'}),onTest=()=>{},existingMaps=[]}={}){
  container.replaceChildren();const intro=document.createElement('p');intro.className='wave-info';intro.textContent='Author a local trail, marked build zones, seed objective, and 15 enemy-wave presets. Maps stay on this device; export a JSON file or share its text yourself. There is no online map service.';container.append(intro);
  const savedLabel=document.createElement('label');savedLabel.className='map-editor-field';savedLabel.htmlFor='savedCustomMap';savedLabel.append(document.createTextNode('Saved local maps'));
  const savedSelect=document.createElement('select');savedSelect.id='savedCustomMap';
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=existingMaps.length?'Choose a saved map':'No maps saved yet';savedSelect.append(placeholder);
  for(const map of existingMaps){const option=document.createElement('option');option.value=`custom-${map.id}`;option.textContent=map.name;savedSelect.append(option);}savedLabel.append(savedSelect);container.append(savedLabel);
  const grid=document.createElement('div');grid.className='map-editor-fields';container.append(grid);
  const template=createMapEditorTemplate(),fields={};
  fields.name=field(document,grid,{id:'mapName',label:'Map name',value:template.name});
  fields.id=field(document,grid,{id:'mapId',label:'Map ID · immutable after saving',value:template.id,hint:'Use a new ID for each saved version so existing runs remain reproducible.'});
  fields.route=field(document,grid,{id:'mapRoute',label:'Route points · x,y separated by |',tag:'textarea',value:template.route.map(point=>point.join(', ')).join(' | '),hint:'900×540 playfield. Enter from the left and leave from the right.'});
  fields.zones=field(document,grid,{id:'mapZones',label:'Build zones · x,y,width,height separated by ;',tag:'textarea',value:template.buildZones.map(zone=>[zone.x,zone.y,zone.width,zone.height].join(', ')).join('; '),hint:'Defenders can only be planted inside these rectangles.'});
  fields.minLives=field(document,grid,{id:'mapLives',label:'Minimum seeds to protect',value:String(template.objective.minLives)});fields.minLives.type='number';fields.minLives.min='1';fields.minLives.max='20';
  fields.brief=field(document,grid,{id:'mapBrief',label:'Objective briefing',value:template.objective.brief});
  fields.waves=field(document,grid,{id:'mapWaves',label:'15 authored wave presets · JSON',tag:'textarea',value:JSON.stringify(template.waves,null,2),hint:'Each wave has a cue and 1–6 groups. Allowed enemies, counts and spawn intervals are checked before saving.'});
  const actions=document.createElement('div');actions.className='map-editor-actions';container.append(actions);
  const button=(label,primary=false)=>{const value=document.createElement('button');value.type='button';value.textContent=label;if(primary)value.className='primary';actions.append(value);return value;};
  const validate=button('Validate map'),save=button('Save new local map',true),test=button('Test-play saved map');test.disabled=!existingMaps.length;
  const undo=button('Undo last validation'),redo=button('Redo validation'),starter=button('Load starter template');
  const json=field(document,container,{id:'mapJson',label:'Map export / import JSON',tag:'textarea',value:'',hint:'Imported JSON is schema- and checksum-validated; all text is rendered literally.'});
  const exportButton=document.createElement('button');exportButton.type='button';exportButton.textContent='Export validated map';container.append(exportButton);
  const importButton=document.createElement('button');importButton.type='button';importButton.textContent='Import map JSON';container.append(importButton);
  const status=document.createElement('p');status.className='map-editor-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');container.append(status);
  let undoStack=[],redoStack=[],lastValid=template,lastSavedId=null;
  const current=()=>serializeDraft(fields);
  validate.addEventListener('click',()=>{const result=current();if(!result.valid){status.textContent=result.reason;return;}if(JSON.stringify(result.map)!==JSON.stringify(lastValid)){undoStack.push(lastValid);if(undoStack.length>100)undoStack.shift();redoStack=[];lastValid=result.map;}status.textContent=`Valid map · ${result.map.route.length} route points · ${result.map.buildZones.length} build zones · 15 waves.`;});
  save.addEventListener('click',()=>{const result=current();if(!result.valid){status.textContent=result.reason;return;}const saved=onSave(result.map);status.textContent=saved.ok?`Saved ${result.map.name}. Campaign progression and challenge scores are disabled on custom maps.`:saved.reason;if(saved.ok){lastSavedId=`custom-${result.map.id}`;if(![...savedSelect.options].some(option=>option.value===lastSavedId)){const option=document.createElement('option');option.value=lastSavedId;option.textContent=result.map.name;savedSelect.append(option);}savedSelect.value=lastSavedId;}test.disabled=!savedSelect.value;});
  savedSelect.addEventListener('change',()=>{test.disabled=!savedSelect.value;});
  test.addEventListener('click',()=>{const id=savedSelect.value||lastSavedId;if(id)onTest(id);});
  undo.addEventListener('click',()=>{if(!undoStack.length){status.textContent='No validated edit to undo.';return;}redoStack.push(lastValid);lastValid=undoStack.pop();populate(fields,lastValid);status.textContent='Restored the previous validated draft.';});
  redo.addEventListener('click',()=>{if(!redoStack.length){status.textContent='No validated edit to redo.';return;}undoStack.push(lastValid);lastValid=redoStack.pop();populate(fields,lastValid);status.textContent='Restored the next validated draft.';});
  starter.addEventListener('click',()=>{const next=createMapEditorTemplate();if(existingMaps.length)next.id=`garden-${existingMaps.length+1}`;populate(fields,next);lastValid=next;status.textContent='Starter route, two build zones and 15 authored wave presets loaded.';});
  exportButton.addEventListener('click',()=>{const result=current();if(!result.valid){status.textContent=result.reason;return;}const exported=exportCustomMap(result.map);if(exported.ok){json.value=exported.text;status.textContent='Validated map JSON is ready to save or share as text.';}else status.textContent=exported.reason;});
  importButton.addEventListener('click',()=>{const imported=importCustomMap(json.value);if(!imported.ok){status.textContent=imported.reason;return;}populate(fields,imported.map);lastValid=imported.map;lastSavedId=null;test.disabled=true;status.textContent='Map JSON checked. Save it under a fresh ID to add it locally.';});
  return {fields,status,current,savedSelect};
}
