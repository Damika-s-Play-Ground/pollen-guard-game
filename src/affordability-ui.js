import { petalTextMarkup } from './ui-icons.js';

const refreshedAffordabilityByDocument = new WeakMap();

function setText(element,value){if(element.textContent!==value)element.textContent=value;}
function setHidden(element,value){if(element.hidden!==value)element.hidden=value;}
function setTitle(element,value){if(element.getAttribute('title')!==value)element.setAttribute('title',value);}
function setPetalMarkup(element,value){const markup=petalTextMarkup(value);if(element.innerHTML!==markup)element.innerHTML=markup;}

function upgradeState(selectedUpgrade) {
  return selectedUpgrade ? [selectedUpgrade.name,selectedUpgrade.cost,selectedUpgrade.level,selectedUpgrade.branchChoice] : null;
}

function sameUpgradeState(left,right) {
  return left===right||(left!==null&&right!==null&&left[0]===right[0]&&left[1]===right[1]&&left[2]===right[2]&&left[3]===right[3]);
}

function sameUpgradeValues(state,selectedUpgrade) {
  return state===null?!selectedUpgrade:Boolean(selectedUpgrade&&state[0]===selectedUpgrade.name&&state[1]===selectedUpgrade.cost&&state[2]===selectedUpgrade.level&&state[3]===selectedUpgrade.branchChoice);
}

function renderSelectedUpgradeAffordability({document,cash,selectedUpgrade}) {
  if(!selectedUpgrade||selectedUpgrade.level>=3||selectedUpgrade.branchChoice==null)return;
  const shortfall=Math.max(0,selectedUpgrade.cost-cash);
  const title=`Upgrade ${selectedUpgrade.name} · Cost ${selectedUpgrade.cost} petals${shortfall?` · Need ${shortfall} more`:''}.`;
  const upgradeButton=document.getElementById('upgradeBtn');
  setTitle(upgradeButton,title);
  setPetalMarkup(upgradeButton,`Upgrade · ${selectedUpgrade.cost} ✿${shortfall?` · Need ${shortfall} more`:''}`);
  const quickButton=document.getElementById('contextUpgradeBtn');
  setTitle(quickButton,title);
  setPetalMarkup(quickButton,shortfall?`Upgrade · ${selectedUpgrade.cost} ✿ · Need ${shortfall} more`:`Upgrade · ${selectedUpgrade.cost} ✿`);
}

export function refreshSelectedUpgradeAffordability({document,cash,selectedUpgrade=null}) {
  renderSelectedUpgradeAffordability({document,cash,selectedUpgrade});
  const previous=refreshedAffordabilityByDocument.get(document);
  if(previous&&!sameUpgradeValues(previous.selectedUpgrade,selectedUpgrade))previous.selectedUpgrade=upgradeState(selectedUpgrade);
}

export function refreshPurchaseAffordability({ document, cash, selectedUpgrade = null, force = false }) {
  const previous=refreshedAffordabilityByDocument.get(document),nextUpgrade=upgradeState(selectedUpgrade);
  if(!force&&previous&&previous.cash===cash&&sameUpgradeState(previous.selectedUpgrade,nextUpgrade))return false;
  document.querySelectorAll('.tower-option').forEach(button => {
    const cost=Number(button.dataset.purchaseCost),shortfall=Math.max(0,cost-cash),label=button.querySelector('.affordability-shortfall');
    if(label){setHidden(label,!shortfall);setText(label,shortfall?`Need ${shortfall} more`:'');}
    const base=button.getAttribute('title')||'';
    setTitle(button,base.replace(/ Need \d+ more petals\./,'')+(shortfall?` Need ${shortfall} more petals.`:''));
  });
  document.querySelectorAll('.branch-choice,.context-branch').forEach(button=>{
    const label=button.querySelector('.affordability-shortfall');if(!label)return;
    const shortfall=Math.max(0,Number(label.dataset.cost)-cash);setHidden(label,!shortfall);setText(label,shortfall?`Need ${shortfall} more`:'');
    const base=(button.getAttribute('title')||'').replace(/ · Need \d+ more$/,'');setTitle(button,base+(shortfall?` · Need ${shortfall} more`:'' ));
  });
  renderSelectedUpgradeAffordability({document,cash,selectedUpgrade});
  refreshedAffordabilityByDocument.set(document,{cash,selectedUpgrade:nextUpgrade});
  return true;
}
