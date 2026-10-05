const sb=supabase.createClient(CFG.url,CFG.key),V=document.getElementById('view'),T=document.getElementById('title'),N=document.getElementById('nav');
let ME=null,UN=[],TP=[],ORG={},E={};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fd=f=>Object.fromEntries(new FormData(f)),isHO=()=>ME?.role=='ho',U=id=>UN.find(x=>x.id==id);
const inp=(l,n,v='',t='text')=>`<label>${l}<input type="${t}" name="${n}" value="${esc(v)}"></label>`;
const R=(b,t)=>{V.innerHTML=b;T.textContent=t};
const log=(a,d)=>sb.from('audit_logs').insert({user_id:ME.id,username:ME.username,action:a,description:d});
const email=u=>u.trim().toLowerCase()+'@swastikmicrofinance.com';

async function boot(){const{data:{session}}=await sb.auth.getSession();if(!session){const{data:h,error:he}=await sb.rpc('has_ho');if(he)return loginView('Database not ready - run schema.sql in Supabase. ('+he.message+')');return h?loginView():setupView()}
 const{data:p}=await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle();
 if(!p||!p.active){await sb.auth.signOut();return loginView('Account inactive or not set up')}
 ME=p;await refresh();nav();route()}
async function refresh(){const[u,t,o]=await Promise.all([sb.from('units').select('*').order('id'),sb.from('templates').select('*').order('id'),sb.from('settings').select('value').eq('key','org').maybeSingle()]);UN=u.data||[];TP=t.data||[];ORG=o.data?.value||{}}
function loginView(m=''){N.innerHTML='';R(`<form class="login" onsubmit="login(event)"><h2>Swastik Letter System</h2>${inp('User ID','u')}${inp('Password','p','','password')}<span style="color:#b00020">${m}</span><button>Login</button></form>`,'')}
async function login(e){e.preventDefault();const d=fd(e.target),{error}=await sb.auth.signInWithPassword({email:email(d.u),password:d.p});if(error)return loginView(error.message+(/invalid login/i.test(error.message)?' - check User ID and password':''));location.hash='';await boot();log('Login','')}
async function logout(){await log('Logout','');await sb.auth.signOut();ME=null;loginView()}
function setupView(){N.innerHTML='';R(`<form class="login" onsubmit="setupHO(event)"><h2>First-time setup</h2><div class="note">Create the Head Office admin. Do this now - the first account created becomes Head Office.</div>${inp('Admin User ID (e.g. admin)','u','admin')}${inp('Your name','n')}${inp('Password (min 6)','p','','password')}<button>Create Head Office admin</button></form>`,'')}
async function setupHO(e){e.preventDefault();const d=fd(e.target);if(d.p.length<6||!/^[a-z0-9._-]+$/i.test(d.u))return alert('ID: letters/numbers only. Password min 6.');
 const{data,error}=await sb.auth.signUp({email:email(d.u),password:d.p});if(error)return alert(error.message);
 if(!data.session)return alert('Account created but not logged in. In Supabase > Authentication > Providers > Email turn OFF "Confirm email", delete this user in Authentication > Users, then try again.');
 const r=await sb.rpc('bootstrap_ho',{p_username:d.u,p_name:d.n});if(r.error)return alert(r.error.message);await boot()}
function nav(){const l=isHO()?[['dash','Dashboard'],['gen','Generate Letter'],['hist','Report History'],['units','Branches & Branding'],['users','Branch Logins'],['templates','Templates'],['settings','Settings'],['audit','Audit Log']]:[['gen','Generate Letter'],['hist','Report History'],...(U(ME.unit_id)?.can_edit?[['brand','My Branding']]:[])];
 N.innerHTML=`<h2>Swastik RMS</h2>`+l.map(x=>`<a href="#${x[0]}">${x[1]}</a>`).join('')+`<a href="#" onclick="logout();return false">Logout (${esc(ME.username)})</a>`}

function letter(r){const u=U(r.unit_id)||{},t=TP.find(x=>x.id==r.template_id)||{fields:[],body:''},F=Object.fromEntries(t.fields.map(f=>[f.name,f]));
 const sub=k=>{const f=F[k],x=r.data[k]??'';if(f?.type=='table'){const h=(f.cols||[]).map(c=>`<th>${esc(c)}</th>`).join('');return `<table class="tb"><tr>${h}</tr>${x.split('\n').filter(Boolean).map(l=>'<tr>'+l.split('|').map(c=>`<td>${esc(c.trim())}</td>`).join('')+'</tr>').join('')}</table>`}return esc(x).replace(/\n/g,'<br>')};
 const ln=l=>esc(l).replace(/\{\{(\w+)\}\}/g,(_,k)=>sub(k)).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
 const body=t.body.split('\n').map(l=>l.includes(' || ')?`<div class="row">${l.split(' || ').map(p=>`<span>${ln(p)}</span>`).join('')}</div>`:`<div>${ln(l)||'&nbsp;'}</div>`).join('');
 return `<div class="a4">${u.bg?`<div class="wm" style="background-image:url(${u.bg});opacity:${u.bg_op}"></div>`:''}${u.bg_text?`<div class="wmt">${esc(u.bg_text)}</div>`:''}
 <div class="top"><span>${esc(u.reg)}</span><span>${esc(u.lic)}</span></div><div class="brand">${u.logo?`<img src="${u.logo}">`:''}<div><div class="h1">${esc(u.h1||ORG.h1)}</div><div class="h2">${esc(u.h2||ORG.h2)}</div><div class="h3">${esc(u.h3||ORG.h3)}</div></div></div>
 <div class="rule"></div><div class="title">${esc(u.title)}</div>${body}<div class="ft">${esc(u.footer)}</div></div>`}

const views={
async dash(){const[a,b]=await Promise.all([sb.from('reports').select('id,created_at,status'),sb.from('reports').select('*').order('id',{ascending:false}).limit(8)]),d=new Date().toISOString().slice(0,10),r=a.data||[];
 R(`<div class="f"><div>Branches<h2>${UN.filter(x=>!x.is_ho).length}</h2></div><div>Templates<h2>${TP.length}</h2></div><div>Reports today<h2>${r.filter(x=>x.created_at.slice(0,10)==d).length}</h2></div><div>Drafts<h2>${r.filter(x=>x.status=='draft').length}</h2></div></div><h3>Recent</h3>${tbl(b.data||[])}`,'Dashboard')},
units(id){if(id)return unitForm(id);R(`<div class="bar"><a class="btn" href="#units/new">+ Add Branch</a></div><table><tr><th>Code<th>Name<th>Office title<th>Logo<th>BG<th></tr>${UN.map(u=>`<tr><td>${esc(u.code)}<td>${esc(u.name)}<td>${esc(u.title)}<td>${u.logo?'✔':'-'}<td>${u.bg?'✔':'-'}<td><a href="#units/${u.id}">Edit</a>`).join('')}</table>`,'Branches & Branding')},
brand(){unitForm(ME.unit_id)},
async users(){const{data}=await sb.from('profiles').select('*').order('username');
 R(`<form class="f" onsubmit="addUser(event)">${inp('Branch User ID (e.g. bardibas)','username')}${inp('Full name','full_name')}${inp('Password (min 6)','password','','text')}<label>Branch<select name="unit_id">${UN.filter(x=>!x.is_ho).map(u=>`<option value="${u.id}">${esc(u.name)}</option>`)}</select></label><button>Create Branch Login</button></form>
 <table><tr><th>ID<th>Name<th>Role<th>Branch<th>Active<th></tr>${(data||[]).map(p=>`<tr><td>${esc(p.username)}<td>${esc(p.full_name)}<td>${p.role}<td>${esc(U(p.unit_id)?.name||'')}<td>${p.active?'Yes':'No'}<td>${p.id==ME.id?'':`<a href="#" onclick="setActive('${p.id}',${!p.active});return false">${p.active?'Deactivate':'Activate'}</a>`}`).join('')}</table>`,'Branch Logins')},
templates(id){const t=TP.find(x=>x.id==id)||{};R(`<form class="f" onsubmit="saveTpl(event,${t.id||0})">${inp('Code','code',t.code)}${inp('Name','name',t.name)}
 <label>Visible to<select name="scope"><option value="both">Branches + Head Office</option><option value="ho" ${t.scope=='ho'?'selected':''}>Head Office only</option></select></label><label>Status<select name="status"><option>active</option><option ${t.status=='inactive'?'selected':''}>inactive</option></select></label>
 <label class="wide">Fields JSON (types: text, textarea, date, number, table with "cols":[..])<textarea name="fields" rows="7">${esc(JSON.stringify(t.fields||[],null,1))}</textarea></label>
 <label class="wide">Body. {{field}} inserts values; "left || right" = two-sided line; **bold**<textarea name="body" rows="14">${esc(t.body||'')}</textarea></label><button>Save</button></form>
 <table><tr><th>Code<th>Name<th>Scope<th></tr>${TP.map(x=>`<tr><td>${esc(x.code)}<td>${esc(x.name)}<td>${x.scope}<td><a href="#templates/${x.id}">Edit</a>`).join('')}</table>`,'Templates')},
gen(){const q=new URLSearchParams(location.hash.split('?')[1]||''),u=U(isHO()?q.get('u'):ME.unit_id),ts=TP.filter(t=>t.status=='active'&&(u?.is_ho||t.scope!='ho')),t=ts.find(x=>x.id==q.get('t'));
 const sel=(n,a,c,l)=>`<label>${l}<select onchange="pick('${n}',this.value)"><option value="">-- select --</option>${a.map(x=>`<option value="${x.id}" ${x.id==c?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`;
 const f=t&&u?`<form class="f" onsubmit="saveRep(event,${t.id},${u.id})">${t.fields.map(x=>x.type=='textarea'||x.type=='table'?`<label class="wide">${esc(x.label)}<textarea name="${x.name}" rows="${x.type=='table'?5:4}"></textarea></label>`:inp(esc(x.label),x.name,'',x.type||'text')).join('')}<div class="bar wide"><button name="st" value="draft">Save Draft</button><button name="st" value="final">Generate Final</button></div></form>`:'';
 R(`<div class="f">${isHO()?sel('u',UN,u?.id,'Office / Branch'):`<label>Branch<input disabled value="${esc(u?.name)}"></label>`}${sel('t',ts,t?.id,'Template')}</div>${f}`,'Generate Letter')},
async hist(){const s=(document.getElementById('q')?.value||'').toLowerCase(),{data}=await sb.from('reports').select('*').order('id',{ascending:false}).limit(500);window._rows=data||[];
 R(`<div class="bar"><input id="q" placeholder="Search report no / branch" oninput="histF()" value="${esc(s)}"><button onclick="csv()">Export CSV</button></div><div id="tb"></div>`,'Report History');histF()},
async view(id){const{data:r}=await sb.from('reports').select('*').eq('id',id).maybeSingle();if(!r)return location.hash='hist';
 R(`<div class="bar noprint"><button onclick="print();log('Print','${r.no}')">Print / Save as PDF</button>${['draft','final','cancelled'].map(s=>`<button class="g" onclick="setSt(${r.id},'${s}')">${s}</button>`).join('')}<a class="btn g" href="#hist">Back</a></div>${letter(r)}`,r.no+' ('+r.status+')')},
settings(){R(`<form class="f" onsubmit="saveOrg(event)">${inp('Default header line 1 (Nepali)','h1',ORG.h1)}${inp('Default header line 2 (English)','h2',ORG.h2)}${inp('Default header line 3','h3',ORG.h3)}<button>Save</button></form><p class="note">To change your own password: Supabase dashboard > Authentication > Users.</p>`,'Settings')},
async audit(){const{data}=await sb.from('audit_logs').select('*').order('id',{ascending:false}).limit(200);R(`<table><tr><th>Date<th>User<th>Action<th>Description</tr>${(data||[]).map(a=>`<tr><td>${new Date(a.created_at).toLocaleString()}<td>${esc(a.username)}<td>${esc(a.action)}<td>${esc(a.description)}`).join('')}</table>`,'Audit Log')}};

function unitForm(id){const isNew=id=='new',u=isNew?{bg_op:.08}:{...U(id)};E={logo:u.logo||'',bg:u.bg||''};
 const ff=[['code','Branch code'],['name','Branch name'],['title','Office title'],['reg','Top-left text (reg. no.)'],['lic','Top-right text (license no.)'],['h1','Header line 1 (blank = default)'],['h2','Header line 2'],['h3','Header line 3 (small)'],['footer','Footer text'],['bg_text','Background text (optional)']];
 R(`<form class="f" onsubmit="saveUnit(event,'${id}')">${ff.filter(x=>isHO()||!['code','name'].includes(x[0])).map(x=>inp(x[1],x[0],u[x[0]])).join('')}
 <label>Logo<input type="file" accept="image/*" onchange="img(this,'logo',300)"><img class="pv" id="p_logo" src="${u.logo||''}"></label>
 <label>Background image<input type="file" accept="image/*" onchange="img(this,'bg',700)"><img class="pv" id="p_bg" src="${u.bg||''}"></label>
 <label>Background visibility (0-0.3)<input type="number" step="0.01" min="0" max="0.3" name="bg_op" value="${u.bg_op}"></label>
 ${isHO()&&!u.is_ho?`<label><span><input type="checkbox" name="can_edit" ${u.can_edit?'checked':''}> Branch may edit own branding</span></label>`:''}<button>Save</button></form>`,'Branch Branding')}
function img(el,k,max){const f=el.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const s=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*s;c.height=i.height*s;c.getContext('2d').drawImage(i,0,0,c.width,c.height);E[k]=c.toDataURL(k=='bg'?'image/jpeg':'image/png',.8);document.getElementById('p_'+k).src=E[k]};i.src=r.result};r.readAsDataURL(f)}
async function saveUnit(e,id){e.preventDefault();const d={...fd(e.target),...E};d.can_edit=!!d.can_edit;d.bg_op=+d.bg_op||0;
 if(!isHO()){delete d.can_edit}let r;
 if(id=='new'){if(!d.code||!d.name)return alert('Code and name required');r=await sb.from('units').insert(d)}else r=await sb.from('units').update(d).eq('id',id);
 if(r.error)return alert(r.error.message);log('Unit save',d.name||id);await refresh();location.hash=isHO()?'units':'gen'}
async function addUser(e){e.preventDefault();const d=fd(e.target);if(d.password.length<6||!/^[a-z0-9._-]+$/i.test(d.username))return alert('ID: letters/numbers only. Password min 6 chars.');
 const tmp=supabase.createClient(CFG.url,CFG.key,{auth:{persistSession:false,autoRefreshToken:false,storageKey:'tmp'}}),{data,error}=await tmp.auth.signUp({email:email(d.username),password:d.password});
 if(error||!data.user)return alert(error?.message||'Could not create user (is "Confirm email" turned off?)');
 const r=await sb.from('profiles').insert({id:data.user.id,username:d.username.toLowerCase(),full_name:d.full_name,role:'branch',unit_id:+d.unit_id});
 if(r.error)return alert(r.error.message);log('Create user',d.username);alert('Login created. Give ID + password to the branch.');route()}
async function setActive(id,v){await sb.from('profiles').update({active:v}).eq('id',id);log('User active',id+' '+v);route()}
function tbl(a){return `<table><tr><th>Report No<th>Branch<th>Date<th>Status<th></tr>${a.map(r=>`<tr><td>${esc(r.no)}<td>${esc(U(r.unit_id)?.name)}<td>${r.created_at.slice(0,10)}<td><span class="tag ${r.status}">${r.status}</span><td><a href="#view/${r.id}">View / Print</a> | <a href="#" onclick="del(${r.id});return false">Delete</a>`).join('')||'<tr><td colspan="5">No reports</td></tr>'}</table>`}
function histF(){const s=document.getElementById('q').value.toLowerCase();document.getElementById('tb').innerHTML=tbl(window._rows.filter(r=>(r.no+(U(r.unit_id)?.name||'')).toLowerCase().includes(s)))}
async function saveTpl(e,id){e.preventDefault();const d=fd(e.target);try{d.fields=JSON.parse(d.fields);if(!Array.isArray(d.fields))throw 0}catch{return alert('Fields JSON invalid')}
 const r=id?await sb.from('templates').update(d).eq('id',id):await sb.from('templates').insert(d);if(r.error)return alert(r.error.message);log('Template save',d.code);await refresh();location.hash='templates'}
async function saveRep(e,tid,uid){e.preventDefault();const d=fd(e.target),st=e.submitter.value;delete d.st;
 const{data,error}=await sb.from('reports').insert({unit_id:uid,template_id:tid,data:d,status:st}).select().single();if(error)return alert(error.message);log('Create report',data.no);location.hash='view/'+data.id}
async function setSt(id,s){await sb.from('reports').update({status:s}).eq('id',id);log('Status',id+' '+s);route()}
async function del(id){if(!confirm('Delete?'))return;const{error}=await sb.from('reports').delete().eq('id',id);if(error)alert(error.message);log('Delete report',id);route()}
function pick(n,v){const q=new URLSearchParams(location.hash.split('?')[1]||'');q.set(n,v);location.hash='gen?'+q}
async function saveOrg(e){e.preventDefault();const r=await sb.from('settings').upsert({key:'org',value:fd(e.target)});if(r.error)return alert(r.error.message);log('Settings','org header');await refresh();alert('Saved')}
function csv(){const rows=[['Report No','Branch','Date','Status'],...window._rows.map(r=>[r.no,U(r.unit_id)?.name,r.created_at.slice(0,10),r.status])],a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(r=>r.map(c=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'}));a.download='reports.csv';a.click()}
function route(){if(!ME)return;const[p,id]=location.hash.slice(1).split('?')[0].split('/'),hoOnly=['dash','units','users','templates','settings','audit'];let k=views[p]?p:(isHO()?'dash':'gen');
 if((!isHO()&&hoOnly.includes(k))||(k=='brand'&&(isHO()||!U(ME.unit_id)?.can_edit)))k='gen';if(k=='units'&&!isHO())k='gen';
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')=='#'+k));views[k](id)}
addEventListener('hashchange',route);
if(CFG.url.includes('YOUR-')||CFG.key.includes('YOUR-'))R('<div class="login"><h2>Not configured</h2><div class="note">Open <b>config.js</b> and paste your Supabase Project URL and anon public key, then upload it to GitHub again.</div></div>','');else boot();
