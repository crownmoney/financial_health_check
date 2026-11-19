const FREQ={Weekly:52,Fortnightly:26,Monthly:12,Quarterly:4,Annually:1};
const FREQS=Object.keys(FREQ);
// [key,label,defaultFreq]
const FUEL=[["food","Food","Weekly"],["fuel","Fuel","Weekly"]];
const EXP=[["rates","Rates","Quarterly"],["gas","Gas","Quarterly"],["electricity","Elec","Quarterly"],["water","Water","Quarterly"],["car_insurance","Car Ins","Monthly"],["house_insurance","House Insur","Monthly"],["health_insurance","Health Insurance","Monthly"],["medical","Medical","Monthly"],["life_insurance","Life Insurance","Monthly"],["pet_insurance","Pet Insurance","Monthly"],["income_protection","Income Protection","Monthly"],["phone","Phone","Monthly"],["internet","Internet","Monthly"],["car_rego","Car Rego","Annually"],["car_maintenance","Car Maintenance","Annually"],["other_rego","Boat/Jetski/Other Rego","Annually"],["other_maintenance","Other Maintenance","Annually"],["pool_maintenance","Pool Maint","Monthly"],["gym","Gym","Monthly"],["subscriptions","Subscriptions","Monthly"],["childcare","Childcare","Fortnightly"],["kids_activities","Kids Activities (netball...)","Annually"],["kids_excursions","Kids Excursions","Annually"],["school","Private School/Education","Annually"],["rent","Rent","Weekly"],["debt_repay","Debt Repay","Monthly"]];
const $=id=>document.getElementById(id);
const opts=d=>FREQS.map(f=>`<option${f===d?" selected":""}>${f}</option>`).join("");
const row=(k,l,d)=>`<div class="row"><label class="nm" for="${k}_amount">${l}</label><input type="number" min="0" step="any" inputmode="decimal" placeholder="0" id="${k}_amount" name="${k}_amount" data-calc><select id="${k}_freq" name="${k}_freq" aria-label="${l} frequency" data-calc>${opts(d)}</select></div>`;
const rowHead='<div class="row head"><span></span><span>Amount ($)</span><span>Frequency</span></div>';
$("g-freq").innerHTML=opts("Annually");
const incomeBlock=(p,title)=>`<div class="sec">${title}</div>${rowHead}`+row(p+"_income","Net income","Monthly")+row(p+"_other","Other net income / bonus","Monthly");
$("inc").innerHTML=incomeBlock("p1","Person 1")+`<div id="p2inc">`+incomeBlock("p2","Person 2")+`</div>`;
$("exp").innerHTML=`<div class="sec" style="margin-top:0">Pay (food &amp; fuel)</div>${rowHead}`+FUEL.map(r=>row(...r)).join("")+`<div class="sec">Expenses</div>`+EXP.map(r=>row(...r)).join("");
// custom expenses
let cn=0;
$("add-exp").onclick=()=>{cn++;const d=document.createElement("div");d.className="row";d.innerHTML=`<input type="text" placeholder="Expense name" aria-label="Custom expense name" data-cname><input type="number" min="0" step="any" inputmode="decimal" placeholder="0" aria-label="Amount" data-camt data-calc><select aria-label="Frequency" data-cfreq data-calc>${opts("Monthly")}</select>`;$("custom").appendChild(d);d.querySelector("input").focus()};
// totals
const perYear=(a,f)=>(parseFloat(a)||0)*FREQ[f];
function total(){let y=0;[...FUEL,...EXP].forEach(([k])=>y+=perYear($(k+"_amount").value,$(k+"_freq").value));
 document.querySelectorAll("#custom .row").forEach(r=>y+=perYear(r.querySelector("[data-camt]").value,r.querySelector("[data-cfreq]").value));
 $("tot").textContent=(y/12).toLocaleString("en-AU",{style:"currency",currency:"AUD",maximumFractionDigits:0})}
document.addEventListener("input",e=>{if(e.target.hasAttribute("data-calc"))total()});
// gross→net estimate, 2026-27 resident brackets (Stage 3 cuts: 0/16%/30%/37%/45%) + 2% Medicare
function netAnnual(g){const b=[[18200,0],[45000,.16],[135000,.30],[190000,.37],[Infinity,.45]];let t=0,prev=0;for(const[cap,r]of b){if(g>prev)t+=(Math.min(g,cap)-prev)*r;prev=cap}return g-t-g*.02}
$("g-calc").onclick=()=>{const g=perYear($("g-amt").value,$("g-freq").value);if(!g){$("g-out").textContent="Enter a gross salary first.";return}
 const n=netAnnual(g);$("p1_income_amount").value=Math.round(n/12);$("p1_income_freq").value="Monthly";total();
 $("g-out").textContent=`Estimated net ≈ ${Math.round(n/12).toLocaleString("en-AU")} per month (applied to Person 1). Estimate only.`};
// prefill + guard
const s1=store.get().step1;
if(!s1){location.replace("/")}else{$("email").value=s1.email}
$("f2").addEventListener("submit",async e=>{e.preventDefault();$("e-form").textContent="";
 if(!$("p1").value.trim()){$("e-form").textContent="Please enter Person 1's name.";$("p1").focus();return}
 if(!(parseFloat($("p1_income_amount").value)>0)){$("e-form").textContent="Person 1's net income is required.";$("p1_income_amount").focus();return}
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($("email").value.trim())){$("e-form").textContent="Please enter a valid email.";return}
 const d={"form-name":"financial-health-check","bot-field":document.querySelector("[name=bot-field]").value,...s1,email:$("email").value.trim(),person1_name:$("p1").value.trim(),person2_name:$("p2").value.trim()};
 ["p1_income","p1_other","p2_income","p2_other",...FUEL.map(r=>r[0]),...EXP.map(r=>r[0])].forEach(k=>{d[k+"_amount"]=$(k+"_amount").value;d[k+"_freq"]=$(k+"_freq").value});
 d.custom_expenses=JSON.stringify([...document.querySelectorAll("#custom .row")].map(r=>({name:r.querySelector("[data-cname]").value.trim(),amount:r.querySelector("[data-camt]").value,frequency:r.querySelector("[data-cfreq]").value})).filter(x=>x.name&&x.amount));
 d.est_monthly_expenses=$("tot").textContent;
 const b=$("submit");b.disabled=true;b.textContent="Submitting…";
 try{const tok=store.get().token||"";
  const [nf,hp]=await Promise.all([postForm(d).then(()=>true,()=>false),hubspot("step2",{...d,token:tok})]);
  // Netlify Forms keeps a full backup copy; succeed if either destination accepted it.
  if(!nf&&!hp.ok)throw new Error("failed");
  try{sessionStorage.removeItem("fhc")}catch(_){}location.href="/thank-you"}
 catch(err){$("e-form").textContent="Sorry, something went wrong submitting. Please try again.";b.disabled=false;b.textContent="Submit assessment"}});
