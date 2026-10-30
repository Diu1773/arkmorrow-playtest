import {pixelContext} from './pixel-context.js';
import {weaponFrame} from './field-art.js';
import {drawEarth,drawProps,drawEarthEnemy,groundCrew,drawLaunch} from './expedition-art.js';
import {warningShapes,windupFrame} from './telegraph.js';
import {paintWarning} from './telegraph-art.js';
import {rankCopy,combatCopy} from './i18n.js';
import { t } from './i18n.js';
import {sprite,directionFrame} from './pixel-art.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PHOTOS=['orion.jpg','pleiades.jpg','m13.jpg','milkyway.jpg','andromeda.jpg','deepfield.jpg'];
export const PHOTO_PALETTE=['#10131e','#161c2b','#202536','#293146','#34435a','#47596b','#647886','#8c9ca3','#b1b9ac','#e0d9bd','#30273a','#433247','#584053','#704c5d','#8c626e','#ad8287','#2b292f','#40383c','#554947','#6c5950','#88705c','#a58b6b','#c6ac85','#e7d1a6','#1c2b39','#293e50','#3b5367','#536f82','#7593a4','#a3bdc5','#c6d9da','#f0ede0'];
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],rgb=PHOTO_PALETTE.map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));
const photoCache=new WeakMap(),combatPhotos=new WeakMap(),lowPhotos=new WeakMap(),cloudCache=new Map(),explosions=[],sparks=[],levelBursts=[];
let lowQuality=false,fxPressure=0;
let canvas,ctx,mini,mctx,launchCanvas,zoom=1,cw=1,ch=1,lang='ko',lastTime=0,v={w:1,h:1,scale:1,camX:0,camY:0,time:0},unit=1;
const word=k=>t(k,lang),X=x=>Math.round((x-v.camX)*unit+cw/2),Y=y=>Math.round((y-v.camY)*unit+ch/2);
const visible=(x,y,r=40)=>Math.abs(x-v.camX)<v.w/v.scale/2+r&&Math.abs(y-v.camY)<v.h/v.scale/2+r;
function setup(){const next=document.getElementById('world');if(canvas!==next){canvas=next;ctx=canvas?(pixelContext(canvas)??canvas.getContext('2d',{alpha:false})):null;}mini=document.getElementById('minimap');mctx=mini?.getContext('2d');}
export function ditherPhoto(img){
 if(img.pixelReady)return img;
 const old=photoCache.get(img);if(old)return old;const c=document.createElement('canvas');c.width=640;c.height=Math.round(640*img.height/img.width);const g=c.getContext('2d');g.drawImage(img,0,0,c.width,c.height);const data=g.getImageData(0,0,c.width,c.height);
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,d=(bayer[(y%4)*4+x%4]-7.5)*2;let best=0,distance=Infinity;for(let k=0;k<rgb.length;k++){const p=rgb[k],n=(data.data[i]+d-p[0])**2+(data.data[i+1]+d-p[1])**2+(data.data[i+2]+d-p[2])**2;if(n<distance){best=k;distance=n;}}data.data[i]=rgb[best][0];data.data[i+1]=rgb[best][1];data.data[i+2]=rgb[best][2];}
 g.putImageData(data,0,0);photoCache.set(img,c);return c;
}
export function resize(w,h){setup();zoom=Math.max(1,Math.round((w<h?Math.min(w/195,h/422):h/360)));cw=Math.ceil(w/zoom);ch=Math.ceil(h/zoom);if(canvas){canvas.width=cw;canvas.height=ch;canvas.style.width=cw*zoom+'px';canvas.style.height=ch*zoom+'px';canvas.style.left=Math.floor((w-cw*zoom)/2)+'px';canvas.style.top=Math.floor((h-ch*zoom)/2)+'px';ctx.imageSmoothingEnabled=false;}}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
const lineCache=new Map();let linePixels=0;
function line(x,y,ex,ey,color,width=1,dash=false){x=Math.round(x);y=Math.round(y);ex=Math.round(ex);ey=Math.round(ey);const half=Math.floor(width/2);if(Math.max(x,ex)+width-half<0||Math.min(x,ex)-half>=cw||Math.max(y,ey)+width-half<0||Math.min(y,ey)-half>=ch)return;const ddx=ex-x,ddy=ey-y,w=Math.abs(ddx)+width,h=Math.abs(ddy)+width;if(w<=512&&h<=512&&w*h<=65536){const key=ddx+':'+ddy+':'+width+':'+color+':'+Number(dash);let img=lineCache.get(key);if(!img){img=document.createElement('canvas');img.width=w;img.height=h;const g=img.getContext('2d'),ox=Math.min(x,ex)-half,oy=Math.min(y,ey)-half;g.fillStyle=color;let px=x,py=y,dx=Math.abs(ddx),sx=x<ex?1:-1,dy=-Math.abs(ddy),sy=y<ey?1:-1,err=dx+dy,n=0;for(;;){if(!dash||Math.floor(n/4)%2===0)g.fillRect(px-half-ox,py-half-oy,width,width);if(px===ex&&py===ey)break;const e=2*err;if(e>=dy){err+=dy;px+=sx;}if(e<=dx){err+=dx;py+=sy;}n++;}const pixels=img.width*img.height;while(lineCache.size&&(lineCache.size>=2048||linePixels+pixels>4194304)){const first=lineCache.keys().next().value,old=lineCache.get(first);linePixels-=old.width*old.height;lineCache.delete(first);}linePixels+=pixels;lineCache.set(key,img);}ctx.drawImage(img,Math.min(x,ex)-half,Math.min(y,ey)-half);return;}let dx=Math.abs(ddx),sx=x<ex?1:-1,dy=-Math.abs(ddy),sy=y<ey?1:-1,err=dx+dy,n=0;ctx.fillStyle=color;for(;;){if((!dash||Math.floor(n/4)%2===0)&&x+width-half>0&&x-half<cw&&y+width-half>0&&y-half<ch)ctx.fillRect(x-half,y-half,width,width);if(x===ex&&y===ey)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}n++;}}
function wline(x,y,ex,ey,color,width=3,dash=false){line(X(x),Y(y),X(ex),Y(ey),color,Math.max(1,Math.round(width*unit)),dash);}
const circleCache=new Map(),arcCache=new Map();
function circleImage(radius,thick,color,dash){
 const key=radius+':'+thick+':'+color+':'+Number(dash);let c=circleCache.get(key);if(c)return c;
 c=document.createElement('canvas');const pad=Math.ceil(thick/2)+1;c.width=c.height=radius*2+pad*2+1;const g=c.getContext('2d'),steps=Math.max(8,Math.ceil(TAU*radius*1.4));g.fillStyle=color;
 for(let i=0;i<=steps;i++){if(dash&&Math.floor(i/5)%2)continue;const a=i/steps*TAU;g.fillRect(Math.round(radius+pad+Math.cos(a)*radius)-Math.floor(thick/2),Math.round(radius+pad+Math.sin(a)*radius)-Math.floor(thick/2),thick,thick);}
 if(circleCache.size>=256)circleCache.delete(circleCache.keys().next().value);circleCache.set(key,c);return c;
}
function arc(x,y,r,a,b,color,width=3,dash=false){
 if(a===0&&Math.abs(b-TAU)<.0001){const radius=Math.max(1,Math.round(r*unit)),thick=Math.max(1,Math.round(width*unit)),pad=Math.ceil(thick/2)+1;ctx.drawImage(circleImage(radius,thick,color,dash),X(x)-radius-pad,Y(y)-radius-pad);return;}
const radius=r*unit,thick=Math.max(1,Math.round(width*unit)),half=Math.floor(thick/2),pad=Math.ceil(radius+thick),key=radius.toFixed(3)+':'+a.toFixed(3)+':'+b.toFixed(3)+':'+color+':'+thick+':'+Number(dash);let img=arcCache.get(key);
 if(!img){img=document.createElement('canvas');img.width=img.height=pad*2+1;const g=img.getContext('2d'),steps=Math.max(8,Math.ceil(Math.abs(b-a)*radius*1.4));g.fillStyle=color;for(let i=0;i<=steps;i++){if(dash&&Math.floor(i/5)%2)continue;const t=a+(b-a)*i/steps;g.fillRect(Math.round(pad+Math.cos(t)*radius)-half,Math.round(pad+Math.sin(t)*radius)-half,thick,thick);}if(arcCache.size>=256)arcCache.delete(arcCache.keys().next().value);arcCache.set(key,img);}ctx.drawImage(img,X(x)-pad,Y(y)-pad);}

function disk(x,y,r,color){const cx=X(x),cy=Y(y),rr=Math.max(1,Math.round(r*unit));ctx.fillStyle=color;for(let y=-rr;y<=rr;y++){const span=Math.floor(Math.sqrt(rr*rr-y*y));ctx.fillRect(cx-span,cy+y,span*2+1,1);}}
function polygon(points,color){const ps=points.map(([x,y])=>[X(x),Y(y)]),min=Math.max(0,Math.min(...ps.map(p=>p[1]))),max=Math.min(ch-1,Math.max(...ps.map(p=>p[1])));ctx.fillStyle=color;for(let y=min;y<=max;y++){const xs=[];for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a[1]>y)!==(b[1]>y))xs.push(Math.round(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1])));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)ctx.fillRect(xs[i],y,xs[i+1]-xs[i]+1,1);}}
const sizedSprites=new Map(),trimmedSprites=new WeakMap();let spriteOpacity=1;
function trimmed(img){let result=trimmedSprites.get(img);if(result)return result;const pixels=img.getContext('2d').getImageData(0,0,img.width,img.height).data;let left=img.width,top=img.height,right=0,bottom=0;for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if(pixels[(y*img.width+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}const image=document.createElement('canvas');image.width=Math.max(1,right-left+1);image.height=Math.max(1,bottom-top+1);image.getContext('2d').drawImage(img,left,top,image.width,image.height,0,0,image.width,image.height);result={image,x:left,y:top};trimmedSprites.set(img,result);return result;}
function stamp(id,x,y,size,angle=0,flame=-1,flash=false,dim=false,prep=-1){if(!visible(x,y,size))return;const direction=directionFrame(angle),s=Math.max(1,Math.round(size*unit)),key=id+':'+direction+':'+flame+':'+s+':'+Number(flash)+(dim?':dim':'')+(prep>=0?':prep'+prep:'')+(spriteOpacity<1?':a'+spriteOpacity:'');let img=sizedSprites.get(key);if(!img){const base=sprite(id,direction,flame);img=document.createElement('canvas');img.width=img.height=s;const c=img.getContext('2d');c.imageSmoothingEnabled=false;c.globalAlpha=spriteOpacity;const inset=prep<0?0:Math.floor((prep+1)*s*.045);c.drawImage(flash?whiteSprite(base):dim?dimSprite(base):base,inset,0,s-inset*2,s);sizedSprites.set(key,img);}const crop=trimmed(img);ctx.drawImage(crop.image,X(x)-Math.floor(s/2)+crop.x,Y(y)-Math.floor(s/2)+crop.y);}
const dims=new WeakMap();
function dimSprite(img){let c=dims.get(img);if(c)return c;c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='#10131d';g.globalAlpha=.38;g.fillRect(0,0,c.width,c.height);dims.set(img,c);return c;}
const whites=new WeakMap();
function whiteSprite(img){let c=whites.get(img);if(c)return c;c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fff4dc';g.fillRect(0,0,c.width,c.height);whites.set(img,c);return c;}
const outlines=new WeakMap();
function outlined(img){let c=outlines.get(img);if(c)return c;c=document.createElement('canvas');c.width=img.width+2;c.height=img.height+2;const g=c.getContext('2d'),white=whiteSprite(img);for(const [x,y] of [[0,1],[2,1],[1,0],[1,2]])g.drawImage(white,x,y);g.drawImage(img,1,1);outlines.set(img,c);return c;}
let enemyOpacity=1,crowdDim=false,layerCanvas;
function layer(draw,opacity){
 if(ctx.pixelLayer){ctx.pixelLayer(draw,opacity);return;}
 if(opacity>=1){draw();return;}if(!layerCanvas)layerCanvas=document.createElement('canvas');layerCanvas.pixelDynamic=true;
 if(layerCanvas.width!==cw||layerCanvas.height!==ch){layerCanvas.width=cw;layerCanvas.height=ch;}
 const main=ctx,g=layerCanvas.getContext('2d');g.clearRect(0,0,cw,ch);g.imageSmoothingEnabled=false;ctx=g;draw();ctx=main;ctx.globalAlpha=opacity;ctx.drawImage(layerCanvas,0,0);ctx.globalAlpha=1;
}
let seed=381992;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const stars=Array.from({length:180},(_,i)=>({x:rand()*1600,y:rand()*1100,l:i%3,t:rand()*TAU}));
function combatPhoto(img){let photo=combatPhotos.get(img);if(photo)return photo;const base=ditherPhoto(img),ca=document.createElement('canvas');ca.width=base.width;ca.height=base.height;const g=ca.getContext('2d');g.drawImage(base,0,0);const data=g.getImageData(0,0,ca.width,ca.height);for(let i=0;i<data.data.length;i+=4){const gray=data.data[i]*.22+data.data[i+1]*.7+data.data[i+2]*.08;for(let c=0;c<3;c++)data.data[i+c]=Math.round(data.data[i+c]*.5+gray*.5);}g.putImageData(data,0,0);combatPhotos.set(img,ca);return ca;}
function lowPhoto(img){let photo=lowPhotos.get(img);if(photo)return photo;photo=document.createElement('canvas');photo.width=Math.min(320,img.width);photo.height=Math.max(1,Math.round(img.height*photo.width/img.width));const g=photo.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(img,0,0,photo.width,photo.height);lowPhotos.set(img,photo);return photo;}
function background(G){if(G?.expedition&&['launch','atmosphere','village'].includes(G.chapter?.id)){drawEarth(ctx,G,cw,ch,v.camX,v.camY,unit,v.time,lowQuality);return;}rect(0,0,cw,ch,'#111620');const img=v.images?.[PHOTOS[G?.sector||0]];if(img?.complete&&img.width){let photo=G?combatPhoto(img):ditherPhoto(img);if(lowQuality)photo=lowPhoto(photo);const s=Math.max(cw/photo.width,ch/photo.height)*1.12,w=Math.round(photo.width*s),h=Math.round(photo.height*s);ctx.globalAlpha=G?.3:.78;ctx.drawImage(photo,Math.round((cw-w)/2-Math.sin(v.camX*.0002)*cw*.025),Math.round((ch-h)/2-Math.cos(v.camY*.0002)*ch*.025),w,h);ctx.globalAlpha=1;}
 for(let i=0;i<stars.length;i+=lowQuality?2:1){const s=stars[i],z=(s.l+1)*.012,x=((s.x-v.camX*z)/zoom%cw+cw)%cw,y=((s.y-v.camY*z)/zoom%ch+ch)%ch;const bright=Math.sin(v.time*(.5+s.l*.5)+s.t)>.5;rect(x,y,s.l===2&&bright?2:1,1,bright?'#c3c9c6':s.l?'#687987':'#3b4758');if(s.l===2&&bright)rect(x,y-1,1,3,'#8799a3');}
}
function cloud(kind){let ca=cloudCache.get(kind);if(ca)return ca;ca=document.createElement('canvas');ca.width=ca.height=96;const c=ca.getContext('2d'),colors={emission:['#51303d','#663944','#7b4651'],reflection:['#293e60','#354f78','#496487'],dark:['#11131e','#191923','#25222a'],core:['#514637','#74604b','#a38d65'],elliptical:['#4e4139','#71604d','#a28d6b'],spiral:['#2f3c52','#455875','#798797'],irregular:['#2b443f','#3d5c51','#708a66']}[kind]||['#293e60','#354f78','#496487'];
 for(let y=0;y<96;y++)for(let x=0;x<96;x++){const dx=(x-48)/45,dy=(y-48)/(kind==='elliptical'?25:40);let d=dx*dx+dy*dy+(Math.sin(x*.25)+Math.sin(y*.31))*.1;if(kind==='spiral'){const r=Math.hypot(dx,dy);d=r<.25?r*2:r*.7+Math.abs(Math.sin(Math.atan2(dy,dx)-r*5))*.85;}if(kind==='irregular')d=Math.min((dx+.4)**2+(dy+.3)**2,(dx-.32)**2+(dy+.12)**2,(dx+.03)**2+(dy-.4)**2)*1.8+(Math.sin(x*.4)+Math.cos(y*.36))*.14;if(d>1.1)continue;const stipple=bayer[(y%4)*4+x%4]/16;if(d>.65&&stipple<(d-.6)*2)continue;c.fillStyle=kind==='core'&&(x*41+y*23)%97===0&&d<.95?'#dfd3b4':colors[Math.min(2,Math.floor((1.1-d)*2.5))];c.fillRect(x,y,1,1);}
 cloudCache.set(kind,ca);return ca;
}
function terrain(G){for(const t of G.terrain||[]){if(!visible(t.x,t.y,(t.R||t.r)*1.4))continue;
 if(t.kind==='mark'){stamp('xp',t.x,t.y,20);continue;}
 if(t.kind==='galaxy'){for(const [width,color] of [[170,'#263347'],[90,'#35445c'],[32,'#67718b']])for(const arm of t.arms||[])for(let i=1;i<arm.length;i++)wline(...arm[i-1],...arm[i],color,width);for(const arm of t.arms||[])for(let i=0;i<arm.length;i+=3){const q=arm[i];rect(X(q[0])+(i*7%7)-3,Y(q[1])+(i*11%9)-4,1,1,'#bcc6ca');}beam(t.x-t.bar,t.y,0,t.bar*2,t.bar*.6,'#5b5147');beam(t.x-t.bar,t.y,0,t.bar*2,t.bar*.17,'#b09a73');disk(t.x,t.y,95,'#b9a17a');if(!t.sun.found){stamp('xp',t.sun.x,t.sun.y,40);arc(t.sun.x,t.sun.y,60,0,TAU,'#ffd260',3,true);}continue;}
 if(t.kind==='bluestars'){arc(t.x,t.y,t.r,0,TAU,'#587395',3,true);for(const s of t.stars||[]){rect(X(t.x+s[0])-1,Y(t.y+s[1])-1,3,3,'#aec4de');line(X(t.x+s[0])-3,Y(t.y+s[1]),X(t.x+s[0])+3,Y(t.y+s[1]),'#d7e6ec');}continue;}
 const img=cloud(t.kind),r=t.r||200,w=Math.round(r*2.3*unit);ctx.globalAlpha=t.kind==='dark'?.96:.7;ctx.drawImage(img,X(t.x)-Math.floor(w/2),Y(t.y)-Math.floor(w/2),w,w);ctx.globalAlpha=1;
 if(t.kind!=='dark')arc(t.x,t.y,r,0,TAU,{emission:'#bc6471',reflection:'#7196c5',core:'#b6a073',elliptical:'#a98e68',spiral:'#7187a6',irregular:'#85ac8f'}[t.kind]||'#8278ac',2,true);
}}
function beam(x,y,a,len,width,color){const dx=Math.cos(a),dy=Math.sin(a),nx=-dy*width/2,ny=dx*width/2;polygon([[x+nx,y+ny],[x+dx*len+nx,y+dy*len+ny],[x+dx*len-nx,y+dy*len-ny],[x-nx,y-ny]],color);}
function gapAngle(gaps,width,a){return gaps.some(g=>Math.abs(Math.atan2(Math.sin(a-g),Math.cos(a-g)))<width/2);}
function ring(x,y,r,gaps,gw,color,width,warning){const steps=Math.max(60,Math.ceil(r*unit*TAU));for(let i=0;i<steps;i++){const a=i/steps*TAU;if(gapAngle(gaps,gw,a))continue;const size=Math.max(1,Math.round(width*unit));rect(X(x+Math.cos(a)*r)-Math.floor(size/2),Y(y+Math.sin(a)*r)-Math.floor(size/2),size,size,color);}}
function hazards(G){for(const h of G.hazards||[]){if(h.age<h.warning||h.duration<=0)continue;const color=h.age-h.warning<1/60?'#f4ecdc':'#d06a79',a=h.angle||0;
 if(h.type==='sweep'){const angle=a+h.spin*(h.age-h.warning);beam(h.x-Math.cos(angle)*h.length,h.y-Math.sin(angle)*h.length,angle,h.length*2,h.width,color);beam(h.x-Math.cos(angle)*h.length,h.y-Math.sin(angle)*h.length,angle,h.length*2,4,'#f4dbcc');}
 else if(h.type==='shell'){const r=h.r0+(h.r1-h.r0)*clamp((h.age-h.warning)/h.duration,0,1);ring(h.x,h.y,r,h.gaps||[],h.gapW||.6,color,h.width,false);ring(h.x,h.y,r,h.gaps||[],h.gapW||.6,'#f4dbcc',3,false);}
 else if(h.type==='laser'){beam(h.x,h.y,a,h.length,h.width,color);beam(h.x,h.y,a,h.length,4,'#f4dbcc');}
}}
function hpBar(e,width,y,color){if(e.hp>=e.maxHp)return;const x=X(e.x)-Math.round(width*unit/2),yy=Y(y),w=Math.max(8,Math.round(width*unit));rect(x-1,yy-1,w+2,4,'#10131d');rect(x,yy,w,2,'#3c2936');rect(x,yy,w*clamp(e.hp/e.maxHp,0,1),2,color);}
function enemies(G){for(const e of G.enemies||[]){if(e.hp<=0||!visible(e.x,e.y,e.r*3))continue;const boss=e.type==='boss'||e.type==='decoy',angle=(e.angle||0)+Math.PI/2;ctx.globalAlpha=enemyOpacity*(e.hidden?(e.warnTime>0?.65:.18):e.type==='decoy'?.55:1);
 if(e.elite){const i=['swift','armored','mending','volatile','echo'].indexOf(e.prefix),color=['#79d8f2','#e8f1e9','#8af0a2','#f0a33a','#bd82ee'][Math.max(0,i)];arc(e.x,e.y,e.r*1.45,0,TAU,color,5);damage(combatCopy(lang).elites[Math.max(0,i)],e.x,e.y-e.r*1.8,color,false);}
 if(e.shielded){const a=directionFrame(e.angle)*TAU/16;arc(e.x,e.y,e.r*1.35,a-1.1,a+1.1,'#91a6b2',6);}
 const prep=e.warnTime>0?windupFrame(e):-1,pull=prep<0?0:(prep+1)*e.r*.1,ex=pull?e.x-Math.cos(e.angle)*pull:e.x,ey=pull?e.y-Math.sin(e.angle)*pull:e.y;if(!(G.expedition&&drawEarthEnemy(ctx,G,e,X(ex),Y(ey),Math.max(1,Math.round(e.r*(boss?3.8:3.5)*unit)))))stamp(boss?'boss:'+(e.bossArt??G.sector)+':'+(e.phase||0):'enemy:'+e.type,ex,ey,e.r*(boss?3.8:3.5),angle,-1,e.flash>0||e.attackFlash>0,crowdDim&&!boss,prep);ctx.globalAlpha=enemyOpacity;
 if(prep>=0){const a=e.action?e.actionAngle:e.angle;rect(X(e.x+Math.cos(a)*e.r*.5)-1,Y(e.y+Math.sin(a)*e.r*.5)-1,2,2,prep===2?'#efe7d7':'#ba8b80');if(e.elite){const x=X(e.x),y=Y(e.y-e.r*1.8);rect(x,y-4,1,2,'#ead2bd');rect(x,y-1,1,1,'#ead2bd');}}
 if(e.status?.freeze>0)arc(e.x,e.y,e.r*1.2,0,TAU,'#79d8f2',4,true);if(e.status?.burn>0)rect(X(e.x)-2,Y(e.y-e.r)-3,4,4,'#f0a33a');if(e.status?.shock>0)rect(X(e.x)+3,Y(e.y-e.r),2,4,'#f6d454');if(e.status?.mark>0){arc(e.x,e.y,e.r*1.35,0,TAU,'#bd82ee',4,true);wline(e.x-20,e.y,e.x+20,e.y,'#bd82ee',5);wline(e.x,e.y-20,e.x,e.y+20,'#bd82ee',5);}
 if(e.stageGuard>0)arc(e.x,e.y,e.r*1.65,0,TAU,'#ffe1f7',4,true);
 if(e.mirror>0){ring(e.x,e.y,e.r*1.65,[],0,'#d8c8ee',5,false);}
 if(!boss)hpBar(e,e.r*2,e.y+e.r*1.6,'#cf797b');
}ctx.globalAlpha=1;}
function warningPart(q){
 if(q.kind==='sight'){ctx.globalAlpha=q.opacity;wline(q.x,q.y,q.x+Math.cos(q.angle)*q.length,q.y+Math.sin(q.angle)*q.length,'#b98286',1/unit);ctx.globalAlpha=1;return;}
 if(q.kind==='wall'){const a=q.angle,dx=Math.cos(a),dy=Math.sin(a);for(const [lo,hi] of [[-450,q.gap-80],[q.gap+80,450]]){const x=q.x+dx*80-dy*lo,y=q.y+dy*80+dx*lo;paintWarning(ctx,{...q,kind:'strip',angle:a+Math.PI/2,length:hi-lo},X(x),Y(y),unit);}return;}
 paintWarning(ctx,q,X(q.x),Y(q.y),unit);
 if(q.kind==='ring'&&q.gaps.length){ctx.globalAlpha=q.flash?1:q.opacity;for(const gap of q.gaps)for(const side of [-1,1]){const a=gap+side*q.gapWidth/2,r=q.radius;line(X(q.x+Math.cos(a)*(r-5)),Y(q.y+Math.sin(a)*(r-5)),X(q.x+Math.cos(a)*(r+5)),Y(q.y+Math.sin(a)*(r+5)),q.flash?'#f4ecdc':q.color,1);}ctx.globalAlpha=1;}
}
function enemyWarnings(G,settings){const shapes=warningShapes(G,settings.telegraphs??G.telegraphs??'boss');for(const q of shapes){warningPart(q);if(!q.boss)continue;const x=X(q.sourceX),y=Y(q.sourceY);if(x>=0&&x<cw&&y>=0&&y<ch)continue;const a=Math.atan2(y-ch/2,x-cw/2),edge=Math.min((cw/2-10)/Math.max(.01,Math.abs(Math.cos(a))),(ch/2-10)/Math.max(.01,Math.abs(Math.sin(a)))),cx=Math.round(cw/2+Math.cos(a)*edge),cy=Math.round(ch/2+Math.sin(a)*edge);for(const side of [-1,1])line(cx,cy,cx-Math.cos(a+side*.65)*6,cy-Math.sin(a+side*.65)*6,q.flash?'#f4ecdc':q.color,1);}}
const digits={A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['011','100','100','100','011'],D:['110','101','101','101','110'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],G:['011','100','101','101','011'],H:['101','101','111','101','101'],I:['111','010','010','010','111'],J:['011','001','001','101','010'],K:['101','101','110','101','101'],L:['100','100','100','100','111'],M:['101','111','111','101','101'],N:['101','111','111','111','101'],O:['010','101','101','101','010'],P:['110','101','110','100','100'],Q:['010','101','101','111','011'],R:['110','101','110','101','101'],S:['011','100','010','001','110'],T:['111','010','010','010','010'],U:['101','101','101','101','111'],V:['101','101','101','101','010'],W:['101','101','111','111','101'],X:['101','101','010','101','101'],Y:['101','101','010','010','010'],Z:['111','001','010','100','111'],0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','010','010','010'],8:['111','101','111','101','111'],9:['111','101','111','001','111'],'-':['000','000','111','000','000']};
const numberCache=new Map();
function damage(text,x,y,color,big){const s=big?2:1,key=text+':'+color+':'+s;let img=numberCache.get(key);if(!img){img=document.createElement('canvas');img.width=text.length*4*s+2;img.height=5*s+2;const g=img.getContext('2d'),blocks=[];for(let k=0;k<text.length;k++){const rows=digits[text[k]];if(!rows)continue;for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(rows[j][i]==='1')blocks.push([1+(k*4+i)*s,1+j*s]);}g.fillStyle='#080b11';for(const [x,y] of blocks)g.fillRect(x-1,y-1,s+2,s+2);g.fillStyle=color;for(const [x,y] of blocks)g.fillRect(x,y,s,s);if(numberCache.size>=256)numberCache.delete(numberCache.keys().next().value);numberCache.set(key,img);}ctx.drawImage(img,X(x)-Math.floor(text.length*4*s/2)-1,Y(y)-1);}
const blastRows=['.......5......./......565....../.......5.......','......555....../....5566555..../...566666665.../....5566555..../......555......','...5.......5.../....5555555..../..5566666555.../.556668666655./..5566666555.../....5555555..../...5.......5...','..55.......55../.5555.....5555./..555.....555../....55...55..../..555.....555../.5555.....5555./..55.......55..','..5.........5../.....5...5...../..5.........5../.............../....5.....5....'];
const blastCache=new Map();
function blast(frame){if(blastCache.has(frame))return blastCache.get(frame);const ca=document.createElement('canvas');ca.width=ca.height=20;const c=ca.getContext('2d'),rows=blastRows[frame].split('/');for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(rows[y][x]!=='.'){c.fillStyle={'5':'#e1844b','6':'#ffd878','8':'#fff6d2'}[rows[y][x]];c.fillRect(x+2,y+5,1,1);}blastCache.set(frame,ca);return ca;}
export function consumeEvents(events){for(const e of events){if(e.kind==='kill'&&explosions.length<40)explosions.push({x:e.x,y:e.y,birth:lastTime});if(e.kind==='hit'&&sparks.length<32)sparks.push({x:e.x,y:e.y,birth:lastTime});if(e.kind==='level'&&levelBursts.length<3)levelBursts.push({x:e.x,y:e.y,birth:lastTime});}}
function weaponLine(e,color,evolved){
 const dx=e.x2-e.x,dy=e.y2-e.y,angle=Math.atan2(dy,dx),frame=Math.floor(v.time*30);
 if(e.weapon==='chain'||e.weapon==='tether'){
  let x=e.x,y=e.y;for(let k=1;k<=4;k++){const offset=k===4?0:Math.sin(k*7+frame*2)*13,nx=e.x+dx*k/4-Math.sin(angle)*offset,ny=e.y+dy*k/4+Math.cos(angle)*offset;wline(x,y,nx,ny,color,evolved?7:5);wline(x,y,nx,ny,'#fffbed',2);x=nx;y=ny;}
  pixelStamp('projectile:chain:'+Number(evolved)+':'+frame,e.x2,e.y2,angle+Math.PI/2);
 }else{
  wline(e.x,e.y,e.x2,e.y2,color,(evolved?9:6)+(e.weapon==='laser'?frame:0));wline(e.x,e.y,e.x2,e.y2,'#fffbed',2);
  if(e.weapon==='laser')pixelStamp('projectile:laser:'+Number(evolved)+':'+frame,e.x+dx*.06,e.y+dy*.06,angle+Math.PI/2);
 }
}
const groundCache=new Map();let groundPixels=0;
function groundImage(e,r){
 const frame=Math.floor(v.time*12)%15,key=e.weapon+':'+r+':'+frame+':'+Number(lowQuality)+':'+fxPressure+':'+e.color;let img=groundCache.get(key);if(img)return img;
 const pad=r+6;img=document.createElement('canvas');img.width=img.height=pad*2+1;const g=img.getContext('2d'),step=lowQuality||fxPressure===2?10:7,phase=Math.floor(frame*5/12)%3;
 for(let dy=-r;dy<=r;dy+=step)for(let dx=-r;dx<=r;dx+=step)if(dx*dx+dy*dy<r*r){const k=Math.abs(dx+dy+phase)%3;g.fillStyle=k===0?e.color:e.weapon==='flame'?'#713b52':'#293342';if(e.weapon==='frost'){g.fillRect(pad+dx,pad+dy,4,2);if(k===0)g.fillRect(pad+dx+1,pad+dy-1,2,4);}else if(e.weapon==='flame')g.fillRect(pad+dx,pad+dy-Math.floor((frame+dx)%5),2,k===0?5:3);else g.fillRect(pad+dx,pad+dy,k===0?4:3,k===0?3:2);}
 const pixels=img.width*img.height;while(groundCache.size&&(groundPixels+pixels>1048576||groundCache.size>=128)){const first=groundCache.keys().next().value,old=groundCache.get(first);groundPixels-=old.width*old.height;groundCache.delete(first);}if(pixels<=1048576){groundPixels+=pixels;groundCache.set(key,img);}return img;
}
const effectSprites=new Map();let effectPixels=0;
function battleEffect(e,age){
 if(!['ground','gravity','blast','ripple','wave','quake','mark','resonance','shatter'].includes(e.kind))return rawBattleEffect(e,age);
 const radius=Math.max(8,Math.round(e.radius*unit/4)*4),frame=Math.floor(v.time*12)%3,phase=['ground','gravity','wave','mark'].includes(e.kind)?0:e.kind==='quake'?Math.floor(age*7)%2/7:Math.floor(age*12)/12,key=[e.kind,radius,e.color,e.weapon,frame,phase,unit,lowQuality,fxPressure].join(':');
 let image=effectSprites.get(key);
 if(!image){
  const pad=Math.min(600,radius+25);image=document.createElement('canvas');image.width=image.height=pad*2+1;
  const original={ctx,v,cw,ch};ctx=image.getContext('2d');ctx.imageSmoothingEnabled=false;v={...v,camX:e.x,camY:e.y,time:frame/12};cw=ch=image.width;
  rawBattleEffect({...e,radius:radius/unit},phase);ctx=original.ctx;v=original.v;cw=original.cw;ch=original.ch;
  const pixels=image.width*image.height;while(effectSprites.size&&(effectPixels+pixels>8388608||effectSprites.size>=512)){const first=effectSprites.keys().next().value,old=effectSprites.get(first);effectPixels-=old.width*old.height;effectSprites.delete(first);}effectPixels+=pixels;effectSprites.set(key,image);
 }
 ctx.drawImage(image,X(e.x)-Math.floor(image.width/2),Y(e.y)-Math.floor(image.height/2));return true;
}
function rawBattleEffect(e,age){
 const x=X(e.x),y=Y(e.y),r=Math.max(3,Math.round(e.radius*unit)),color=e.color;
 if(e.kind==='ground'){
  if(!visible(e.x,e.y,e.radius))return true;const img=groundImage(e,r);ctx.drawImage(img,x-Math.floor(img.width/2),y-Math.floor(img.height/2));
  arc(e.x,e.y,e.radius,0,TAU,color,4,true);return true;
 }
 if(e.kind==='gravity'){
  arc(e.x,e.y,e.radius*.8,0,TAU,color,5,true);for(let arm=0;arm<3;arm++)for(let j=0,points=fxPressure===2?8:13;j<points;j++){const t=(j/points+v.time*.7)%1,a=arm*TAU/3+t*7-v.time*2,rr=r*(1-t);rect(x+Math.round(Math.cos(a)*rr),y+Math.round(Math.sin(a)*rr),2,2,color);}
  disk(e.x,e.y,35,'#090c14');arc(e.x,e.y,43,0,TAU,color,8);return true;
 }
 if(e.kind==='blast'){
  if(age<.07){rect(x-4,y-4,8,8,'#e8f1e9');return true;}
  if(age<.6)arc(e.x,e.y,e.radius*Math.min(1,age*1.9),0,TAU,color,age<.25?10:6);
  for(let i=0;i<8;i++){const a=i*TAU/8,rr=r*(.3+age*.8),s=age<.6?3:4;rect(x+Math.cos(a)*rr,y+Math.sin(a)*rr,s,s,age<.6?color:'#526579');}return true;
 }
 if(e.kind==='ripple'||e.kind==='wave'){
  const radius=e.radius*(e.kind==='wave'?.38:age);arc(e.x,e.y,radius,0,TAU,color,7);arc(e.x+Math.sin(v.time*23)*5,e.y+Math.cos(v.time*21)*5,radius*.9,0,TAU,'#526579',5,true);return true;
 }
 if(e.kind==='quake'){
  for(let i=fxPressure===2?-1:-2;i<=(fxPressure===2?1:2);i++){const a=i*.65+Math.floor(age*7)%2*.1;wline(e.x-Math.cos(a)*e.radius,e.y-Math.sin(a)*e.radius,e.x+Math.cos(a)*e.radius,e.y+Math.sin(a)*e.radius,color,6,true);}return true;
 }
 if(e.kind==='tether'){weaponLine(e,color,true);return true;}
 if(e.kind==='mark'){arc(e.x,e.y,e.radius,0,TAU,color,5,true);wline(e.x-24,e.y,e.x+24,e.y,color,5);wline(e.x,e.y-24,e.x,e.y+24,color,5);return true;}
 if(e.kind==='turret'){pixelStamp('projectile:turret:0:0',e.x,e.y);arc(e.x,e.y,55,0,TAU,color,4,true);return true;}
 if(e.kind==='resonance'){for(let i=0;i<3;i++)arc(e.x,e.y,e.radius*((age*3+i/3)%1),0,TAU,color,6);return true;}
 if(e.kind==='shatter'){for(let i=0;i<8;i++){const a=i*TAU/8,rr=r*age;rect(x+Math.cos(a)*rr,y+Math.sin(a)*rr,3,5,color);}return true;}
 if(e.kind==='splitwarn')return true;
 return false;
}
function effects(G,settings){for(const [index,e] of (G.effects||[]).entries()){if(lowQuality&&index>=48)continue;if(e.kind==='ring'&&e.radius<160&&(fxPressure===2?index%4!==0:fxPressure===1&&index%2))continue;if(e.kind==='level'||!visible(e.x,e.y,e.radius))continue;const age=1-e.ttl/e.life,evolved=G.weapons?.some(w=>w.id===e.weapon&&w.evolved),color=e.color;if(e.kind==='ground')continue;if(battleEffect(e,age))continue;if(e.kind==='line'){weaponLine(e,color,evolved);}else if(e.kind==='mine'){pixelStamp('projectile:mine:'+Number(evolved)+':'+(Math.floor(v.time*10)%3),e.x,e.y);arc(e.x,e.y,e.radius,0,TAU,'#956c63',2,true);}else{arc(e.x,e.y,Math.max(1,e.radius*age),0,TAU,color,e.kind==='evolve'?7:4);if(e.kind==='evolve')arc(e.x,e.y,e.radius*age*.7,0,TAU,color,3);}}
 for(let i=sparks.length-1;i>=0;i--){const e=sparks[i],age=v.time-e.birth;if(age>.14){sparks.splice(i,1);continue;}const x=X(e.x),y=Y(e.y),r=2+Math.floor(age*20);rect(x-1,y-1,3,3,'#fff8d2');for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]])rect(x+dx*r,y+dy*r,1,1,'#efbb71');}
 for(let i=explosions.length-1;i>=0;i--){const e=explosions[i],frame=Math.floor((v.time-e.birth)*14);if(frame>=5){explosions.splice(i,1);continue;}if(frame>=0&&visible(e.x,e.y,50)){const img=blast(settings.reduced?Math.min(3,frame):frame);ctx.drawImage(img,X(e.x)-10,Y(e.y)-10);}}
 for(const [index,p] of (G.particles||[]).entries()){if(lowQuality&&index>=60)break;if(p.r<=3&&(fxPressure===2?index%4!==0:fxPressure===1&&index%2))continue;if(!visible(p.x,p.y,15))continue;const s=Math.max(2,Math.round(p.r*unit));rect(X(p.x),Y(p.y),s,s,p.color||'#ffd6a0');}
}
function floaters(G){for(const f of (G.floaters||[]).slice(0,lowQuality?12:24)){if(!visible(f.x,f.y,40))continue;const heavy=Number(f.text)>=75;damage(f.text,f.x,f.y,heavy?'#ffd260':f.color||'#eef2f8',heavy);}
}
function darkness(G){const p=G.player;if(!p?.inDark&&!G.blackout)return;const cx=X(p.x),cy=Y(p.y),r=(G.blackout>0?200:230)*unit;for(let y=0;y<ch;y+=4)for(let x=0;x<cw;x+=4){const d=Math.hypot(x-cx,y-cy);if(d>r*1.9)rect(x,y,4,4,'#090c14');else if(d>r*.6&&bayer[((y/4)%4)*4+(x/4)%4]/16<(d/r-.6)/1.3)rect(x,y,4,4,'#090c14');}}
let miniFrame=0;
function minimap(G){if(!mctx||miniFrame++%3)return;const w=mini.width,h=mini.height,s=Math.min((w-8)/4800,(h-8)/3200),mx=x=>Math.round((w-4800*s)/2+x*s),my=y=>Math.round((h-3200*s)/2+y*s);mctx.imageSmoothingEnabled=false;mctx.fillStyle='#171d2a';mctx.fillRect(0,0,w,h);for(const t of G.terrain||[]){if(t.kind==='galaxy'){mctx.fillStyle='#71809b';for(const arm of t.arms||[])for(const q of arm)mctx.fillRect(mx(q[0]),my(q[1]),1,1);mctx.fillStyle='#c8ad76';mctx.fillRect(mx(t.x-t.bar),my(t.y)-1,Math.max(2,Math.round(t.bar*2*s)),2);if(!t.sun.found){mctx.fillStyle='#ffd260';mctx.fillRect(mx(t.sun.x)-1,my(t.sun.y)-1,3,3);}continue;}mctx.fillStyle={emission:'#71464e',reflection:'#425877',dark:'#0a0d16',core:'#8d7960',bluestars:'#6c8baa'}[t.kind]||'#55526c';const r=Math.max(2,Math.round((t.r||50)*s));mctx.fillRect(mx(t.x)-r,my(t.y)-r,r*2,r*2);}for(const e of G.enemies||[]){if(e.hp<=0)continue;mctx.fillStyle=e.type==='boss'?'#ffb786':'#c26c7c';const k=e.type==='boss'?3:1;mctx.fillRect(mx(e.x)-k,my(e.y)-k,k*2,k*2);}for(const d of G.drops||[]){mctx.fillStyle='#ffd260';mctx.fillRect(mx(d.x)-2,my(d.y)-2,4,4);}if(G.beacon){mctx.fillStyle='#a9dfcf';mctx.fillRect(mx(G.beacon.x)-2,my(G.beacon.y)-2,4,4);}mctx.fillStyle='#edf4e9';mctx.fillRect(mx(G.player.x)-2,my(G.player.y)-2,4,4);}
function arrows(G){const targets=[];if(G.beacon?.hp>0)targets.push([G.beacon,'#a9dfcf']);const boss=G.enemies.find(e=>e.type==='boss'&&e.hp>0);if(boss)targets.push([boss,'#ef8b85']);const gal=G.terrain.find(t=>t.kind==='galaxy');if(gal&&!gal.sun.found&&!boss)targets.push([gal.sun,'#ffe08a']);for(const [e,color] of targets){const x=X(e.x),y=Y(e.y);if(x>20&&x<cw-20&&y>40&&y<ch-45)continue;const a=Math.atan2(y-ch/2,x-cw/2),dx=Math.cos(a),dy=Math.sin(a),f=Math.min((cw/2-20)/(Math.abs(dx)||1),(ch/2-45)/(Math.abs(dy)||1)),px=Math.round(cw/2+dx*f),py=Math.round(ch/2+dy*f);line(px-dx*7-dy*4,py-dy*7+dx*4,px,py,color,2);line(px-dx*7+dy*4,py-dy*7-dx*4,px,py,color,2);}}
const pixelImages=new Map();let enlarged=true;
function pixelImage(id,angle=0,scale=1){
 const direction=directionFrame(angle),key=id+':'+direction+':'+scale+':'+spriteOpacity;let cached=pixelImages.get(key);
 if(!cached){
  const base=sprite(id,direction),data=base.getContext('2d').getImageData(0,0,base.width,base.height).data;let left=base.width,top=base.height,right=0,bottom=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++)if(data[(y*base.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const image=document.createElement('canvas'),w=right-left+1,h=bottom-top+1;image.width=Math.max(1,Math.round(w*scale));image.height=Math.max(1,Math.round(h*scale));const c=image.getContext('2d');c.imageSmoothingEnabled=false;c.globalAlpha=spriteOpacity;c.drawImage(base,left,top,w,h,0,0,image.width,image.height);
  cached={image,x:Math.round((left-base.width/2)*scale),y:Math.round((top-base.height/2)*scale)};if(pixelImages.size>4096)pixelImages.clear();pixelImages.set(key,cached);
 }
 return cached;
}
function pixelStamp(id,x,y,angle=0,scale=1){if(!visible(x,y,45))return;const cached=pixelImage(id,angle,scale);ctx.drawImage(cached.image,X(x)+cached.x,Y(y)+cached.y);}
let batchCanvas,batchData,batchWords;
function pixelBatch(items,idFor,angleFor=()=>0,scale=1){
 if(ctx.backend==='WebGL'||items.length<64){for(const b of items)pixelStamp(idFor(b),b.x,b.y,angleFor(b),scale);return;}
 if(!batchCanvas){batchCanvas=document.createElement('canvas');batchCanvas.pixelDynamic=true;}
 if(batchCanvas.width!==cw||batchCanvas.height!==ch||!batchData){batchCanvas.width=cw;batchCanvas.height=ch;batchData=batchCanvas.getContext('2d').createImageData(cw,ch);batchWords=new Uint32Array(batchData.data.buffer);}
 batchWords.fill(0);
 for(const b of items){if(!visible(b.x,b.y,45))continue;const stamp=pixelImage(idFor(b),angleFor(b),scale),im=stamp.image;
  if(!stamp.words){const data=im.getContext('2d').getImageData(0,0,im.width,im.height);stamp.words=new Uint32Array(data.data.buffer);}
  const ox=X(b.x)+stamp.x,oy=Y(b.y)+stamp.y,src=stamp.words,iw=im.width,ih=im.height;
  for(let y=Math.max(0,-oy);y<ih&&y+oy<ch;y++)for(let x=Math.max(0,-ox);x<iw&&x+ox<cw;x++){
   const color=src[y*iw+x],alpha=color>>>24;if(!alpha)continue;const i=(y+oy)*cw+x+ox;
   if(alpha===255||!batchWords[i])batchWords[i]=color;
   else{const dst=batchWords[i],da=dst>>>24,inv=255-alpha,out=alpha+da*inv/255,f=da*inv/255;let result=(Math.round(out)<<24)>>>0;for(let k=0;k<3;k++){const shift=k*8,v=Math.round((((color>>>shift)&255)*alpha+((dst>>>shift)&255)*f)/out);result|=v<<shift;}batchWords[i]=result>>>0;}
  }
 }
 batchCanvas.getContext('2d').putImageData(batchData,0,0);ctx.drawImage(batchCanvas,0,0);
}

function enemyBullet(b){pixelStamp('bullet'+(Math.floor(v.time*8+(b.age||0)*2)%2===0?':spark':''),b.x,b.y,0,enlarged?1:.75);}
function player(G,p,settings){
 if(G.expedition&&G.chapter?.kind==='ground'){
 const a=G.aimAngle??p.angle,d=Math.abs(Math.cos(a))>Math.abs(Math.sin(a))?(Math.cos(a)>0?3:1):(Math.sin(a)>0?0:2),frame=Math.hypot(p.vx,p.vy)>20?Math.floor(v.time*8)%4:0,img=groundCrew(G.crew,d,frame,p.flash>0),x=X(p.x),y=Y(p.y),firing=G.muzzleTime>0,back=Math.sin(a)<-.35;
 const gun=weaponFrame(G.crew,a,firing),recoil=firing?2:0;
 const drawGun=()=>ctx.drawImage(gun,x-17-Math.round(Math.cos(a)*recoil),y-31-Math.round(Math.sin(a)*recoil));
 if(back)drawGun();ctx.drawImage(img,x-18,y-30);if(!back)drawGun();
 line(x-5,y+2,x+5,y+2,'#090d18',3);line(x-4,y+2,x+4,y+2,'#78e1df',1);return;}


 const ang=(p.angle||0)+Math.PI/2,size=Math.max(1,Math.round(76*unit)),cx=X(p.x),cy=Y(p.y);
 if(p.dashTime>0){ctx.globalAlpha=.3;for(let i=1;i<3;i++)stamp('ship:'+p.ship,p.x-Math.cos(p.angle)*i*24,p.y-Math.sin(p.angle)*i*24,76,ang);ctx.globalAlpha=1;}
 if(p.invul>0)arc(p.x,p.y,p.r*1.6,0,TAU,'#aacbd0',2,true);
 const direction=directionFrame(ang),flame=settings.reduced?0:Math.floor(v.time*12)%3;
 const key='ship:'+p.ship+':'+direction+':'+flame+':'+size+':'+Number(p.flash>0);
 stamp('ship:'+p.ship,p.x,p.y,76,ang,flame,p.flash>0);
 const img=sizedSprites.get(key);if(img){const rim=outlined(img);ctx.drawImage(rim,cx-Math.floor(size/2)-1,cy-Math.floor(size/2)-1);}
 // The marker stays outside the hull so its centre can be found in a crowd.
 const foot=cy+Math.max(9,Math.round(29*unit));line(cx-4,foot,cx+4,foot,'#090c14',3);line(cx-3,foot,cx+3,foot,'#c9ffff');rect(cx,foot-2,1,2,'#c9ffff');
 const facing=p.angle??-Math.PI/2;line(cx,foot,cx+Math.cos(facing)*7,foot+Math.sin(facing)*7,'#d9d9c8',1);rect(cx+Math.cos(facing)*7-1,foot+Math.sin(facing)*7-1,2,2,'#f1e8d2');
 if(img)overlapRim(G,p,img,cx-Math.floor(size/2)-1,cy-Math.floor(size/2)-1);
}
let overlapCanvas;
function overlapRim(G,p,img,x,y){
 const near=(G.enemies||[]).filter(e=>e.hp>0&&!e.hidden&&Math.abs(e.x-p.x)<e.r*1.9+38&&Math.abs(e.y-p.y)<e.r*1.9+38);if(!near.length)return;
 if(!overlapCanvas){overlapCanvas=document.createElement('canvas');overlapCanvas.pixelDynamic=true;}const c=overlapCanvas;if(c.width!==img.width+2||c.height!==img.height+2){c.width=img.width+2;c.height=img.height+2;}const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.imageSmoothingEnabled=false;
 for(const e of near){const boss=e.type==='boss'||e.type==='decoy',size=Math.max(1,Math.round(e.r*(boss?3.8:3.5)*unit));g.drawImage(sprite(boss?'boss:'+(e.bossArt??G.sector)+':'+(e.phase||0):'enemy:'+e.type,directionFrame((e.angle||0)+Math.PI/2)),X(e.x)-Math.floor(size/2)-x,Y(e.y)-Math.floor(size/2)-y,size,size);}
 g.globalCompositeOperation='source-in';g.drawImage(outlined(img),0,0);g.globalCompositeOperation='destination-out';g.drawImage(img,1,1);g.globalCompositeOperation='source-in';g.fillStyle='#c9ffff';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';ctx.drawImage(c,x,y);
}
function arrivals(G){
 if(!G.expedition||G.time>=G.swarmUntil)return;
 const id=G.chapter?.id,age=G.time-G.swarmStarted;
 for(const site of G.arrivalSites||[]){
  const x=X(site.x),y=Y(site.y),r=(id==='launch'?35:65)*unit;
  if(site.age<1){arc(site.x,site.y,r/unit,0,TAU,id==='launch'?'#f4c783':'#d68661',2,true);line(x-r,y,x+r,y,'#e4b382',1);line(x,y-r,x,y+r,'#e4b382',1);
   const top=y-(1-site.age)*150*unit;if(id==='launch'){rect(x-5,top-12,10,18,'#323b59');rect(x-3,top-9,6,8,'#c7ac75');line(x,top-20,x,top-13,'#f4cf88',2);}else{rect(x-5,top-7,10,10,'#836862');line(x-20,top-35,x,top,'#e7a35e',3);}
  }else{arc(site.x,site.y,r/unit,0,TAU,'#70566d',4);if(id==='village'){rect(x-r/2,y-4,r,8,'#161522');arc(site.x,site.y,r/unit*.6,0,TAU,'#c38b68',2);}}
 }
 if(id==='atmosphere'){const side=G.swarmIndex%2?1:-1,x=cw/2+side*cw*.4;for(let i=0;i<8;i++){const y=(i*47+age*9)%ch;rect(x-20,y,40,12,'#4c4b75');line(x,y+12,x-5,y+21,'#f3d789',2);line(x-5,y+21,x+4,y+20,'#f3d789',2);}}
 else if(id!=='launch'&&id!=='village'){for(let i=0;i<18;i++){const a=age*.4+i*.35,x=cw/2+Math.cos(a)*(cw*.39+i%3*4),y=ch/2+Math.sin(a)*ch*.38;rect(x,y,6+i%3*2,3,'#778395');line(x,y,x-Math.sin(a)*12,y+Math.cos(a)*12,'#627288',2);}}
}
export function render(G,V,settings={}){setup();if(!ctx||ctx.lost)return;if(canvas.width!==Math.ceil(V.w/Math.max(1,Math.round((V.w<V.h?Math.min(V.w/195,V.h/422):V.h/360))))||canvas.height!==Math.ceil(V.h/Math.max(1,Math.round((V.w<V.h?Math.min(V.w/195,V.h/422):V.h/360)))))resize(V.w,V.h);v={...V};const entrance=G?.bossRecords?.at(-1),intro=entrance?G.time-entrance.spawned:10;if(intro>=0&&intro<1.2&&!settings.reduced)v.scale*=1+.06*Math.sin(intro/1.2*Math.PI);lowQuality=settings.quality==='low';lang=settings.lang||'ko';unit=v.scale/zoom;const shake=settings.reduced?0:Math.min(v.shake||0,8);v.camX-=Math.round(shake*Math.sin(v.time*61)/zoom)/unit;v.camY-=Math.round(shake*Math.cos(v.time*49)/zoom)/unit;ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.globalAlpha=1;background(G);lastTime=v.time;if(!G){ctx.flush?.();return;}if(G.launchAge>=0){if(ctx.backend==='WebGL'){launchCanvas??=document.createElement('canvas');if(launchCanvas.width!==cw||launchCanvas.height!==ch){launchCanvas.width=cw;launchCanvas.height=ch;}launchCanvas.pixelDynamic=true;const c=launchCanvas.getContext('2d');c.clearRect(0,0,cw,ch);drawLaunch(c,G,cw,ch,lowQuality,settings.reduced);ctx.drawImage(launchCanvas,0,0);ctx.flush();}else drawLaunch(ctx,G,cw,ch,lowQuality,settings.reduced);return;}
 if(G.expedition&&['launch','atmosphere','village'].includes(G.chapter?.id))drawProps(ctx,G,X,Y,unit,v.time);else {terrain(G);for(const o of G.obstacles||[])stamp(o.kind||'debris',o.x,o.y,o.r*3.2,o.angle||0);}
 wline(18,18,4782,18,'#637386',3,true);wline(18,18,18,3182,'#637386',3,true);wline(4782,18,4782,3182,'#637386',3,true);wline(18,3182,4782,3182,'#637386',3,true);
 arrivals(G);
 const crowded=(G.enemies?.length||0)>220||(G.shots?.length||0)+(G.effects?.length||0)>160;fxPressure=(G.enemies?.length||0)>700?2:crowded?1:0;
 ctx.globalAlpha=clamp(settings.effectsOpacity??.75,.1,1)*(crowded?.65:1);for(const [index,e] of (G.effects||[]).entries())if(e.kind==='ground'&&(!lowQuality||index<48))battleEffect(e,1-e.ttl/e.life);ctx.globalAlpha=1;enemyOpacity=1;crowdDim=crowded;enemies(G);
 enlarged=settings.largeProjectiles!==false;
 const p=G.player,opacity=clamp(settings.effectsOpacity??.75,.1,1)*(crowded?.65:1),evolved=new Set((G.weapons||[]).filter(w=>w.evolved).map(w=>w.id)),frame=settings.reduced?0:Math.floor(v.time*12)%3;const drawEffects=()=>{
 pixelBatch(G.shots||[],b=>'projectile:'+(b.weapon||'pulse')+':'+Number(evolved.has(b.weapon))+':'+frame,b=>Math.atan2(b.vy,b.vx)+Math.PI/2,enlarged?1:.75);
 if(p?.orbitCount)for(let i=0;i<p.orbitCount;i++){const a=(G.orbitAngle||0)+i*TAU/p.orbitCount;pixelStamp('projectile:orbit:'+Number(evolved.has('orbit'))+':'+frame,p.x+Math.cos(a)*p.orbitRadius,p.y+Math.sin(a)*p.orbitRadius,a+Math.PI/2);}
 effects(G,settings);};if(!G.effects?.length&&!G.particles?.length&&!explosions.length){spriteOpacity=opacity;drawEffects();spriteOpacity=1;}else layer(drawEffects,opacity);floaters(G);darkness(G);
 ctx.globalAlpha=opacity;for(let i=levelBursts.length-1;i>=0;i--){const e=levelBursts[i],age=v.time-e.birth;if(age>.38){levelBursts.splice(i,1);continue;}const x=X(e.x),y=Y(e.y),width=Math.max(1,Math.round(9*(1-age/.38)));rect(x-width,y-60,width*2,60,'#a3f2d6');rect(x-1,y-60,3,60,'#ffffef');arc(e.x,e.y,35+age*450,0,TAU,'#caffed',5);}ctx.globalAlpha=1;
 for(const g of G.pickups||[]){if(g.kind==='heal')stamp('icon:heal',g.x,g.y,32);else pixelStamp((g.cluster||g.value>=12?'crystal':'xp')+(!settings.reduced&&Math.floor(v.time*3+g.x)%5===0?':spark':''),g.x,g.y);}
 for(const d of G.drops||[]){const rank=d.rank??0,color=rankCopy[rank].color;arc(d.x,d.y,25+rank*4,0,TAU,color,rank>=3?6:3,rank===1||rank===5);if(rank>=2)wline(d.x,d.y-65-rank*7,d.x,d.y,color,2+rank);stamp('icon:chest',d.x,d.y,48);}
 const b=G.beacon;if(b?.hp>0){stamp('beacon',b.x,b.y,b.r*3);hpBar(b,b.r*2,b.y+b.r*1.7,'#8fc6ad');}
 hazards(G);enemyWarnings(G,settings);arrows(G);
 if(p)player(G,p,settings);
 pixelBatch(G.bullets||[],b=>'bullet'+(Math.floor(v.time*8+(b.age||0)*2)%2===0?':spark':''),undefined,enlarged?1:.75);
 if(intro>=0&&intro<1.2){ctx.globalAlpha=.2*Math.sin(intro/1.2*Math.PI);rect(0,0,cw,ch,'#080a16');ctx.globalAlpha=1;}
 minimap(G);ctx.flush?.();
}
export function snapshotShip(id,target){if(!target)return;const c=target.getContext('2d'),img=sprite('ship:'+id,1,0),scale=Math.max(1,Math.floor(Math.min(target.width/40,target.height/32)));c.imageSmoothingEnabled=false;c.clearRect(0,0,target.width,target.height);c.drawImage(img,Math.floor((target.width-48*scale)/2),Math.floor((target.height-48*scale)/2),48*scale,48*scale);}
export const shipSprite=id=>sprite('ship:'+id);
export const enemySprite=(id,phase=0)=>sprite(id==='boss'?'boss:'+phase:'enemy:'+id);
export const explosionSprite=frame=>blast(frame);

export const rendererInfo=()=>({backend:ctx?.backend??'Canvas2D',device:ctx?.device??null});
