const REQUIRED_COLUMNS=['participant_code','version','continued_at_15m'];
const ALLOWED_COLUMNS=new Set([
  'participant_code','version','order','device','input_method','prior_genre_familiarity','started_at','stopped_at','stop_block',
  'continued_at_15m','stop_reason','reason_verbatim','decision_intervals','build_or_strategy_changes','unprompted_retry','loss_explanation',
  'enjoyment_1_7','competence_1_7','autonomy_1_7','wants_different_build_or_map','return_intention','notes','missingness_reason'
]);
const VERSIONS=['baseline','redesign'];
const RATINGS=['enjoyment_1_7','competence_1_7','autonomy_1_7'];
const CATEGORY_VALUES={
  stop_block:['before_15','at_15','optional_15_to_30','at_30','other'],
  continued_at_15m:['yes','no','not_reached'],
  stop_reason:['time','boredom','confusion','frustration','satisfied','technical','other','not_given'],
  unprompted_retry:['yes','no','skip','not_asked'],
  wants_different_build_or_map:['yes','no','skip','not_asked'],
  return_intention:['yes','maybe','no','skip']
};
const BOOTSTRAP_REPLICATES=20_000;

export function parseCsv(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let index=0;index<text.length;index++){
    const char=text[index];
    if(quoted){
      if(char==='"'&&text[index+1]==='"'){field+='"';index++;}
      else if(char==='"')quoted=false;
      else field+=char;
    }else if(char==='"'&&field.length===0)quoted=true;
    else if(char===','){row.push(field);field='';}
    else if(char==='\n'||char==='\r'){
      if(char==='\r'&&text[index+1]==='\n')index++;
      row.push(field);field='';
      if(row.some(value=>value!==''))rows.push(row);
      row=[];
    }else field+=char;
  }
  if(quoted)throw new Error('CSV has an unterminated quoted field.');
  if(field!==''||row.length){row.push(field);if(row.some(value=>value!==''))rows.push(row);}
  if(!rows.length)throw new Error('CSV is empty.');
  const headers=rows.shift().map((value,index)=>index===0?value.replace(/^\uFEFF/,'').trim():value.trim());
  if(new Set(headers).size!==headers.length)throw new Error('CSV contains duplicate column names.');
  const unknown=headers.filter(header=>!ALLOWED_COLUMNS.has(header));
  if(unknown.length)throw new Error(`Unsupported columns: ${unknown.join(', ')}. Remove names or other unapproved fields before analysis.`);
  const missing=REQUIRED_COLUMNS.filter(header=>!headers.includes(header));
  if(missing.length)throw new Error(`CSV is missing required columns: ${missing.join(', ')}.`);
  return rows.map((values,index)=>{
    if(values.length!==headers.length)throw new Error(`CSV row ${index+2} has ${values.length} fields; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((header,column)=>[header,values[column].trim()]));
  });
}

function numericRating(value,column,rowNumber){
  if(value===''||value==='skip')return null;
  const rating=Number(value);
  if(!Number.isInteger(rating)||rating<1||rating>7)throw new Error(`Row ${rowNumber}: ${column} must be 1–7, skip, or blank.`);
  return rating;
}

function normalizeRows(rows){
  if(!Array.isArray(rows))throw new Error('Rows must be an array.');
  const seen=new Set();
  return rows.map((source,index)=>{
    const row={...source},rowNumber=index+2;
    if(typeof row.participant_code!=='string'||!row.participant_code.trim())throw new Error(`Row ${rowNumber}: participant_code is required.`);
    if(!VERSIONS.includes(row.version))throw new Error(`Row ${rowNumber}: version must be baseline or redesign.`);
    const key=`${row.participant_code}\u0000${row.version}`;
    if(seen.has(key))throw new Error(`Row ${rowNumber}: duplicate participant_code/version pair.`);
    seen.add(key);
    for(const [column,allowed] of Object.entries(CATEGORY_VALUES))if(row[column]&&!allowed.includes(row[column]))
      throw new Error(`Row ${rowNumber}: ${column} must use a documented category (${allowed.join(', ')}).`);
    for(const column of RATINGS)row[column]=numericRating(row[column]??'',column,rowNumber);
    return row;
  });
}

function wilson(successes,total){
  if(!total)return null;
  const z=1.959963984540054,p=successes/total,z2=z*z,denominator=1+z2/total;
  const center=(p+z2/(2*total))/denominator,margin=z*Math.sqrt(p*(1-p)/total+z2/(4*total*total))/denominator;
  return [Math.max(0,center-margin),Math.min(1,center+margin)].map(value=>Number(value.toFixed(4)));
}

function randomGenerator(seed){
  let state=seed>>>0||1;
  return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/0x1_0000_0000;};
}

function quantile(sorted,p){
  if(!sorted.length)return null;
  const position=(sorted.length-1)*p,lower=Math.floor(position),fraction=position-lower;
  return sorted[lower]+(sorted[Math.min(lower+1,sorted.length-1)]-sorted[lower])*fraction;
}

function bootstrapMeanInterval(values,seed){
  if(!values.length)return null;
  if(values.length===1)return [Number(values[0].toFixed(3)),Number(values[0].toFixed(3))];
  const random=randomGenerator(seed),means=new Array(BOOTSTRAP_REPLICATES),n=values.length;
  for(let sample=0;sample<BOOTSTRAP_REPLICATES;sample++){
    let sum=0;for(let i=0;i<n;i++)sum+=values[Math.floor(random()*n)];means[sample]=sum/n;
  }
  means.sort((a,b)=>a-b);
  return [quantile(means,.025),quantile(means,.975)].map(value=>Number(value.toFixed(3)));
}

function bootstrapIndependentDifference(baseline,redesign,seed){
  if(!baseline.length||!redesign.length)return null;
  const random=randomGenerator(seed),differences=new Array(BOOTSTRAP_REPLICATES);
  for(let sample=0;sample<BOOTSTRAP_REPLICATES;sample++){
    let baseSum=0,redesignSum=0;
    for(let index=0;index<baseline.length;index++)baseSum+=baseline[Math.floor(random()*baseline.length)];
    for(let index=0;index<redesign.length;index++)redesignSum+=redesign[Math.floor(random()*redesign.length)];
    differences[sample]=redesignSum/redesign.length-baseSum/baseline.length;
  }
  differences.sort((a,b)=>a-b);
  return [quantile(differences,.025),quantile(differences,.975)].map(value=>Number(value.toFixed(3)));
}

function numericMetric(row,key){
  if(key==='continued_at_15m')return row[key]==='yes'?1:row[key]==='no'?0:null;
  const value=row[key];return Number.isFinite(value)?value:null;
}

function summarizeMetric(rows,key,seed){
  const values=rows.map(row=>numericMetric(row,key)).filter(value=>value!==null);
  if(!values.length)return {n:0,mean:null,bootstrap95CI:null};
  const mean=values.reduce((sum,value)=>sum+value,0)/values.length;
  return {n:values.length,mean:Number(mean.toFixed(3)),bootstrap95CI:bootstrapMeanInterval(values,seed)};
}

function summarizeVersion(rows,version){
  const selected=rows.filter(row=>row.version===version),eligible=selected.filter(row=>row.continued_at_15m==='yes'||row.continued_at_15m==='no');
  const continued=eligible.filter(row=>row.continued_at_15m==='yes').length;
  const countValues=key=>({
    ...Object.fromEntries([...new Set(selected.map(row=>row[key]).filter(Boolean))].sort().map(value=>[value,selected.filter(row=>row[key]===value).length])),
    missing:selected.filter(row=>!row[key]).length
  });
  const intervalEntries=selected.flatMap(row=>(row.decision_intervals||'').split(';').map(value=>value.trim()).filter(Boolean));
  const intervalSeconds=intervalEntries.map(entry=>{
    const match=entry.match(/(?:^|\s)(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\s|$)/);
    if(!match)return null;
    return (Number(match[1]||0)*3600)+(Number(match[2])*60)+Number(match[3]);
  }).filter(value=>value!==null).sort((a,b)=>a-b);
  const strategyEntries=selected.flatMap(row=>(row.build_or_strategy_changes||'').split(';').map(value=>value.trim()).filter(Boolean));
  const ratings=Object.fromEntries(RATINGS.map((key,index)=>[key,summarizeMetric(selected,key,52052+index+(version==='redesign'?100:0))]));
  return {
    records:selected.length,
    continuedAt15Minutes:{yes:continued,no:eligible.length-continued,notReached:selected.filter(row=>row.continued_at_15m==='not_reached').length,missing:selected.filter(row=>!row.continued_at_15m).length,
      eligibleN:eligible.length,proportion:eligible.length?Number((continued/eligible.length).toFixed(4)):null,wilson95CI:wilson(continued,eligible.length)},
    stopBlocks:countValues('stop_block'),stopReasons:countValues('stop_reason'),returnIntention:countValues('return_intention'),
    unpromptedRetries:countValues('unprompted_retry'),lossExplanations:{recordsWithEntry:selected.filter(row=>Boolean(row.loss_explanation?.trim())).length,
      missing:selected.filter(row=>!row.loss_explanation?.trim()).length},differentBuildOrMap:countValues('wants_different_build_or_map'),ratings,
    decisionIntervals:{recordsWithEntries:selected.filter(row=>Boolean(row.decision_intervals?.trim())).length,entries:intervalEntries.length,
      parsedTimeCount:intervalSeconds.length,medianElapsedSeconds:intervalSeconds.length?quantile(intervalSeconds,.5):null},
    buildOrStrategyChanges:{recordsWithEntries:selected.filter(row=>Boolean(row.build_or_strategy_changes?.trim())).length,entries:strategyEntries.length}
  };
}

export function analyzeEngagementRows(sourceRows,{design='independent'}={}){
  if(!['independent','paired'].includes(design))throw new Error('Design must be independent or paired.');
  const rows=normalizeRows(sourceRows);
  const codesByVersion=Object.fromEntries(VERSIONS.map(version=>[version,new Set(rows.filter(row=>row.version===version).map(row=>row.participant_code))]));
  const overlap=[...codesByVersion.baseline].filter(code=>codesByVersion.redesign.has(code));
  if(design==='paired'&&overlap.length===0)throw new Error('Paired design requires participant codes represented in both versions.');
  if(design==='independent'&&overlap.length)throw new Error('Independent design requires distinct participant codes across versions.');
  const versions=Object.fromEntries(VERSIONS.map(version=>[version,summarizeVersion(rows,version)]));
  const comparisons={};
  for(const metric of ['continued_at_15m',...RATINGS]){
    let pairs=[];
    if(design==='paired'){
      const lookup=new Map(rows.map(row=>[`${row.participant_code}\u0000${row.version}`,row]));
      pairs=overlap.map(code=>[lookup.get(`${code}\u0000baseline`),lookup.get(`${code}\u0000redesign`)])
        .map(([baseline,redesign])=>[numericMetric(baseline,metric),numericMetric(redesign,metric)])
        .filter(([baseline,redesign])=>baseline!==null&&redesign!==null)
        .map(([baseline,redesign])=>redesign-baseline);
    }else{
      const baseline=rows.filter(row=>row.version==='baseline').map(row=>numericMetric(row,metric)).filter(value=>value!==null);
      const redesign=rows.filter(row=>row.version==='redesign').map(row=>numericMetric(row,metric)).filter(value=>value!==null);
      const baselineMean=baseline.length?baseline.reduce((a,b)=>a+b,0)/baseline.length:null;
      const redesignMean=redesign.length?redesign.reduce((a,b)=>a+b,0)/redesign.length:null;
      comparisons[metric]={baselineN:baseline.length,redesignN:redesign.length,
        meanDifferenceRedesignMinusBaseline:baselineMean===null||redesignMean===null?null:Number((redesignMean-baselineMean).toFixed(3)),
        bootstrap95CI:bootstrapIndependentDifference(baseline,redesign,52626+metric.length),
        baselineMean95CI:bootstrapMeanInterval(baseline,52627+metric.length),redesignMean95CI:bootstrapMeanInterval(redesign,52628+metric.length)};
      continue;
    }
    comparisons[metric]={pairedN:pairs.length,meanDifferenceRedesignMinusBaseline:pairs.length?Number((pairs.reduce((a,b)=>a+b,0)/pairs.length).toFixed(3)):null,
      bootstrap95CI:bootstrapMeanInterval(pairs,52525+metric.length)};
  }
  return {schemaVersion:1,design,records:rows.length,participants:{baseline:codesByVersion.baseline.size,redesign:codesByVersion.redesign.size,
    shared:design==='paired'?overlap.length:0},versions,comparisons,
    method:{continuationCI:'Wilson score 95% interval among participants reaching the minute-15 decision; not_reached is excluded and reported separately.',
      pairedCI:'Deterministic percentile bootstrap 95% interval over paired redesign-minus-baseline differences; descriptive at small sample sizes.',
      ratingCI:'Deterministic percentile bootstrap 95% interval over the mean rating; descriptive, not a significance test.',
      missingness:'Blank and not_reached responses are reported separately; they are not counted as a decision to stop.'},
    privacy:'Output contains aggregate counts and ratings only; participant codes and verbatim notes are not copied into the report.'};
}
