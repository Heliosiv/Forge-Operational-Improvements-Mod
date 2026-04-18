import fs from 'fs';
const files = ['curr-march.cpuprofile','curr-downtime.cpuprofile','curr-settings-ui.cpuprofile'];
for (const file of files) {
  if (!fs.existsSync(file)) { console.log(`FILE\t${file}\tmissing`); continue; }
  const data = JSON.parse(fs.readFileSync(file,'utf8'));
  const nodes = new Map(data.nodes.map(n => [n.id, n]));
  const counts = new Map();
  for (const id of data.samples || []) counts.set(id, (counts.get(id)||0)+1);
  const top = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([id,c])=>{
    const n = nodes.get(id) || {};
    const cf = n.callFrame || {};
    return `${c}\t${cf.functionName||'(anon)'}\t${cf.url||''}:${cf.lineNumber||0}`;
  });
  console.log('FILE\t'+file);
  console.log(top.join('\n'));
}
