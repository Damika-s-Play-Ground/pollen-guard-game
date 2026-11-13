// Reuse one result object while the synchronous HUD refresh checks which
// aimed spells have a valid target in the current battle state.
export function updateSpellTargetAvailability(enemies,towers,towersDef,canHitTarget,groundQuery,airQuery,output){
  output.groundEnemy=false;
  output.airCapableEnemy=false;
  output.attackingDefender=false;
  for(let enemyIndex=0;enemyIndex<enemies.length;enemyIndex++){
    const enemy=enemies[enemyIndex];
    if(!output.groundEnemy&&canHitTarget(groundQuery,enemy))output.groundEnemy=true;
    if(!output.airCapableEnemy&&canHitTarget(airQuery,enemy))output.airCapableEnemy=true;
    if(output.groundEnemy&&output.airCapableEnemy)break;
  }
  for(let towerIndex=0;towerIndex<towers.length;towerIndex++){
    if(!towersDef[towers[towerIndex].type].supportStructure){output.attackingDefender=true;break;}
  }
  return output;
}
