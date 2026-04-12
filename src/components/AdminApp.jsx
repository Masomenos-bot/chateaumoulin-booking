import { useState, useMemo, useRef, useEffect } from "react";
import { useBookings } from "../hooks/useBookings";

const ROOMS=[{id:"r1"},{id:"r2"},{id:"r3"},{id:"r4"},{id:"r5"}];
const TIERS=[{label:"Tier 1",dl:"2026-05-15"},{label:"Tier 2",dl:"2026-07-01"},{label:"Tier 3",dl:null}];
const RATES=[{"1-2":200,"3-5":185,"6+":170},{"1-2":270,"3-5":265,"6+":255},{"1-2":320,"3-5":305,"6+":290}];
const MS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const SS="2026-06-15",SE="2026-09-15";
const H="'Helvetica Neue',Helvetica,Arial,sans-serif",C="'Courier New',Courier,monospace";
const BG="#F5F3ED",FG="#000",MU="#999",BD="#e0dcd0";
const ROSE="#E91E7A",ROSE_BG="#E91E7A",RS="#FFFFFF";
const LAV="#A0522D",LAV_BG="#A0522D",LS="#FFFFFF";
const EYE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAYAAAA5ZDbSAAAJV0lEQVR42u2dbawcZRXHf7t7exFvvQ22BmigIgoBKrVafAkGA6KmAsGIiRqF+MlGo0aN+PZBI4ZAgkHE2KhEQ3wJVUPQqDEqYEg01RQFJSBVMUXTplJqA6UFyt3d8cOc454+nd15ZnbuvTO7559Mtnd3Xp45/+e8Pmem4HA4HA6Hw+FwOBwOh8PhcDgcDofD4XA4HA6Hw+FwOBwOh8PhcDgcDofD4XA4HA5HgNYU3Wcnct8E6PnUcLgG1+T+EmANcKH8rd+tBubMfn1gFbAHuAVoy3eOGmNGPq8WUmO2O+WYziQoz0zDtLEtJMRqViKfrxC/2jX3nAT79oTUJysYa220vwkEt2Xrlgh+enLsBiFPJ8moQKxTEbnzwEGjyclyCa/OUW9HhNWV798MrI8cu/5+MnDGEplNHe95wIPAVmP6OzhoZwjiJcAngB0iqJsirY+e5yKT+ozyvV35/HFJH6wT6lzggDnvNmBlA13iomIlcAVwO3DYCKsHbI/U4BnR2E/KsQuRBP9EyJ0pYXFWAg+b6+k5/wy8MnA5U5euzQCbgBuBRwPhW2E9DZwyguS2nGtW/t4WEJhH8A8DKzATQYhq+1fkHM8FY0+AZ4CPNsA9LlocsE78lxV4N+O7BHhnoKUd82+LOeAfkSa6J9d6QHz9/JBJ2A6uo3+fayZiP+Pc+u9fSdA3DXWI/99kSzTuIRHSMHOq339TSD0u43ynAVcB3wd2mbQqKbjtAW4DrgROHeICbNT90xxL0Te/PSu5eZES6kQUJL4kglgYoWUJ8Hdz7LwEUteKfz5cgsyQiFDbnwJ+I/58YwYpr5ZjehHnPyKf766ooNII6E1eXCDivUY0bM+Q37uRAk9yNC5LIx8CbgYukQn2vYKB3LZpItf6olXAY5Ekh2QM839VbEp2FoF7jVbGWIaDYvJb0xZN683+IjLqVV+9GITmbT25dpFJqPfz+aXU3nbNCG4Bf4gs7c0MiZyXaqwaUScRY+3LvnuBL7OEtep2DTX4gYalEK2IsfZlnxuBQ2ZiLFn0Woco+jn596YJcz2J3N8+4NtC9NR0jNg88CyTS44T/dZt08DsVrnPFdMWVAF8WHLNskWJMFLtBuXNMtFyVVG5Vsj+ZkqsE58e6Q2eYGrFyZiELKbW98a8hh53H/DCpYx/liOQmRFSziJdLVovf3cKjKcvWxhDHJE8+j/AbilCvCnifNrNcRvwA+BE4GzgHKlcnRTsWyaH1W6S7VJ560ZG4I0sSV5gChoLBTWhG5T9fgt8EdgMvDioT8+RtuDkmX4dw3syxrwKeKNEwLuCsRTVaL3OHUYerUkzyxdIqlDEJPeDfR8EPgOcOcK/d4DjgX9HBG7622YGixhZy4RzUkP+feBWivhpXUq8oWaZTCUB1dnAfwuSa/e7VwQ8G7gZXdlpB3npccC/IghWgs7L8I92OdLiCvGpZeIH1eT3TQLJ6q/WAI+UJPcxYEsQfeYtxCvRfyR/GU+X8E7LiU1aQawwK5bkcEF3oxbpWY7u9Gi0af5ZASH0jeDvIG0GsOdrRU4sGPRy5RH8pEzC2ODTTrYNEjyVmbw7SVt9igSZtSP3AxzbypLnD/vAx8eouqmw7s0RvF5vN/D8gtlFy4xrBWkjQhG/rJN9axPzY/WHp0oRI+amVdhPAZeZm26XdA2QLl7EEPywuU6rxETWYz6WYYViSL64aSTrQL8TabpU0PtJOyTGLeupv/xrzvX1+9huzRhtvlJSuF6BSb0TeB7H9nzVmtyXR1aAdLYfZLDYMC65iMB250TRSvA9FQU7Ou53FTDXqsWfakpUrQPcGhFY2R6oSyoqyNso99EcgnVst1doInX8W4jv6OyRrjidTNwS5LKmRQAvkJJhXhVJNejqisi1Y1jN4CmDfg7BX69Ye/Q+ri3oos6v0hcvRu6l53yD1HT7kbNx9SKMZVbMdAwOV3xtrTHvjKyFt4G7JBZoU+M1Y9WAGxjdAps1e99fkRbrJDudQUNcngZfU6EGq/atBR4nuxU3LHr0hlTSahtgXVYg8e8bP/QOI+jWmARvJH6h4SMVEdwxk3R7hA/W63+1SWmSCvieEiQnpA0ANtUpK+QLIwSsY7uqAoL12DmpwOXdu47rEdKlzUakSJbgTWQ/YxRD8k3GVBfVZiX48ggh629vG0ODbA68lnQJMyZ70BTy/CZpbyjk6yhXiNfVo9cGGtIuoElbIq6t17q0hJBbgca/lcHqVd79atn2003JfYdVklYwWD8tsqTWNYK6mXQx31qIUWSrsL4QqUkJ8JoCBLcDQk5hUIeObdpPgO82ldzQVK+j3CMpdt8DpE3j5wwh1K4Jz8oEu6VAoWXjCIJbhlTrKk4EPhfk2r1Izb1LJn8jV5GyTPXrJdcs2uoSdnMcAX4NfBB4Wc617yZ+Ldg+VG4JzSJ8E+nD3o9TbMFfyb2PdOWqxYS07KgJ2jxEO8sQrWT/BfgW6dLipaKJ62Tbm5Mm9c15Tmf4W3Zm5Lyf5eh2nTJLg78Tza99vluW5MtJX8NQpk0277HOxGjkochzJVJStTgBeJUUXm4l7WnOIiw2M1Byf0naJzZx5IYkX2TM2wLjN7rbRvWixyfAE8D1pG2zOwLTO+xdIUX7yb5hrMNEPzaqJJ/J0f1SVTauxy62x5jVhZLuZMFYkw+ZYG0q3suhM/n4IL1Yrud9E6p7XMVq7f1B+jUtr28+xky9ncHbcJab6HGI7Zmg7XoGK1lT+wI0W2uel6rXoQYR3c9wLz83OfXE+9uiJhvJbb8WEN1l8d6/Mc7DaPa7uyUNZFpNchFtVqKvY/DoiSVbA5/+EmtqSOozwI8kK7Aa61qb45st0auA95Iuvz0xxPctGFM5TgTd59hnhLPOdT/pEw1njJigtdGaOhOt74lWrCVtBXoL8DpJtYYJ1RITI4dRa7H7hdQ7SV+I9qcM99Krq1lsguluZwixLQRvIH2+Zz3wUtKuxPmS2rRA+nDcLuCfpG+J3UH64rMDGfm8anythdc0P93O0ZjVsp1E+szPGsm3X0Ra4E/kPPvEhz4tpO6Xz32kT1YMsyhFLIMTPObYLeFV/n9H1mTbkmYjhTRpkXhYEoy5x8R8TtxrFRwOh8PhcDgcDofD4XA4HA6Hw+FwOBwOh8PhcDgcDofD4XA4HA6Hw+FwOBwOh8PhcDgcDofDUQP8D+L4eao5qsblAAAAAElFTkSuQmCC";

function dk(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function addD(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r}
function parseD(s){const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function daysIn(y,m){return new Date(y,m+1,0).getDate()}
function inS(k){return k>=SS&&k<SE}
function getTier(bd){for(let i=0;i<TIERS.length;i++){if(TIERS[i].dl&&bd<TIERS[i].dl)return i}return TIERS.length-1}
function getBucket(n){return n<=2?"1-2":n<=5?"3-5":"6+"}
function getPrice(bd,n){return RATES[getTier(bd)][getBucket(n)]}
function dn(k){return["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][parseD(k).getDay()]}

const TODAY=new Date(2026,3,10);

function useIsMobile(){
  const[m,setM]=useState(typeof window!=="undefined"&&window.innerWidth<768);
  useEffect(()=>{
    const h=()=>setM(window.innerWidth<768);
    window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);
  },[]);
  return m;
}

function sample(){return[
  {id:"b1",roomIds:["r1"],guest:"Marie Dupont",email:"marie@email.com",guests:2,ages:"32, 30",checkIn:"2026-06-20",checkOut:"2026-06-25",status:"confirmed",bookedOn:"2026-04-01",notes:""},
  {id:"b2",roomIds:["r2"],guest:"James Wheeler",email:"james@email.com",guests:2,ages:"28, 27",checkIn:"2026-06-18",checkOut:"2026-06-22",status:"confirmed",bookedOn:"2026-03-20",notes:""},
  {id:"b3",roomIds:["r3","r4"],guest:"Lucia Fernandez",email:"lucia@email.com",guests:4,ages:"35, 33, 10, 8",checkIn:"2026-06-25",checkOut:"2026-06-30",status:"prebooking",bookedOn:"2026-04-08",notes:"Arriving late ~22h"},
  {id:"b4",roomIds:["r1","r2"],guest:"Karim Bensaid",email:"karim@email.com",guests:3,ages:"40, 38, 12",checkIn:"2026-07-01",checkOut:"2026-07-06",status:"prebooking",bookedOn:"2026-04-05",notes:""},
  {id:"b5",roomIds:["r1","r2","r3","r4","r5"],guest:"Anna Schmidt",email:"anna@email.com",guests:8,ages:"45, 42, 15, 12, 10, 8, 4, 2",checkIn:"2026-07-10",checkOut:"2026-07-20",status:"prebooking",bookedOn:"2026-04-09",notes:"Full estate — young children"},
]}

const lbl={display:"block",fontSize:10,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:MU,marginBottom:4,fontFamily:C};
const inp={width:"100%",padding:"9px 10px",border:"1px solid #ccc",fontSize:13,fontFamily:C,background:"#FDFBF5",outline:"none",boxSizing:"border-box",color:FG};

function Modal({children,onClose,isMobile}){
  return(<div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center"}} onClick={onClose}>
    <div style={{background:BG,maxWidth:isMobile?"100%":500,width:isMobile?"100%":"92%",maxHeight:isMobile?"95vh":"90vh",overflowY:"auto",padding:isMobile?20:32,border:"1px solid #000",borderRadius:isMobile?"16px 16px 0 0":0}} onClick={e=>e.stopPropagation()}>{children}</div></div>);
}

function BForm({data,onSave,onCancel,onDelete,bookings,isMobile}){
  const[f,setF]=useState(data||{numRooms:1,guest:"",email:"",guests:1,ages:"",checkIn:"",checkOut:"",status:"prebooking",bookedOn:dk(TODAY),notes:""});
  const isE=!!f.id;const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const nR=f.numRooms||1;
  const nights=(f.checkIn&&f.checkOut)?Math.max(0,Math.round((parseD(f.checkOut)-parseD(f.checkIn))/86400000)):0;
  const ppn=nights>0&&f.bookedOn?getPrice(f.bookedOn,nights):0;
  const total=nights*ppn*nR;const ti=f.bookedOn?getTier(f.bookedOn):0;
  const mx=nR*2;const full=nR===5;
  const ages=f.ages?f.ages.split(",").map(a=>parseInt(a.trim())).filter(n=>!isNaN(n)):[];
  const u8=ages.some(a=>a<8);const nc=u8&&!full;
  function assign(n,ci,co,ex){
    return ROOMS.filter(r=>{for(let d=parseD(ci);d<parseD(co);d=addD(d,1)){const key=dk(d);for(const b of bookings){if(ex&&b.id===ex)continue;if(b.checkIn<=key&&b.checkOut>key&&b.roomIds.includes(r.id))return false}}return true}).slice(0,n).map(r=>r.id);
  }
  function save(){
    if(!f.guest||!f.checkIn||!f.checkOut||!inS(f.checkIn)||nc)return;
    const rids=assign(nR,f.checkIn,f.checkOut,isE?f.id:null);
    if(rids.length<nR){alert("Not enough rooms available");return}
    onSave({...f,roomIds:rids,guests:Math.min(f.guests||1,mx)});
  }
  const g=isMobile?"1fr 1fr":"1fr 1fr 1fr";
  return(<div>
    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",borderBottom:"1px solid #000",paddingBottom:10,marginBottom:20,fontFamily:C}}>{isE?"EDIT BOOKING":"NEW BOOKING"}</div>
    <div style={{display:"grid",gridTemplateColumns:g,gap:12,marginBottom:12}}>
      <div><label style={lbl}>Rooms</label><select style={{...inp,cursor:"pointer"}} value={nR} onChange={e=>set("numRooms",parseInt(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}{n===5?" (full)":""}</option>)}</select></div>
      <div><label style={lbl}>Status</label><select style={{...inp,cursor:"pointer"}} value={f.status} onChange={e=>set("status",e.target.value)}><option value="prebooking">Pre-booking</option><option value="confirmed">Confirmed</option><option value="blocked">Blocked</option></select></div>
      <div><label style={lbl}>Guests (max {mx})</label><input style={inp} type="number" min={1} max={mx} value={f.guests||1} onChange={e=>set("guests",Math.min(parseInt(e.target.value)||1,mx))} /></div>
    </div>
    <div style={{marginBottom:12}}><label style={lbl}>Guest name</label><input style={inp} value={f.guest} onChange={e=>set("guest",e.target.value)} placeholder="Full name" /></div>
    <div style={{marginBottom:12}}><label style={lbl}>Email</label><input style={inp} type="email" value={f.email} onChange={e=>set("email",e.target.value)} placeholder="guest@email.com" /></div>
    <div style={{marginBottom:12}}><label style={lbl}>Ages</label><input style={inp} value={f.ages} onChange={e=>set("ages",e.target.value)} placeholder="32, 30, 10" /></div>
    {nc&&(<div style={{padding:"10px 12px",background:"rgba(198,40,40,0.06)",borderLeft:"3px solid #C62828",fontSize:12,marginBottom:12,fontFamily:C,color:"#C62828"}}>Children under 8 — book full estate, or <a href="mailto:chateaumoulin@masomenos.fr" style={{color:"inherit",fontWeight:700,textDecoration:"underline"}}>contact us</a>.</div>)}
    <div style={{display:"grid",gridTemplateColumns:g,gap:12,marginBottom:12}}>
      <div><label style={lbl}>Check-in</label><input style={inp} type="date" value={f.checkIn} min="2026-06-15" max="2026-09-14" onChange={e=>set("checkIn",e.target.value)} /></div>
      <div><label style={lbl}>Check-out</label><input style={inp} type="date" value={f.checkOut} min="2026-06-16" max="2026-09-15" onChange={e=>set("checkOut",e.target.value)} /></div>
      <div><label style={lbl}>Booked on</label><input style={inp} type="date" value={f.bookedOn} onChange={e=>set("bookedOn",e.target.value)} /></div>
    </div>
    {nights>0&&(<div style={{padding:"10px 12px",background:"#000",color:BG,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:isMobile?11:12,marginBottom:12,fontFamily:C}}>
      <span>{nR}rm × {nights}n × €{ppn} — {TIERS[ti].label}</span><span style={{fontSize:16,fontWeight:700}}>€{total}</span></div>)}
    <div style={{marginBottom:16}}><label style={lbl}>Notes</label><textarea style={{...inp,minHeight:40,resize:"vertical"}} value={f.notes} onChange={e=>set("notes",e.target.value)} /></div>
    <div style={{display:"flex",justifyContent:"space-between"}}>
      <div>{isE&&onDelete&&(<button onClick={()=>onDelete(f.id)} style={{padding:"8px 14px",border:"1px solid #c00",background:"transparent",color:"#c00",cursor:"pointer",fontFamily:C,fontSize:11,fontWeight:700}}>DELETE</button>)}</div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onCancel} style={{padding:"8px 16px",border:"1px solid #ccc",background:"transparent",cursor:"pointer",fontFamily:C,fontSize:11}}>CANCEL</button>
        <button onClick={save} disabled={nc} style={{padding:"8px 20px",border:"1px solid #000",background:nc?"#999":"#000",color:BG,cursor:nc?"not-allowed":"pointer",fontFamily:C,fontSize:11,fontWeight:700,letterSpacing:"0.1em",opacity:nc?0.4:1}}>{isE?"UPDATE":"CREATE"}</button>
      </div>
    </div>
  </div>);
}

function DayPanel({dk:dKey,bookings,rooms,onClose,onEdit,isMobile}){
  const dayB=bookings.filter(b=>b.checkIn<=dKey&&b.checkOut>dKey);
  const arr=bookings.filter(b=>b.checkIn===dKey);
  const dep=bookings.filter(b=>b.checkOut===dKey);
  const occ=dayB.flatMap(b=>b.roomIds);const free=5-occ.length;
  const d=parseD(dKey);const label=dn(dKey)+", "+d.getDate()+" "+MS[d.getMonth()];
  const Itm=({b,accent})=>{
    const nights=Math.round((parseD(b.checkOut)-parseD(b.checkIn))/86400000);const isPre=b.status==="prebooking";
    return(<div onClick={()=>onEdit(b)} style={{padding:"6px 8px",marginBottom:3,borderLeft:`2px solid ${accent||(isPre?LAV:ROSE)}`,background:isPre?LAV_BG:ROSE_BG,cursor:"pointer"}}>
      <span style={{fontWeight:700,fontFamily:H,fontSize:11}}>{b.guest}</span>
      <span style={{color:MU,marginLeft:8,fontFamily:C,fontSize:9}}>{b.roomIds.length}rm · {b.guests}p · {nights}n · {isPre?"pre":"conf"}</span>
      {b.notes&&<div style={{fontSize:8,color:"#bbb",fontFamily:C}}>{b.notes}</div>}
    </div>);
  };
  return(<div style={{padding:isMobile?"12px 14px":"16px 20px",background:"#fff",border:"1px solid #000",marginBottom:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div style={{fontSize:isMobile?13:14,fontWeight:700,fontFamily:H}}>{label}</div>
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,fontFamily:H,color:FG}}>✕</button>
    </div>
    <div style={{display:"flex",gap:3,marginBottom:6}}>{rooms.map((r,i)=>{const o=occ.includes(r.id);return <div key={r.id} style={{flex:1,height:5,background:o?"#000":BD}} />})}</div>
    <div style={{fontSize:10,color:MU,fontFamily:C,marginBottom:10}}>{free} slot{free!==1?"s":""} free · {dayB.length} booking{dayB.length!==1?"s":""}</div>
    {arr.length>0&&(<div style={{marginBottom:8}}><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.15em",color:MU,fontFamily:C,marginBottom:4}}>ARRIVING</div>{arr.map(b=><Itm key={b.id} b={b} accent="#2E7D32" />)}</div>)}
    {dep.length>0&&(<div style={{marginBottom:8}}><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.15em",color:MU,fontFamily:C,marginBottom:4}}>DEPARTING</div>{dep.map(b=><Itm key={b.id} b={b} accent="#C62828" />)}</div>)}
    {dayB.length>0&&(<div><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.15em",color:MU,fontFamily:C,marginBottom:4}}>IN HOUSE</div>{dayB.map(b=><Itm key={b.id} b={b} />)}</div>)}
    {dayB.length===0&&dep.length===0&&(<div style={{fontSize:11,color:MU,fontFamily:C,fontStyle:"italic"}}>No bookings</div>)}
  </div>);
}

function OccBar({bookings,rooms,refDay,label}){
  const dayB=bookings.filter(b=>b.checkIn<=refDay&&b.checkOut>refDay);
  const occ=dayB.flatMap(b=>b.roomIds);const cnt=new Set(occ).size;
  return(<div style={{marginBottom:20}}>
    <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.2em",color:MU,marginBottom:8,fontFamily:C}}>OCCUPANCY</div>
    <div style={{display:"flex",gap:3,marginBottom:6}}>{rooms.map(r=>{const o=occ.includes(r.id);return <div key={r.id} style={{flex:1,height:6,background:o?"#000":BD}} />})}</div>
    <div style={{fontSize:28,fontWeight:700,marginBottom:2,fontFamily:H}}>{cnt}/5</div>
    <div style={{fontSize:9,color:MU,letterSpacing:"0.1em",fontFamily:C}}>{label}</div>
  </div>);
}

function Card({b,onClick}){
  const nights=Math.round((parseD(b.checkOut)-parseD(b.checkIn))/86400000);const nr=b.roomIds.length;const isPre=b.status==="prebooking";
  return(<div onClick={()=>onClick(b)} style={{padding:"8px 10px",marginBottom:4,cursor:"pointer",borderLeft:isPre?`2px solid ${LAV}`:`2px solid ${ROSE}`,background:isPre?LAV_BG:ROSE_BG,transition:"padding-left 0.15s"}}
    onMouseEnter={e=>e.currentTarget.style.paddingLeft="14px"} onMouseLeave={e=>e.currentTarget.style.paddingLeft="10px"}>
    <div style={{fontSize:12,fontWeight:700,color:FG,fontFamily:H}}>{b.guest}</div>
    <div style={{fontSize:10,color:MU,marginTop:2,fontFamily:C}}>{nr}rm · {b.guests}p · {nights}n · {b.checkIn.slice(5)} → {b.checkOut.slice(5)}</div>
    {b.notes&&<div style={{fontSize:9,color:"#bbb",marginTop:2,fontFamily:C}}>{b.notes}</div>}
  </div>);
}

function Sidebar({bookings,rooms,occDay,occLabel,selDay,onEdit}){
  const occDayB=bookings.filter(b=>b.checkIn<=occDay&&b.checkOut>occDay);
  const hereNow=occDayB.filter(b=>b.status==="confirmed");
  const prebs=bookings.filter(b=>b.status==="prebooking").sort((a,b)=>a.checkIn.localeCompare(b.checkIn));
  const upcoming=bookings.filter(b=>b.checkIn>occDay&&b.status==="confirmed").sort((a,b)=>a.checkIn.localeCompare(b.checkIn)).slice(0,5);
  return(<>
    <OccBar bookings={bookings} rooms={rooms} refDay={occDay} label={occLabel} />
    {hereNow.length>0&&(<div style={{marginBottom:20}}><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.2em",color:MU,marginBottom:8,fontFamily:C}}>{selDay?"IN HOUSE":"HERE NOW"}</div>{hereNow.map(b=><Card key={b.id} b={b} onClick={onEdit} />)}</div>)}
    {prebs.length>0&&(<div style={{marginBottom:20}}><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.2em",color:MU,marginBottom:8,fontFamily:C}}>PRE-BOOKINGS ({prebs.length})</div>{prebs.map(b=><Card key={b.id} b={b} onClick={onEdit} />)}</div>)}
    {upcoming.length>0&&(<div style={{marginBottom:20}}><div style={{fontSize:9,fontWeight:700,letterSpacing:"0.2em",color:MU,marginBottom:8,fontFamily:C}}>UPCOMING</div>{upcoming.map(b=><Card key={b.id} b={b} onClick={onEdit} />)}</div>)}
    <div style={{marginTop:16,fontSize:9,color:MU}}>
      <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.2em",marginBottom:8,fontFamily:C}}>PRICING — €/NIGHT</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,fontFamily:C}}>
        <thead><tr style={{borderBottom:`1px solid ${BD}`}}><td style={{padding:"3px 4px"}}></td><td style={{padding:"3px 4px",textAlign:"center",fontWeight:700,fontFamily:H}}>T1</td><td style={{padding:"3px 4px",textAlign:"center",fontWeight:700,fontFamily:H}}>T2</td><td style={{padding:"3px 4px",textAlign:"center",fontWeight:700,fontFamily:H}}>T3</td></tr></thead>
        <tbody>{[["1-2n",200,270,320],["3-5n",185,265,305],["6+n",170,255,290]].map(([l,...v],i)=>(<tr key={i} style={{borderBottom:`1px solid ${BD}`}}><td style={{padding:"3px 4px",color:MU}}>{l}</td>{v.map((x,j)=><td key={j} style={{padding:"3px 4px",textAlign:"center",color:FG}}>{x}</td>)}</tr>))}</tbody>
      </table>
    </div>
    <div style={{marginTop:30,textAlign:"center"}}><img src={EYE} alt="" style={{height:24,opacity:0.15}} /></div>
  </>);
}

export default function App(){
  const isMobile=useIsMobile();
  const[year,setYear]=useState(2026);
  const[month,setMonth]=useState(5);
  const{bookings,saveBooking,deleteBooking}=useBookings();
  const[modal,setModal]=useState(null);
  const[selDay,setSelDay]=useState(null);
  const[mobileTab,setMobileTab]=useState("calendar");
  const ref=useRef(null);
  const todayKey=dk(TODAY);const dim=daysIn(year,month);
  const days=Array.from({length:dim},(_,i)=>i+1);
  const CW=isMobile?38:42;

  const map=useMemo(()=>{const m={};bookings.forEach(b=>{b.roomIds.forEach(rid=>{let c=parseD(b.checkIn);const e=parseD(b.checkOut);while(c<e){m[rid+"_"+dk(c)]=b;c=addD(c,1)}})});return m},[bookings]);

  const occDay=selDay||todayKey;
  const occLabel=selDay?(()=>{const d=parseD(selDay);return dn(selDay)+" "+d.getDate()+" "+MS[d.getMonth()]})():"today ("+todayKey.slice(5)+")";

  const prev=()=>{setSelDay(null);if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1)};
  const next=()=>{setSelDay(null);if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1)};
  const goNow=()=>{setSelDay(null);setYear(2026);setMonth(TODAY.getMonth())};
  const sw=(dir)=>{if(ref.current)ref.current.scrollLeft+=dir*CW*7};

  const save=async(f)=>{try{await saveBooking(f)}catch(e){console.error(e)}setModal(null)};
  const del=async(id)=>{try{await deleteBooking(id)}catch(e){console.error(e)}setModal(null)};
  const onEdit=(b)=>setModal({type:"edit",data:b});

  const px=isMobile?14:28;

  return(<div style={{fontFamily:C,background:BG,minHeight:"100vh",color:FG}}>
    <style>{`*{box-sizing:border-box}::-webkit-scrollbar{height:6px;width:4px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px}`}</style>

    {/* Header */}
    <div style={{padding:`12px ${px}px`,borderBottom:"2px solid #000",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:isMobile?10:16}}>
        <img src={EYE} alt="" style={{height:isMobile?24:32,opacity:0.8}} />
        <div>
          <div style={{fontSize:isMobile?14:18,fontWeight:700,letterSpacing:"0.12em",fontFamily:H}}>CHÂTEAUMOULIN</div>
          {!isMobile&&<div style={{fontSize:9,color:MU,letterSpacing:"0.2em",marginTop:2,fontFamily:C}}>BOOKING · SEASON 2026 · JUN 15 — SEP 15</div>}
        </div>
      </div>
      <button onClick={()=>setModal({type:"new",data:null})} style={{padding:isMobile?"6px 12px":"8px 20px",border:"2px solid #000",background:"#000",color:BG,cursor:"pointer",fontFamily:C,fontSize:isMobile?9:10,fontWeight:700,letterSpacing:"0.1em"}}>+ NEW</button>
    </div>

    {/* Nav */}
    <div style={{padding:`10px ${px}px`,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${BD}`,flexWrap:isMobile?"wrap":"nowrap",gap:isMobile?8:0}}>
      <div style={{display:"flex",alignItems:"center",gap:isMobile?8:12}}>
        <button onClick={prev} style={{background:"none",border:"1px solid #ccc",padding:"4px 8px",cursor:"pointer",fontFamily:H,fontSize:isMobile?12:14,color:FG}}>←</button>
        <span style={{minWidth:isMobile?110:160,textAlign:"center",fontSize:isMobile?13:15,fontWeight:700,letterSpacing:"0.08em",fontFamily:H}}>{MS[month].toUpperCase().slice(0,isMobile?3:99)} {year}</span>
        <button onClick={next} style={{background:"none",border:"1px solid #ccc",padding:"4px 8px",cursor:"pointer",fontFamily:H,fontSize:isMobile?12:14,color:FG}}>→</button>
        {!isMobile&&<button onClick={goNow} style={{background:"none",border:"1px solid #000",padding:"5px 12px",cursor:"pointer",fontFamily:C,fontSize:9,fontWeight:700,letterSpacing:"0.1em",color:FG}}>TODAY</button>}
        {!isMobile&&<><div style={{width:1,height:20,background:BD,margin:"0 4px"}} />
        <button onClick={()=>sw(-1)} style={{background:"none",border:"1px solid #ccc",padding:"5px 8px",cursor:"pointer",fontFamily:C,fontSize:9,color:FG}}>◄ WEEK</button>
        <button onClick={()=>sw(1)} style={{background:"none",border:"1px solid #ccc",padding:"5px 8px",cursor:"pointer",fontFamily:C,fontSize:9,color:FG}}>WEEK ►</button></>}
      </div>
      {isMobile?(
        <div style={{display:"flex",gap:6,width:"100%"}}>
          <button onClick={goNow} style={{background:"none",border:"1px solid #000",padding:"4px 10px",cursor:"pointer",fontFamily:C,fontSize:8,fontWeight:700,color:FG}}>TODAY</button>
          <button onClick={()=>sw(-1)} style={{background:"none",border:"1px solid #ccc",padding:"4px 8px",cursor:"pointer",fontFamily:C,fontSize:8,color:FG}}>◄ WK</button>
          <button onClick={()=>sw(1)} style={{background:"none",border:"1px solid #ccc",padding:"4px 8px",cursor:"pointer",fontFamily:C,fontSize:8,color:FG}}>WK ►</button>
          <div style={{flex:1}} />
          <div style={{display:"flex",gap:6,fontSize:8,alignItems:"center",fontFamily:C}}>
            <span style={{display:"inline-block",width:8,height:8,background:ROSE}} /> <span style={{display:"inline-block",width:8,height:8,background:LAV,marginLeft:6}} />
          </div>
        </div>
      ):(
        <div style={{display:"flex",gap:16,fontSize:9,letterSpacing:"0.1em",fontFamily:C}}>
          <span><span style={{display:"inline-block",width:10,height:10,background:ROSE,marginRight:4,verticalAlign:"middle"}} /> CONFIRMED</span>
          <span><span style={{display:"inline-block",width:10,height:10,background:LAV,marginRight:4,verticalAlign:"middle"}} /> PRE-BOOKING</span>
          <span style={{color:MU,opacity:0.5}}>/// OFF</span>
        </div>
      )}
    </div>

    {/* Mobile tabs */}
    {isMobile&&(
      <div style={{display:"flex",borderBottom:`1px solid ${BD}`}}>
        {[["calendar","Calendar"],["info","Info"]].map(([k,l])=>(
          <button key={k} onClick={()=>setMobileTab(k)} style={{flex:1,padding:"8px 0",background:mobileTab===k?"rgba(0,0,0,0.04)":"transparent",border:"none",borderBottom:mobileTab===k?"2px solid #000":"2px solid transparent",fontFamily:C,fontSize:10,fontWeight:mobileTab===k?700:400,color:FG,cursor:"pointer",letterSpacing:"0.1em"}}>{l}</button>
        ))}
      </div>
    )}

    {/* Day panel */}
    {selDay&&(mobileTab==="calendar"||!isMobile)&&(
      <div style={{padding:`12px ${px}px 0`}}><DayPanel dk={selDay} bookings={bookings} rooms={ROOMS} onClose={()=>setSelDay(null)} onEdit={onEdit} isMobile={isMobile} /></div>
    )}

    {/* Content */}
    <div style={{display:isMobile?"block":"flex",padding:`16px ${px}px`}}>
      {/* Timeline */}
      {(mobileTab==="calendar"||!isMobile)&&(
        <div style={{flex:1,minWidth:0}}>
          <div ref={ref} style={{overflowX:"auto",scrollBehavior:"smooth",WebkitOverflowScrolling:"touch"}}>
            <div style={{width:dim*CW+(isMobile?50:80)}}>
              <div style={{display:"flex",borderBottom:"2px solid #000"}}>
                <div style={{width:isMobile?50:80,flexShrink:0,padding:"6px 8px",fontSize:9,fontWeight:700,letterSpacing:"0.1em",fontFamily:C}}>{isMobile?"#":"SLOTS"}</div>
                <div style={{display:"flex"}}>
                  {days.map(d=>{
                    const key=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                    const isT=key===todayKey;const dow=new Date(year,month,d).getDay();const we=dow===0||dow===6;const off=!inS(key);const isSel=selDay===key;
                    return(<div key={d} onClick={()=>inS(key)?setSelDay(selDay===key?null:key):null}
                      style={{width:CW,textAlign:"center",padding:"3px 0",fontSize:isMobile?10:11,fontFamily:H,fontWeight:isT?800:isSel?700:400,color:off?"#d0ccc0":isT?"#000":we?"#aaa":"#888",background:isSel?"rgba(0,0,0,0.08)":isT?"rgba(0,0,0,0.04)":"transparent",cursor:off?"default":"pointer",borderBottom:isSel?"2px solid #000":"2px solid transparent",flexShrink:0}}>
                      <div style={{fontSize:7,color:off?"#d0ccc0":MU,fontFamily:C}}>{dn(key).slice(0,isMobile?2:3)}</div><div>{d}</div>
                    </div>);
                  })}
                </div>
              </div>
              {ROOMS.map((room,ri)=>(
                <div key={room.id} style={{display:"flex",borderBottom:`1px solid ${BD}`}}>
                  <div style={{width:isMobile?50:80,flexShrink:0,padding:"8px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",color:MU,fontFamily:H}}>{ri+1}</div>
                  <div style={{display:"flex",alignItems:"center",minHeight:isMobile?34:38}}>
                    {days.map(d=>{
                      const key=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                      const k=room.id+"_"+key;const b=map[k];const off=!inS(key);const isCI=b&&b.checkIn===key;const isSel=selDay===key;
                      if(off)return <div key={d} style={{width:CW,height:isMobile?34:38,flexShrink:0,background:"repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.03) 3px,rgba(0,0,0,0.03) 4px)"}} />;
                      if(b){const isPre=b.status==="prebooking";
                        return(<div key={d} style={{width:CW,height:isMobile?34:38,flexShrink:0,display:"flex",alignItems:"center",cursor:"pointer",position:"relative",background:isSel?"rgba(0,0,0,0.04)":"transparent"}} onClick={()=>setModal({type:"edit",data:b})} title={b.guest}>
                          <div style={{position:"absolute",left:isCI?2:0,right:0,top:4,bottom:4,background:isPre?LAV_BG:ROSE_BG,borderLeft:isCI?`2px solid ${isPre?LAV:ROSE}`:"none"}}>
                            {isCI&&<div style={{fontSize:isMobile?7:8,fontWeight:700,padding:"1px 3px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:isPre?LS:RS,fontFamily:C}}>{b.guest.split(" ")[0].toUpperCase()}</div>}
                          </div>
                        </div>);
                      }
                      return(<div key={d} style={{width:CW,height:isMobile?34:38,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:isSel?"rgba(0,0,0,0.04)":"transparent"}}
                        onClick={()=>setModal({type:"new",data:{checkIn:key,checkOut:dk(addD(parseD(key),2))}})}><div style={{width:2,height:2,borderRadius:"50%",background:"#d0ccc0"}} /></div>);
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar — desktop: right column, mobile: tab */}
      {(!isMobile||mobileTab==="info")&&(
        <div style={isMobile?{paddingTop:8}:{width:240,flexShrink:0,paddingLeft:20,borderLeft:`1px solid ${BD}`}}>
          <Sidebar bookings={bookings} rooms={ROOMS} occDay={occDay} occLabel={occLabel} selDay={selDay} onEdit={onEdit} />
        </div>
      )}
    </div>

    {modal&&(<Modal onClose={()=>setModal(null)} isMobile={isMobile}>
      <BForm data={modal.type==="edit"?{...modal.data,numRooms:modal.data.roomIds.length}:{numRooms:1,guest:"",email:"",guests:1,ages:"",checkIn:modal.data?.checkIn||"",checkOut:modal.data?.checkOut||"",status:"prebooking",bookedOn:dk(TODAY),notes:""}}
        bookings={bookings} onSave={save} onCancel={()=>setModal(null)} onDelete={modal.type==="edit"?del:null} isMobile={isMobile} />
    </Modal>)}
  </div>);
}
