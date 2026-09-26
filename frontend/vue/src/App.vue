<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

type ThemeType='normal'|'protanopia'|'deuteranopia'|'tritanopia'|'achromatopsia'|'low_vision';
type Severity='mild'|'moderate'|'severe';
type SimulationType='protanopia'|'deuteranopia'|'tritanopia';
interface Palette{background:string;surface:string;text:string;primary:string;secondary:string;error:string;success:string}
interface ThemeResponse{type:ThemeType;palette:Palette;contrast_ok:boolean}
interface Suggestion{suggested_type:ThemeType;severity:Severity;high_contrast:boolean;disclaimer:string}
interface Simulation{original:string;simulated:string;type:SimulationType;severity:number;model:string}

const labels:Record<ThemeType,string>={normal:'Sin adaptación',protanopia:'Rojo-verde',deuteranopia:'Rojo-verde',tritanopia:'Azul-amarillo',achromatopsia:'Todo en grises',low_vision:'Baja visión'};
const screen=ref<'home'|'auto'|'manual'>('home');
const selected=ref<ThemeType>('normal');
const severity=ref<Severity>('moderate');
const highContrast=ref(false);
const themePercent=ref(70);
const palette=ref<Palette|null>(null);
const status=ref('EyeX está listo.');
const feedbackStatus=ref('');
const answers=ref({red_green_confusion:false,red_black_confusion:false,blue_yellow_confusion:false,blue_green_confusion:false,low_saturation_confusion:false});
const simulationColor=ref('#FF0000');
const simulationPercent=ref(100);
const simulation=ref<Simulation|null>(null);
const simulationStatus=ref('Vista previa lista.');
const media=window.matchMedia('(prefers-color-scheme: dark)');
const mode=ref<'dark'|'light'>(media.matches?'dark':'light');
const modeLabel=computed(()=>mode.value==='dark'?'Modo oscuro automático':'Modo claro automático');
const activeLabel=computed(()=>labels[selected.value]);
const themeSeverityLabel=computed(()=>humanSeverity(themePercent.value));
const simulationSeverityLabel=computed(()=>humanSeverity(simulationPercent.value));

function apiBase():string{const q=new URLSearchParams(window.location.search).get('api');return q?q.replace(/\/$/,''):window.location.port==='5173'?'http://localhost:8080':'';}
const base=apiBase();
async function json<T>(path:string,init?:RequestInit):Promise<T>{const response=await fetch(`${base}${path}`,{...init,headers:{Accept:'application/json',...(init?.body?{'Content-Type':'application/json'}:{}),...(init?.headers||{})}});const payload=await response.json();if(!response.ok)throw new Error(payload.message||payload.error||`HTTP ${response.status}`);return payload as T;}
function humanSeverity(v:number):string{return v<34?'Suave':v<67?'Moderada':v<90?'Alta':'Máxima';}
function apiSeverity(v:number):Severity{return v<34?'mild':v<78?'moderate':'severe';}
function simType(type:ThemeType):SimulationType{return type==='tritanopia'?'tritanopia':type==='protanopia'?'protanopia':'deuteranopia';}
function applyPalette(p:Palette){Object.entries(p).forEach(([key,value])=>document.documentElement.style.setProperty(`--eyex-${key}`,value));}

async function applyTheme(type:ThemeType=selected.value,s:Severity=severity.value,hc:boolean=highContrast.value){
  selected.value=type;severity.value=s;highContrast.value=hc;status.value='Aplicando adaptación...';
  try{const q=new URLSearchParams({severity:s,mode:mode.value,high_contrast:String(hc)});const data=await json<ThemeResponse>(`/api/v1/theme/${encodeURIComponent(type)}?${q}`);palette.value=data.palette;applyPalette(data.palette);status.value=`Adaptación activa: ${labels[data.type]} · ${mode.value==='dark'?'oscuro':'claro'}.`;localStorage.setItem('eyex-v150-type',data.type);localStorage.setItem('eyex-v150-severity',s);localStorage.setItem('eyex-v150-high-contrast',String(hc));await simulateLive();}
  catch(cause){status.value=cause instanceof Error?cause.message:'No se pudo aplicar EyeX';}
}

async function runTest(){
  status.value='Analizando comparaciones visuales...';
  const body={answers:{reds_look_darker:false,green_brown_confusion:false,colors_look_gray:false,yellow_pink_confusion:false,...answers.value}};
  try{const data=await json<Suggestion>('/api/v1/test/suggest',{method:'POST',body:JSON.stringify(body)});themePercent.value=data.severity==='mild'?25:data.severity==='severe'?90:60;await applyTheme(data.suggested_type,data.severity,data.high_contrast);status.value=`Recomendación aplicada: ${labels[data.suggested_type]}. ${data.disclaimer}`;}
  catch(cause){status.value=cause instanceof Error?cause.message:'No se pudo obtener la sugerencia';}
}
async function manual(type:ThemeType){await applyTheme(type,apiSeverity(themePercent.value),type==='achromatopsia');}
async function feedback(helpful:boolean){feedbackStatus.value='Registrando...';try{await json('/api/v1/feedback',{method:'POST',body:JSON.stringify({suggested_type:selected.value,helpful})});feedbackStatus.value='Gracias.';}catch(cause){feedbackStatus.value=cause instanceof Error?cause.message:'No se pudo registrar';}}

function colorName(hex:string):string{const raw=hex.replace('#','');const r=parseInt(raw.slice(0,2),16),g=parseInt(raw.slice(2,4),16),b=parseInt(raw.slice(4,6),16);const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;if(max<35)return'Negro';if(min>225)return'Blanco';if(d<18)return l<105?'Gris oscuro':l<190?'Gris':'Gris claro';let h=0;if(d){if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*((b-r)/d+2);else h=60*((r-g)/d+4);if(h<0)h+=360;}if(h<15||h>=345)return'Rojo';if(h<42)return l<105?'Marrón':'Naranja';if(h<68)return'Amarillo';if(h<165)return'Verde';if(h<195)return'Turquesa';if(h<255)return'Azul';if(h<290)return'Violeta';return'Rosa';}
async function simulateLive(){try{simulationStatus.value='Actualizando vista previa...';simulation.value=await json<Simulation>('/api/v1/simulate',{method:'POST',body:JSON.stringify({hex:simulationColor.value.toUpperCase(),type:simType(selected.value),severity:simulationPercent.value/100})});simulationStatus.value='Comparación actualizada en vivo.';}catch(cause){simulationStatus.value=cause instanceof Error?cause.message:'No se pudo simular';}}

watch(themePercent,(value)=>{void applyTheme(selected.value,apiSeverity(value),highContrast.value);});
let timer:number|undefined;watch([simulationColor,simulationPercent],()=>{window.clearTimeout(timer);timer=window.setTimeout(()=>void simulateLive(),120);});
media.addEventListener('change',(event)=>{mode.value=event.matches?'dark':'light';void applyTheme();});
onMounted(()=>{const type=(localStorage.getItem('eyex-v150-type') as ThemeType|null)||'normal';const s=(localStorage.getItem('eyex-v150-severity') as Severity|null)||'moderate';const hc=localStorage.getItem('eyex-v150-high-contrast')==='true';void applyTheme(type,s,hc);});
</script>

<template>
  <header class="bar"><div class="wrap"><strong>EyeX v1.5</strong><span>{{ modeLabel }}</span></div></header>
  <main class="wrap main">
    <section class="intro"><h1>Dos formas simples de adaptar los colores.</h1><p>No necesitas conocer nombres técnicos. La API v1 completa sigue disponible para desarrolladores.</p></section>
    <section class="choices"><button @click="screen='auto'"><strong>Detección automática</strong><span>No sé mi tipo. Haré una prueba visual.</span></button><button @click="screen='manual'"><strong>Selección manual</strong><span>Ya conozco mi diagnóstico.</span></button></section>
    <p class="status">{{ status }}</p>

    <section v-if="screen==='auto'" class="panel"><h2>Prueba visual rápida</h2><p>Marca solo las parejas que te resultan difíciles de distinguir.</p>
      <div class="visual-grid">
        <label><svg viewBox="0 0 220 90"><rect width="110" height="90" fill="#4E8F55"/><rect x="110" width="110" height="90" fill="#C94C4C"/></svg><input v-model="answers.red_green_confusion" type="checkbox">Estos tonos se me parecen</label>
        <label><svg viewBox="0 0 220 90"><rect width="110" height="90" fill="#252525"/><rect x="110" width="110" height="90" fill="#9E3D37"/></svg><input v-model="answers.red_black_confusion" type="checkbox">Estos tonos se me parecen</label>
        <label><svg viewBox="0 0 220 90"><rect width="110" height="90" fill="#3C73B9"/><rect x="110" width="110" height="90" fill="#D3B64E"/></svg><input v-model="answers.blue_yellow_confusion" type="checkbox">Estos tonos se me parecen</label>
        <label><svg viewBox="0 0 220 90"><rect width="110" height="90" fill="#3577A8"/><rect x="110" width="110" height="90" fill="#3D8C76"/></svg><input v-model="answers.blue_green_confusion" type="checkbox">Estos tonos se me parecen</label>
        <label><svg viewBox="0 0 220 90"><rect width="73" height="90" fill="#C77C7C"/><rect x="73" width="74" height="90" fill="#7DA98A"/><rect x="147" width="73" height="90" fill="#7E91B8"/></svg><input v-model="answers.low_saturation_confusion" type="checkbox">Los colores suaves se ven casi grises</label>
      </div><button class="primary" @click="runTest">Aplicar recomendación</button><div class="feedback"><span>¿Te ayudó?</span><button @click="feedback(true)">Sí</button><button @click="feedback(false)">No</button><small>{{ feedbackStatus }}</small></div>
    </section>

    <section v-if="screen==='manual'" class="panel"><h2>Selección manual</h2><div class="manual"><button @click="manual('deuteranopia')"><strong>Rojo-verde</strong></button><button @click="manual('tritanopia')"><strong>Azul-amarillo</strong></button><button @click="manual('achromatopsia')"><strong>Todo en grises</strong></button></div></section>

    <section class="panel"><div class="heading"><h2>Vista previa</h2><strong>{{ activeLabel }}</strong></div><label class="slider"><span>Intensidad visual</span><input v-model.number="themePercent" type="range" min="0" max="100"><output>{{ themeSeverityLabel }}</output></label><div class="demo"><h3>Interfaz adaptable</h3><p>Este bloque usa la paleta devuelta por EyeX.</p><div class="actions"><button class="primary">Principal</button><button class="secondary">Secundaria</button></div><div class="alerts"><div class="error">Error</div><div class="success">Correcto</div></div></div></section>

    <section class="panel"><h2>Comparador de color</h2><div class="simulation"><div><label class="color"><span>Rueda de color</span><input v-model="simulationColor" type="color"><strong>{{ colorName(simulationColor) }}</strong></label><label class="slider"><span>Intensidad</span><input v-model.number="simulationPercent" type="range" min="0" max="100"><output>{{ simulationSeverityLabel }}</output></label></div><div class="swatches"><div :style="{backgroundColor:simulationColor}"><span>Original · {{ colorName(simulationColor) }}</span></div><div :style="{backgroundColor:simulation?.simulated||'#FFFFFF'}"><span>Simulado · {{ simulation?colorName(simulation.simulated):'—' }}</span></div><p>{{ simulationStatus }}</p></div></div></section>
  </main>
</template>
