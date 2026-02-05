// Шығын Detector — LocalStorage нұсқасы (Web)
// Автор: Ramazan mode 😄

const KEY = "shygyn_detector_v1";

const form = document.getElementById("txForm");
const shameModeEl = document.getElementById("shameMode");
const resetBtn = document.getElementById("resetBtn");

const incomeSumEl = document.getElementById("incomeSum");
const expenseSumEl = document.getElementById("expenseSum");
const balanceSumEl = document.getElementById("balanceSum");
const adviceTextEl = document.getElementById("adviceText");
const catBarsEl = document.getElementById("catBars");

const txListEl = document.getElementById("txList");
const emptyStateEl = document.getElementById("emptyState");

const monthFilterEl = document.getElementById("monthFilter");
const typeFilterEl = document.getElementById("typeFilter");
const sortFilterEl = document.getElementById("sortFilter");

const titleEl = document.getElementById("title");
const amountEl = document.getElementById("amount");
const categoryEl = document.getElementById("category");
const dateEl = document.getElementById("date");

// ===== Helpers =====
function fmtMoney(n){
  const x = Math.round(Number(n) || 0);
  return x.toLocaleString("ru-RU") + " ₸";
}

function todayISO(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthKey(iso){ // YYYY-MM
  return (iso || "").slice(0,7);
}

function monthLabel(ym){ // 2026-02 -> Ақпан 2026
  const [y,m] = ym.split("-").map(Number);
  const months = ["Қаңтар","Ақпан","Наурыз","Сәуір","Мамыр","Маусым","Шілде","Тамыз","Қыркүйек","Қазан","Қараша","Желтоқсан"];
  return `${months[(m||1)-1]} ${y}`;
}

function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// ===== Storage =====
function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return { shameMode: true, tx: [] };
    const parsed = JSON.parse(raw);
    return {
      shameMode: parsed.shameMode !== false,
      tx: Array.isArray(parsed.tx) ? parsed.tx : []
    };
  }catch{
    return { shameMode: true, tx: [] };
  }
}

function saveState(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

let state = loadState();

// ===== Init =====
dateEl.value = todayISO();
shameModeEl.checked = state.shameMode;

resetBtn.addEventListener("click", () => {
  const ok = confirm("Барлық жазбаны өшірейік пе?");
  if(!ok) return;
  state = { shameMode: shameModeEl.checked, tx: [] };
  saveState(state);
  render();
});

shameModeEl.addEventListener("change", () => {
  state.shameMode = shameModeEl.checked;
  saveState(state);
  renderAdvice();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const type = new FormData(form).get("type");
  const title = titleEl.value.trim();
  const amount = Number(amountEl.value);
  const category = categoryEl.value;
  const date = dateEl.value;

  if(!title || !date || !Number.isFinite(amount) || amount <= 0){
    alert("Дұрыс енгіз: атауы, күні, және сома > 0 болуы керек.");
    return;
  }

  state.tx.push({
    id: uid(),
    type,
    title,
    amount: Math.round(amount),
    category,
    date
  });

  saveState(state);
  form.reset();

  // default қайта қоямыз
  document.getElementById("tExpense").checked = true;
  dateEl.value = todayISO();

  render();
});

// ===== Filters =====
function buildMonthFilter(){
  const months = Array.from(new Set(state.tx.map(t => monthKey(t.date)).filter(Boolean))).sort();
  const current = monthKey(todayISO());
  if(!months.includes(current)) months.push(current);
  months.sort();

  monthFilterEl.innerHTML = "";
  const all = document.createElement("option");
  all.value = "current";
  all.textContent = `Осы ай: ${monthLabel(current)}`;
  monthFilterEl.appendChild(all);

  for(const m of months.slice().reverse()){
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = monthLabel(m);
    monthFilterEl.appendChild(opt);
  }

  // егер бұрын таңдаса — сақтаймыз
  const saved = sessionStorage.getItem("sd_month") || "current";
  monthFilterEl.value = saved;
}

function getActiveMonth(){
  const v = monthFilterEl.value;
  const current = monthKey(todayISO());
  return (v === "current") ? current : v;
}

function applyFilters(){
  const m = getActiveMonth();
  const type = typeFilterEl.value;
  const sort = sortFilterEl.value;

  let list = state.tx.filter(t => monthKey(t.date) === m);

  if(type !== "all") list = list.filter(t => t.type === type);

  if(sort === "new"){
    list.sort((a,b) => (b.date.localeCompare(a.date)) || (b.amount - a.amount));
  }else if(sort === "old"){
    list.sort((a,b) => (a.date.localeCompare(b.date)) || (b.amount - a.amount));
  }else if(sort === "big"){
    list.sort((a,b) => b.amount - a.amount);
  }else if(sort === "small"){
    list.sort((a,b) => a.amount - b.amount);
  }

  return list;
}

monthFilterEl.addEventListener("change", () => {
  sessionStorage.setItem("sd_month", monthFilterEl.value);
  render();
});
typeFilterEl.addEventListener("change", render);
sortFilterEl.addEventListener("change", render);

// ===== Rendering =====
function renderSummary(){
  const m = getActiveMonth();
  const monthTx = state.tx.filter(t => monthKey(t.date) === m);

  const income = monthTx.filter(t => t.type === "income").reduce((s,t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === "expense").reduce((s,t) => s + t.amount, 0);
  const balance = income - expense;

  incomeSumEl.textContent = fmtMoney(income);
  expenseSumEl.textContent = fmtMoney(expense);
  balanceSumEl.textContent = fmtMoney(balance);
}

function renderList(){
  const list = applyFilters();
  txListEl.innerHTML = "";

  emptyStateEl.style.display = list.length ? "none" : "block";

  for(const t of list){
    const el = document.createElement("div");
    el.className = "tx";

    const badgeClass = t.type === "expense" ? "expense" : "income";
    const sign = t.type === "expense" ? "-" : "+";

    el.innerHTML = `
      <div>
        <div class="top">
          <span class="badge ${badgeClass}">${t.type === "expense" ? "Шығын" : "Кіріс"}</span>
          <span class="badge">${t.category}</span>
          <span class="badge">${t.date}</span>
        </div>
        <div class="meta"><strong>${escapeHtml(t.title)}</strong></div>
      </div>
      <div class="tx-actions">
        <div class="amount ${badgeClass}">${sign}${fmtMoney(t.amount)}</div>
        <button class="icon-btn" data-del="${t.id}" title="Өшіру">Өшіру</button>
      </div>
    `;

    txListEl.appendChild(el);
  }

  txListEl.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      state.tx = state.tx.filter(x => x.id !== id);
      saveState(state);
      render();
    });
  });
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderBars(){
  const m = getActiveMonth();
  const monthTx = state.tx.filter(t => monthKey(t.date) === m && t.type === "expense");

  const totals = {};
  for(const t of monthTx){
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }

  const entries = Object.entries(totals).sort((a,b)=> b[1]-a[1]);
  catBarsEl.innerHTML = "";

  if(entries.length === 0){
    catBarsEl.innerHTML = `<div class="muted">Әзірге шығын жоқ.</div>`;
    return;
  }

  const max = entries[0][1] || 1;

  for(const [cat,val] of entries){
    const row = document.createElement("div");
    row.className = "bar";
    const pct = Math.round((val / max) * 100);

    row.innerHTML = `
      <div class="muted">${cat}</div>
      <div class="track"><div class="fill" style="width:${pct}%"></div></div>
      <div class="muted" style="text-align:right">${fmtMoney(val)}</div>
    `;
    catBarsEl.appendChild(row);
  }
}

function renderAdvice(){
  const m = getActiveMonth();
  const monthTx = state.tx.filter(t => monthKey(t.date) === m);

  const expenseTx = monthTx.filter(t => t.type === "expense");
  const expense = expenseTx.reduce((s,t)=>s+t.amount,0);

  if(monthTx.length < 2){
    adviceTextEl.textContent = "Кеңес шығару үшін кемі 2-3 жазба қос.";
    return;
  }

  // категория TOP
  const cat = {};
  for(const t of expenseTx){
    cat[t.category] = (cat[t.category]||0) + t.amount;
  }
  const top = Object.entries(cat).sort((a,b)=>b[1]-a[1])[0];

  const shame = state.shameMode;

  // “көңілді” ережелер
  const coffee = (cat["Кофе/шай"] || 0);
  const food = (cat["Тамақ"] || 0);
  const fun  = (cat["Ойын-сауық"] || 0);
  const transport = (cat["Көлік"] || 0);

  let msg = "";

  if(expense === 0){
    msg = "Шығын жоқ екен. Мықты! 😄";
  } else if(coffee >= 15000){
    msg = shame
      ? `Кофе/шайға ${fmtMoney(coffee)} кетіпті… сен кофемен контракт жасап қойғансың ба? 😄`
      : `Кофе/шайға ${fmtMoney(coffee)} кетті. Күніне 1 ретке түсірсең, айына жақсы үнем болады.`;
  } else if(fun >= 25000){
    msg = shame
      ? `Ойын-сауыққа ${fmtMoney(fun)} 🤝 “Көңіл” жақсы, бірақ баланс та керек 😄`
      : `Ойын-сауық шығыны жоғары. Аптасына бір лимит қойып көр.`;
  } else if(food >= 50000){
    msg = shame
      ? `Тамаққа ${fmtMoney(food)}… аштық чемпионаты ма? 😅 Үйден 1-2 рет алып шықсаң үнемдейсің.`
      : `Тамақ шығыны жоғары. Аптасына 2 рет үйден алып шығу көмектеседі.`;
  } else if(transport >= 20000){
    msg = shame
      ? `Көлікке ${fmtMoney(transport)} кетіпті. Такси сені VIP санайтын сияқты 😄`
      : `Көлік шығыны жоғары. Мүмкін қоғамдық көлік/жаяу күн енгізіп көр.`;
  } else if(top){
    msg = shame
      ? `Айдың “жеңімпазы” — ${top[0]}: ${fmtMoney(top[1])}. Ақшаң соған қашып жатыр 😄`
      : `Ең көп шығын: ${top[0]} — ${fmtMoney(top[1])}. Сол категорияға лимит қой.`;
  } else {
    msg = "Жақсы жүріп тұрсың. Бір категорияға лимит қойсаң, одан да оңай болады.";
  }

  adviceTextEl.textContent = msg;
}

function render(){
  buildMonthFilter();
  renderSummary();
  renderBars();
  renderAdvice();
  renderList();
}

render();
