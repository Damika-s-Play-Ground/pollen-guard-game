import { petalTextMarkup } from './ui-icons.js';

function setText(element,value){if(element.textContent!==value)element.textContent=value;}
function setHidden(element,value){if(element.hidden!==value)element.hidden=value;}
function setTitle(element,value){if(element.getAttribute('title')!==value)element.setAttribute('title',value);}
function setPetalMarkup(element,value){const markup=petalTextMarkup(value);if(element.innerHTML!==markup)element.innerHTML=markup;}

export function refreshPurchaseAffordability({ document, cash, selectedUpgrade = null }) {
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
  if(selectedUpgrade&&selectedUpgrade.level<3&&selectedUpgrade.branchChoice!=null){
    const shortfall=Math.max(0,selectedUpgrade.cost-cash);
    const title=`Upgrade ${selectedUpgrade.name} · Cost ${selectedUpgrade.cost} petals${shortfall?` · Need ${shortfall} more`:''}.`;
    const upgradeButton=document.getElementById('upgradeBtn');
    setTitle(upgradeButton,title);
    setPetalMarkup(upgradeButton,`Upgrade · ${selectedUpgrade.cost} ✿${shortfall?` · Need ${shortfall} more`:''}`);
    const quickButton=document.getElementById('contextUpgradeBtn');
    setTitle(quickButton,title);
    setPetalMarkup(quickButton,shortfall?`Upgrade · ${selectedUpgrade.cost} ✿ · Need ${shortfall} more`:`Upgrade · ${selectedUpgrade.cost} ✿`);
  }
}
