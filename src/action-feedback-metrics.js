const ACTIONS=new Set(['selection','placement','purchase','pause']);

export function createActionFeedbackMetrics({
  now=()=>performance.now(),
  requestFrame=callback=>requestAnimationFrame(callback),
  measurementState=()=>typeof document==='undefined'?'visible':document.visibilityState!=='visible'?'hidden':typeof document.hasFocus==='function'&&!document.hasFocus()?'unfocused':'visible',
  sampleLimit=120
}={}){
  const samples=[];
  const ignored={hidden:0,unfocused:0};
  function begin(action){
    if(!ACTIONS.has(action))return ()=>{};
    const startedAt=now(),startedState=measurementState();let completed=false;
    return ()=>{
      if(completed)return;
      completed=true;
      const handlerDuration=now()-startedAt;
      if(startedState!=='visible'){
        if(Object.hasOwn(ignored,startedState))ignored[startedState]++;
        return;
      }
      requestFrame(()=>requestFrame(()=>{
        const state=measurementState();
        if(state!=='visible'){
          if(Object.hasOwn(ignored,state))ignored[state]++;
          return;
        }
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
  function diagnostics(){return {recorded:samples.length,ignored:{...ignored}};}
  return {begin,summary,diagnostics,clear:()=>{samples.splice(0,samples.length);ignored.hidden=0;ignored.unfocused=0;}};
}
