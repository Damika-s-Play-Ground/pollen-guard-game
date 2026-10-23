export function renderTowerTestRange(container, document, { towerTypes, enemyTypes, onMeasure, challenge='classic', difficulty='standard', challengeRules=[], researchLoadout=[], relicLoadout=[] } = {}) {
  container.replaceChildren();
  const title=document.createElement('p');title.className='wave-info';title.textContent='Isolated practice only · each measurement starts from fresh conditions · no campaign progress, achievements, challenge score or saved-run changes.';container.append(title);
  const form=document.createElement('div');form.className='test-range-controls';
  const select=(id,label,items)=>{const wrap=document.createElement('label');wrap.textContent=label;const control=document.createElement('select');control.id=id;for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;control.append(option);}wrap.append(control);form.append(wrap);return control;};
  const tower=select('rangeTower','Defender',towerTypes),level=select('rangeLevel','Level',[{id:'1',label:'1'},{id:'2',label:'2'},{id:'3',label:'3'}]),branch=select('rangeBranch','Upgrade path',[{id:'0',label:'Path A'},{id:'1',label:'Path B'}]),enemy=select('rangeEnemy','Pest',enemyTypes);
  const slider=(id,label,max)=>{const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.id=id;input.type='range';input.min='0';input.max=String(max);input.value='0';const output=document.createElement('output');output.textContent='0';input.addEventListener('input',()=>output.textContent=input.value);wrap.append(input,output);form.append(wrap);return input;};
  const armor=slider('rangeArmor','Armor',20),shield=slider('rangeShield','Shield',40);
  const measure=document.createElement('button');measure.type='button';measure.className='primary';measure.textContent='Run test · up to 20s';form.append(measure);
  const reset=document.createElement('button');reset.type='button';reset.textContent='Restart test';form.append(reset);
  const status=document.createElement('p');status.className='test-range-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  container.append(form,status);
  const run=()=>{status.textContent='Running isolated production combat…';const result=onMeasure({towerType:tower.value,towerLevel:Number(level.value),branch:Number(branch.value),enemyType:enemy.value,armor:Number(armor.value),shield:Number(shield.value),challenge,difficulty,challengeRules,researchLoadout,relicLoadout,maxTicks:2400});status.textContent=result.ok
    ? `${result.towerType} vs ${result.enemyType} · ${result.damage} effective damage in ${result.simulatedSeconds}s · ${result.defeated?'pest defeated':result.leaked?'pest escaped':'pest remains'} · ${result.attackStats.range} range, ${result.attackStats.damage} base damage. Practice only; no score saved.`
    : result.reason;};
  measure.addEventListener('click',run);
  reset.addEventListener('click',()=>{armor.value='0';shield.value='0';form.querySelector('#rangeArmor').nextElementSibling.textContent='0';form.querySelector('#rangeShield').nextElementSibling.textContent='0';run();});
}
