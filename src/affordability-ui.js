export function refreshPurchaseAffordability({ document, cash, selectedUpgrade = null }) {
  document.querySelectorAll('.tower-option').forEach(button => {
    const cost=Number(button.dataset.purchaseCost),shortfall=Math.max(0,cost-cash),label=button.querySelector('.affordability-shortfall');
    if(label){label.hidden=!shortfall;label.textContent=shortfall?`Need ${shortfall} more`:'';}
    const base=button.getAttribute('title')||'';
    button.setAttribute('title',base.replace(/ Need \d+ more petals\./,'')+(shortfall?` Need ${shortfall} more petals.`:''));
  });
  document.querySelectorAll('.branch-choice,.context-branch').forEach(button=>{
    const label=button.querySelector('.affordability-shortfall');if(!label)return;
    const shortfall=Math.max(0,Number(label.dataset.cost)-cash);label.hidden=!shortfall;label.textContent=shortfall?`Need ${shortfall} more`:'';
    const base=button.title.replace(/ · Need \d+ more$/,'');button.title=base+(shortfall?` · Need ${shortfall} more`:'' );
  });
  if(selectedUpgrade&&selectedUpgrade.level<3&&selectedUpgrade.branchChoice!=null){
    const shortfall=Math.max(0,selectedUpgrade.cost-cash);
    const title=`Upgrade ${selectedUpgrade.name} · Cost ${selectedUpgrade.cost} petals${shortfall?` · Need ${shortfall} more`:''}.`;
    document.getElementById('upgradeBtn').title=title;
    document.getElementById('upgradeBtn').textContent=`Upgrade · ${selectedUpgrade.cost} ✿${shortfall?` · Need ${shortfall} more`:''}`;
    const quickButton=document.getElementById('contextUpgradeBtn');
    quickButton.title=title;
    quickButton.textContent=shortfall?`Upgrade · ${selectedUpgrade.cost} ✿ · Need ${shortfall} more`:`Upgrade · ${selectedUpgrade.cost} ✿`;
  }
}
