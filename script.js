// Union Jack Events - logica formularului public
// Datele de conectare sunt citite din config.js.

// Conectare la Supabase si variabilele folosite in pagina
const cfg=window.UNION_JACK_CONFIG||{
}
,connected=!!(cfg.supabaseUrl&&cfg.supabaseAnonKey),db=connected?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
let unavailable=new Set(),catalogPackages=[],catalogServices=[];
const $=id=>document.getElementById(id);
$('year').textContent=new Date().getFullYear();
$('date').min=new Date().toLocaleDateString('en-CA');
// Selecteaza pachetul din butoanele de prezentare
function setPackage(p){
    const option=[...$('pkg').options].find(o=>o.value===p||o.textContent===p);
    if(option)$('pkg').value=option.value;
    update()
}
// Actualizeaza rezumatul, totalul si disponibilitatea datei
function update(){
    const date=$('date').value;
    const selected=[...document.querySelectorAll('#services input:checked')].map(e=>e.value);
    $('summary').innerHTML=`<p>Pachet: ${escapeHtml(catalogPackages.find(p=>p.id===$('pkg').value)?.name||'Oferta personalizata')}<br>Data: ${date||'Neselectata'}<br>Invitati: ${escapeHtml($('guests').value||'Nespecificat')}<br>Servicii: ${selected.length?selected.map(escapeHtml).join(', '):'De stabilit'}</p>`;
    const chosen=catalogPackages.find(p=>p.id===$('pkg').value);
    const guestCount=Math.max(0,Number($('guests').value)||0);
    const serviceTotal=[...document.querySelectorAll('#services input:checked')].reduce((sum,e)=>sum+(Number(e.dataset.price)||0),0);
    const rate=chosen?.base_price;
    const display=rate!=null&&Number.isFinite(Number(rate))?new Intl.NumberFormat('ro-RO',{
        style:'currency',currency:'RON'
    }
    ).format(guestCount*Number(rate)+serviceTotal):'La cerere';
    $('priceEstimate').textContent='Total estimativ: '+display;
    const status=$('availability');
    $('send').disabled=!date||unavailable.has(date)||!$('pkg').value;
    if(date){
        const blocked=unavailable.has(date);
        status.className=blocked?'status warn':'status ok';
        status.textContent=blocked?'Data este deja rezervata. Alege alta data.':connected?'Nu exista rezervare confirmata pentru aceasta data. Aprobarea este necesara.':'Disponibilitatea reala necesita configurarea Supabase.'
    }
    else{
        status.className='status';
        status.textContent='Selecteaza o data pentru a solicita verificarea disponibilitatii.'
    }
}
// Protejeaza textul afisat in HTML
function escapeHtml(s){
    return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}document.querySelectorAll('input,select,textarea').forEach(el=>el.addEventListener('input',update));// Verifica datele deja confirmate prin functia Supabase unavailable_dates
async function checkAvailability(){if(!db)return false;const d=$('date').value;if(!d)return false;const {data,error}=await db.rpc('unavailable_dates',{p_start:d,p_end:d});if(error){$('availability').className='status warn';$('availability').textContent='Nu am putut verifica disponibilitatea. Incearca din nou.';return false}unavailable=new Set((data||[]).map(x=>x.event_date));update();return true}
$('date').addEventListener('change',checkAvailability);
// Trimite cererea de rezervare prin functia Supabase create_booking
$('send').onclick=async()=>{if(!$('date').value||!$('name').value.trim()||!$('phone').value.trim()||!$('email').value.trim()){alert('Completeaza data, numele, emailul si telefonul.');return}if(!connected){alert('Conexiunea Supabase lipseste.');return}if(!$('pkg').value){alert('Selecteaza un pachet pentru a continua.');return}if(Number($('guests').value)<1||!Number.isInteger(Number($('guests').value))){alert('Introdu un numar valid de invitati.');return}if($('date').value<$('date').min){alert('Alege o data viitoare.');return}const btn=$('send');btn.disabled=true;btn.textContent='Se trimite...';try{const checked=await checkAvailability();if(!checked)throw new Error('Nu am putut verifica data.');if(unavailable.has($('date').value))throw new Error('Data este deja ocupata.');const selected=[...document.querySelectorAll('#services input:checked')].map(e=>e.value);const note=[`Pachet solicitat: ${catalogPackages.find(p=>p.id===$('pkg').value)?.name||'Oferta personalizata'}`,`Servicii: ${selected.join(', ')||'Nespecificate'}`,$('notes').value.trim()].filter(Boolean).join('\n');const {error}=await db.rpc('create_booking',{p_name:$('name').value.trim(),p_email:$('email').value.trim(),p_phone:$('phone').value.trim(),p_date:$('date').value,p_type:eventTypes.find(t=>t.id===$('kind').value)?.name||'Alt eveniment',p_guests:Number($('guests').value),p_package_id:catalogPackages.some(p=>p.id===$('pkg').value)?$('pkg').value:null,p_notes:note});if(error)throw error;alert('Cererea a fost trimisa. Administratorul te va contacta dupa verificare.');$('name').value='';$('email').value='';$('phone').value='';$('notes').value='';update()}catch(e){alert('Cererea nu a fost salvata: '+e.message)}finally{btn.disabled=false;btn.textContent='Trimite cererea de rezervare'}};update();

let eventTypes=[],includedLinks=[],availableLinks=[];
// Incarca tipurile de evenimente, pachetele si serviciile din Supabase
async function loadCatalog(){
 if(!db)return;
 const results=await Promise.all([db.from('event_types').select('id,name').order('name'),db.from('packages').select('id,name,description,base_price,event_type_id').eq('active',true).order('name'),db.from('services').select('id,name,description,price').eq('active',true).order('name'),db.from('package_services').select('package_id,service_id'),db.from('event_type_services').select('event_type_id,service_id')]);
 if(results.some(x=>x.error)){console.error('Catalog Supabase',results.map(x=>x.error));$('services').textContent='Catalogul nu a putut fi incarcat.';return}
 [eventTypes,catalogPackages,catalogServices,includedLinks,availableLinks]=results.map(x=>x.data||[]);
 const kinds=$('kind');kinds.replaceChildren();for(const t of eventTypes){const opt=document.createElement('option');opt.value=t.id;opt.textContent=t.name;kinds.append(opt)}
 kinds.addEventListener('change',renderOffers);$('pkg').addEventListener('change',renderOffers);renderOffers();
}
// Afiseaza pachetele si serviciile pentru tipul de eveniment ales
function renderOffers(){
 const kind=$('kind').value,select=$('pkg'),previous=select.value;
 const matching=catalogPackages.filter(p=>p.event_type_id===kind);select.replaceChildren();
 const fallback=document.createElement('option');fallback.value='';fallback.textContent='Solicita oferta personalizata';select.append(fallback);
 for(const p of matching){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;select.append(option)}
 if(matching.some(p=>p.id===previous))select.value=previous;else if(matching.length)select.value=matching[0].id;
 const pkg=select.value, included=new Set(includedLinks.filter(x=>x.package_id===pkg).map(x=>x.service_id));
 const available=new Set(availableLinks.filter(x=>x.event_type_id===kind).map(x=>x.service_id));
 const holder=$('services');holder.replaceChildren();
 for(const s of catalogServices.filter(s=>available.has(s.id)||included.has(s.id))){
 const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=s.name;input.dataset.serviceId=s.id;
 if(included.has(s.id)){input.checked=true;input.disabled=true;input.dataset.price='0'}else input.dataset.price=s.price??'0';
 input.addEventListener('change',update);
 label.append(input,document.createTextNode(' '+s.name+(included.has(s.id)?' (inclus)':s.price==null?' (pret la cerere)':' (+'+Number(s.price).toLocaleString('ro-RO')+' RON)')));holder.append(label)
 }
 if(!holder.children.length)holder.textContent='Nu sunt servicii disponibile pentru aceasta categorie.';
 update();
}
// Porneste incarcarea catalogului la deschiderea paginii
loadCatalog();
