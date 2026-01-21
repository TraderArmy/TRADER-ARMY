/* ============================================================
    1) GRAFİK — Lightweight Charts
============================================================ */
const chart = LightweightCharts.createChart(document.getElementById("chart"), {
    layout:{background:{color:"#0d0f14"},textColor:"#d1d4dc"},
    grid:{vertLines:{color:"#1c1f26"},horzLines:{color:"#1c1f26"}},
});
const candleSeries = chart.addCandlestickSeries();

/* ============================================================
    2) Yahoo Finance — Kripto + Forex + Endeks (TOKEN YOK)
============================================================ */
async function loadSymbol(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1h&range=1mo`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (!data.chart || !data.chart.result) {
            console.log("Veri alınamadı:", data);
            return;
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];

        const candles = timestamps.map((t, i) => ({
            time: t,
            open: quotes.open[i],
            high: quotes.high[i],
            low: quotes.low[i],
            close: quotes.close[i]
        }));

        candleSeries.setData(candles);
    } 
    catch (err) {
        console.log("HATA:", err);
    }
}

/* Varsayılan grafik */
loadSymbol("BTC-USD");

/* ============================================================
    3) CANVAS — ÇİZİM MOTORU
============================================================ */
const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas(){
    canvas.width = window.innerWidth - 60;
    canvas.height = window.innerHeight - 50;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* ============================================================
    4) DURUMLAR
============================================================ */
let tool = "select";
let drawing = false;
let current = null;
let selectedObj = null;

let paths = [];
let undoStack = [];
let redoStack = [];

/* ============================================================
    5) TOOLBAR
============================================================ */
document.querySelectorAll(".tool").forEach(btn=>{
    btn.onclick = () => {
        document.querySelectorAll(".tool").forEach(t=>t.classList.remove("active"));
        btn.classList.add("active");
        tool = btn.dataset.tool || btn.id;
    };
});

/* ============================================================
    6) KOORDİNAT ALMA
============================================================ */
function pos(evt){
    const r = canvas.getBoundingClientRect();
    if(evt.touches){
        return {x:evt.touches[0].clientX-r.left,y:evt.touches[0].clientY-r.top};
    }
    return {x:evt.clientX-r.left,y:evt.clientY-r.top};
}

/* ============================================================
    7) OBJELERİ ÇİZME
============================================================ */
function drawObject(o){
    ctx.lineWidth = o.width || 2;
    ctx.strokeStyle = selectedObj===o ? "#00ffff" : o.color || "#4ba3ff";
    ctx.fillStyle = o.fill || "#4ba3ff44";

    if(o.type==="line"){
        ctx.beginPath();
        ctx.moveTo(o.x1,o.y1);
        ctx.lineTo(o.x2,o.y2);
        ctx.stroke();

        if(selectedObj===o){
            ctx.beginPath();ctx.arc(o.x1,o.y1,5,0,6.28);ctx.fill();
            ctx.beginPath();ctx.arc(o.x2,o.y2,5,0,6.28);ctx.fill();
        }
    }

    if(o.type==="rect"){
        ctx.strokeRect(o.x1,o.y1,o.x2-o.x1,o.y2-o.y1);
    }

    if(o.type==="brush"){
        ctx.beginPath();
        ctx.moveTo(o.points[0].x,o.points[0].y);
        for(const p of o.points) ctx.lineTo(p.x,p.y);
        ctx.stroke();
    }

    if(o.type==="text"){
        ctx.font = o.size + "px Arial";
        ctx.fillStyle = o.color;
        ctx.fillText(o.text,o.x,o.y);
    }
}

function redrawAll(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const o of paths) drawObject(o);
    if(current) drawObject(current);
}

/* ============================================================
    8) TRENDLINE SEÇİM + TAŞIMA
============================================================ */
function near(x,y,a,b,dist=10){ return Math.hypot(x-a,y-b)<dist; }

function hitTest(px,py){
    for(let i=paths.length-1;i>=0;i--){
        const o = paths[i];

        if(o.type==="line"){
            if(near(px,py,o.x1,o.y1)) return {o,hit:"p1"};
            if(near(px,py,o.x2,o.y2)) return {o,hit:"p2"};
        }
    }
    return null;
}

let dragMode=null;
let offsetX=0;
let offsetY=0;

canvas.addEventListener("mousedown",start);
canvas.addEventListener("mousemove",move);
canvas.addEventListener("mouseup",end);

canvas.addEventListener("touchstart",start);
canvas.addEventListener("touchmove",move);
canvas.addEventListener("touchend",end);

/* ============================================================
    9) START
============================================================ */
function start(e){
    const p = pos(e);
    drawing = true;

    const hit = hitTest(p.x,p.y);

    if(tool==="select" && hit){
        selectedObj = hit.o;
        dragMode = hit.hit;
        offsetX = p.x;
        offsetY = p.y;
        redrawAll();
        return;
    }

    if(tool==="line"){
        current = {type:"line",x1:p.x,y1:p.y,x2:p.x,y2:p.y,color:"#4ba3ff"};
    }

    if(tool==="rect"){
        current = {type:"rect",x1:p.x,y1:p.y,x2:p.x,y2:p.y,color:"#4ba3ff"};
    }

    if(tool==="brush"){
        current = {type:"brush",points:[{x:p.x, y:p.y}],color:"#4ba3ff"};
    }

    if(tool==="text"){
        const t = prompt("Metin:");
        if(t){
            paths.push({type:"text",x:p.x,y:p.y,text:t,size:20,color:"#4ba3ff"});
            redrawAll();
        }
        drawing = false;
    }
}

/* ============================================================
    10) MOVE
============================================================ */
function move(e){
    const p = pos(e);

    if(dragMode && selectedObj){
        const dx = p.x - offsetX;
        const dy = p.y - offsetY;

        if(dragMode==="p1"){
            selectedObj.x1 += dx;
            selectedObj.y1 += dy;
        }
        if(dragMode==="p2"){
            selectedObj.x2 += dx;
            selectedObj.y2 += dy;
        }

        offsetX = p.x;
        offsetY = p.y;

        redrawAll();
        return;
    }

    if(!drawing || !current) return;

    if(current.type==="line"){
        current.x2 = p.x;
        current.y2 = p.y;
    }

    if(current.type==="rect"){
        current.x2 = p.x;
        current.y2 = p.y;
    }

    if(current.type==="brush"){
        current.points.push({x:p.x, y:p.y});
    }

    redrawAll();
}

/* ============================================================
    11) END
============================================================ */
function end(){
    if(dragMode){
        dragMode=null;
        return;
    }
    if(current){
        paths.push(current);
    }
    current=null;
    drawing=false;
    redrawAll();
}

/* ============================================================
    12) UNDO / REDO / DELETE
============================================================ */
undo.onclick = () => {
    if(paths.length>0){
        undoStack.push(paths.pop());
        redrawAll();
    }
};

redo.onclick = () => {
    if(undoStack.length>0){
        paths.push(undoStack.pop());
        redrawAll();
    }
};

delete.onclick = () => {
    if(selectedObj){
        paths = paths.filter(p=>p!==selectedObj);
        selectedObj=null;
        redrawAll();
    }
};
