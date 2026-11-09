const ACTIONS=new Set(['selection','placement','purchase','pause']);

export function createActionFeedbackMetrics({
  now=()=>performance.now(),
  requestFrame=callback=>requestAnimationFrame(callback),
  sampleLimit=120
}={}){
  const samples=[];
  function begin(action){
    if(!ACTIONS.has(action))return ()=>{};
    const startedAt=now();let completed=false;
    return ()=>{
      if(completed)return;
      completed=true;
      requestFrame(()=>requestFrame(()=>{
        const duration=now()-startedAt;
        if(!Number.isFinite(duration)||duration<0)return;
        samples.push({action,duration});
        if(samples.length>sampleLimit)samples.splice(0,samples.length-sampleLimit);
      }));
    };
  }
  function summary(){
    const result={};
    for(const action of ACTIONS){
      const values=samples.filter(sample=>sample.action===action).map(sample=>sample.duration).sort((a,b)=>a-b);
      if(!values.length)continue;
      const percentile=p=>Math.round(values[Math.max(0,Math.ceil(values.length*p)-1)]*10)/10;
      result[action]={count:values.length,p50:percentile(.5),p95:percentile(.95),max:Math.round(values.at(-1)*10)/10};
    }
    return result;
  }
  return {begin,summary,clear:()=>samples.splice(0,samples.length)};
}
