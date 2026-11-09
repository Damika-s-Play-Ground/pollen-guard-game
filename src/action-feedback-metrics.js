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
      const handlerDuration=now()-startedAt;
      requestFrame(()=>requestFrame(()=>{
        const duration=now()-startedAt;
        if(!Number.isFinite(duration)||duration<0||!Number.isFinite(handlerDuration)||handlerDuration<0)return;
        samples.push({action,handlerDuration,duration});
        if(samples.length>sampleLimit)samples.splice(0,samples.length-sampleLimit);
      }));
    };
  }
  function summary(){
    const result={};
    for(const action of ACTIONS){
      const values=samples.filter(sample=>sample.action===action).map(sample=>sample.duration).sort((a,b)=>a-b);
      if(!values.length)continue;
      const handlerValues=samples.filter(sample=>sample.action===action).map(sample=>sample.handlerDuration).sort((a,b)=>a-b);
      const percentile=p=>Math.round(values[Math.max(0,Math.ceil(values.length*p)-1)]*10)/10;
      const handlerPercentile=p=>Math.round(handlerValues[Math.max(0,Math.ceil(handlerValues.length*p)-1)]*10)/10;
      result[action]={count:values.length,p50:percentile(.5),p95:percentile(.95),max:Math.round(values.at(-1)*10)/10,
        handlerP50:handlerPercentile(.5),handlerP95:handlerPercentile(.95),handlerMax:Math.round(handlerValues.at(-1)*10)/10};
    }
    return result;
  }
  return {begin,summary,clear:()=>samples.splice(0,samples.length)};
}
