/* Shared geographic sampler from fact/relation feed.js. */
  function sampleGeo(list,cap,priority=new Set()) {
    const chosen=[],ids=new Set(),buckets=new Map();
    const add=o=>{if(chosen.length<cap&&!ids.has(o.id)){chosen.push(o);ids.add(o.id);}};
    list.filter(o=>priority.has(o.id)||o.priority==='high').forEach(add);
    list.forEach(o=>{const key=Number.isFinite(o.lng)?[Math.floor((o.lng+180)/25),Math.floor((o.lat+90)/15)].join('|'):'none';if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);});
    for(let i=0;chosen.length<cap&&i<list.length;i++){let found=false;for(const bucket of buckets.values())if(bucket[i]){found=true;add(bucket[i]);}if(!found)break;}
    return chosen;
  }
window.V03Feed={sampleGeo};
