import { t } from './i18n.js';
import {sprite,directionFrame} from './pixel-art.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PHOTOS=['orion.jpg','pleiades.jpg','m13.jpg','milkyway.jpg','andromeda.jpg','deepfield.jpg'];
export const PHOTO_PALETTE=['#10131e','#161c2b','#202536','#293146','#34435a','#47596b','#647886','#8c9ca3','#b1b9ac','#e0d9bd','#30273a','#433247','#584053','#704c5d','#8c626e','#ad8287','#2b292f','#40383c','#554947','#6c5950','#88705c','#a58b6b','#c6ac85','#e7d1a6','#1c2b39','#293e50','#3b5367','#536f82','#7593a4','#a3bdc5','#c6d9da','#f0ede0'];
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],rgb=PHOTO_PALETTE.map(h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)));
const photoCache=new WeakMap(),combatPhotos=new WeakMap(),lowPhotos=new WeakMap(),cloudCache=new Map(),explosions=[],sparks=[],levelBursts=[];
let lowQuality=false;
let canvas,ctx,mini,mctx,zoom=1,cw=1,ch=1,lang='ko',lastTime=0,v={w:1,h:1,scale:1,camX:0,camY:0,time:0},unit=1;
const word=k=>t(k,lang),X=x=>Math.round((x-v.camX)*unit+cw/2),Y=y=>Math.round((y-v.camY)*unit+ch/2);
const visible=(x,y,r=40)=>Math.abs(x-v.camX)<v.w/v.scale/2+r&&Math.abs(y-v.camY)<v.h/v.scale/2+r;
function setup(){const next=document.getElementById('world');if(canvas!==next){canvas=next;ctx=canvas?.getContext('2d',{alpha:false});}mini=document.getElementById('minimap');mctx=mini?.getContext('2d');}
export function ditherPhoto(img){
 if(img.pixelReady)return img;
 const old=photoCache.get(img);if(old)return old;const c=document.createElement('canvas');c.width=640;c.height=Math.round(640*img.height/img.width);const g=c.getContext('2d');g.drawImage(img,0,0,c.width,c.height);const data=g.getImageData(0,0,c.width,c.height);
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,d=(bayer[(y%4)*4+x%4]-7.5)*2;let best=0,distance=Infinity;for(let k=0;k<rgb.length;k++){const p=rgb[k],n=(data.data[i]+d-p[0])**2+(data.data[i+1]+d-p[1])**2+(data.data[i+2]+d-p[2])**2;if(n<distance){best=k;distance=n;}}data.data[i]=rgb[best][0];data.data[i+1]=rgb[best][1];data.data[i+2]=rgb[best][2];}
 g.putImageData(data,0,0);photoCache.set(img,c);return c;
}
export function resize(w,h){setup();zoom=Math.max(1,Math.round(h/360));cw=Math.ceil(w/zoom);ch=Math.ceil(h/zoom);if(canvas){canvas.width=cw;canvas.height=ch;canvas.style.width=cw*zoom+'px';canvas.style.height=ch*zoom+'px';canvas.style.left=Math.floor((w-cw*zoom)/2)+'px';canvas.style.top=Math.floor((h-ch*zoom)/2)+'px';ctx.imageSmoothingEnabled=false;}}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
const lineCache=new Map();
function line(x,y,ex,ey,color,width=1,dash=false){x=Math.round(x);y=Math.round(y);ex=Math.round(ex);ey=Math.round(ey);const half=Math.floor(width/2);if(Math.max(x,ex)+width-half<0||Math.min(x,ex)-half>=cw||Math.max(y,ey)+width-half<0||Math.min(y,ey)-half>=ch)return;const ddx=ex-x,ddy=ey-y,w=Math.abs(ddx)+width,h=Math.abs(ddy)+width;if(w<=512&&h<=512&&w*h<=65536){const key=ddx+':'+ddy+':'+width+':'+color+':'+Number(dash);let img=lineCache.get(key);if(!img){img=document.createElement('canvas');img.width=w;img.height=h;const g=img.getContext('2d'),ox=Math.min(x,ex)-half,oy=Math.min(y,ey)-half;g.fillStyle=color;let px=x,py=y,dx=Math.abs(ddx),sx=x<ex?1:-1,dy=-Math.abs(ddy),sy=y<ey?1:-1,err=dx+dy,n=0;for(;;){if(!dash||Math.floor(n/4)%2===0)g.fillRect(px-half-ox,py-half-oy,width,width);if(px===ex&&py===ey)break;const e=2*err;if(e>=dy){err+=dy;px+=sx;}if(e<=dx){err+=dx;py+=sy;}n++;}if(lineCache.size>=256)lineCache.delete(lineCache.keys().next().value);lineCache.set(key,img);}ctx.drawImage(img,Math.min(x,ex)-half,Math.min(y,ey)-half);return;}let dx=Math.abs(ddx),sx=x<ex?1:-1,dy=-Math.abs(ddy),sy=y<ey?1:-1,err=dx+dy,n=0;ctx.fillStyle=color;for(;;){if((!dash||Math.floor(n/4)%2===0)&&x+width-half>0&&x-half<cw&&y+width-half>0&&y-half<ch)ctx.fillRect(x-half,y-half,width,width);if(x===ex&&y===ey)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}n++;}}
function wline(x,y,ex,ey,color,width=3,dash=false){line(X(x),Y(y),X(ex),Y(ey),color,Math.max(1,Math.round(width*unit)),dash);}
const circleCache=new Map();
function circleImage(radius,thick,color,dash){
 const key=radius+':'+thick+':'+color+':'+Number(dash);let c=circleCache.get(key);if(c)return c;
 c=document.createElement('canvas');const pad=Math.ceil(thick/2)+1;c.width=c.height=radius*2+pad*2+1;const g=c.getContext('2d'),steps=Math.max(8,Math.ceil(TAU*radius*1.4));g.fillStyle=color;
 for(let i=0;i<=steps;i++){if(dash&&Math.floor(i/5)%2)continue;const a=i/steps*TAU;g.fillRect(Math.round(radius+pad+Math.cos(a)*radius)-Math.floor(thick/2),Math.round(radius+pad+Math.sin(a)*radius)-Math.floor(thick/2),thick,thick);}
 if(circleCache.size>=256)circleCache.delete(circleCache.keys().next().value);circleCache.set(key,c);return c;
}
function arc(x,y,r,a,b,color,width=3,dash=false){
 if(a===0&&Math.abs(b-TAU)<.0001){const radius=Math.max(1,Math.round(r*unit)),thick=Math.max(1,Math.round(width*unit)),pad=Math.ceil(thick/2)+1;ctx.drawImage(circleImage(radius,thick,color,dash),X(x)-radius-pad,Y(y)-radius-pad);return;}
const radius=r*unit,steps=Math.max(8,Math.ceil(Math.abs(b-a)*radius*1.4));ctx.fillStyle=color;const thick=Math.max(1,Math.round(width*unit)),half=Math.floor(thick/2),cx=X(x),cy=Y(y);for(let i=0;i<=steps;i++){if(dash&&Math.floor(i/5)%2)continue;const t=a+(b-a)*i/steps;ctx.fillRect(Math.round(cx+Math.cos(t)*radius)-half,Math.round(cy+Math.sin(t)*radius)-half,thick,thick);}}
function disk(x,y,r,color){const cx=X(x),cy=Y(y),rr=Math.max(1,Math.round(r*unit));ctx.fillStyle=color;for(let y=-rr;y<=rr;y++){const span=Math.floor(Math.sqrt(rr*rr-y*y));ctx.fillRect(cx-span,cy+y,span*2+1,1);}}
function polygon(points,color){const ps=points.map(([x,y])=>[X(x),Y(y)]),min=Math.max(0,Math.min(...ps.map(p=>p[1]))),max=Math.min(ch-1,Math.max(...ps.map(p=>p[1])));ctx.fillStyle=color;for(let y=min;y<=max;y++){const xs=[];for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a[1]>y)!==(b[1]>y))xs.push(Math.round(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1])));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)ctx.fillRect(xs[i],y,xs[i+1]-xs[i]+1,1);}}
const sizedSprites=new Map(),trimmedSprites=new WeakMap();let spriteOpacity=1;
function trimmed(img){let result=trimmedSprites.get(img);if(result)return result;const pixels=img.getContext('2d').getImageData(0,0,img.width,img.height).data;let left=img.width,top=img.height,right=0,bottom=0;for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if(pixels[(y*img.width+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}const image=document.createElement('canvas');image.width=Math.max(1,right-left+1);image.height=Math.max(1,bottom-top+1);image.getContext('2d').drawImage(img,left,top,image.width,image.height,0,0,image.width,image.height);result={image,x:left,y:top};trimmedSprites.set(img,result);return result;}
function stamp(id,x,y,size,angle=0,flame=-1,flash=false,dim=false){if(!visible(x,y,size))return;const direction=directionFrame(angle),s=Math.max(1,Math.round(size*unit)),key=id+':'+direction+':'+flame+':'+s+':'+Number(flash)+(dim?':dim':'')+(spriteOpacity<1?':a'+spriteOpacity:'');let img=sizedSprites.get(key);if(!img){const base=sprite(id,direction,flame);img=document.createElement('canvas');img.width=img.height=s;const c=img.getContext('2d');c.imageSmoothingEnabled=false;c.globalAlpha=spriteOpacity;c.drawImage(flash?whiteSprite(base):dim?dimSprite(base):base,0,0,s,s);sizedSprites.set(key,img);}const crop=trimmed(img);ctx.drawImage(crop.image,X(x)-Math.floor(s/2)+crop.x,Y(y)-Math.floor(s/2)+crop.y);}
const dims=new WeakMap();
function dimSprite(img){let c=dims.get(img);if(c)return c;c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='#10131d';g.globalAlpha=.38;g.fillRect(0,0,c.width,c.height);dims.set(img,c);return c;}
const whites=new WeakMap();
function whiteSprite(img){let c=whites.get(img);if(c)return c;c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fff4dc';g.fillRect(0,0,c.width,c.height);whites.set(img,c);return c;}
const outlines=new WeakMap();
function outlined(img){let c=outlines.get(img);if(c)return c;c=document.createElement('canvas');c.width=img.width+2;c.height=img.height+2;const g=c.getContext('2d'),white=whiteSprite(img);for(const [x,y] of [[0,1],[2,1],[1,0],[1,2]])g.drawImage(white,x,y);g.drawImage(img,1,1);outlines.set(img,c);return c;}
let enemyOpacity=1,crowdDim=false,layerCanvas;
function layer(draw,opacity){
 if(opacity>=1){draw();return;}if(!layerCanvas)layerCanvas=document.createElement('canvas');
 if(layerCanvas.width!==cw||layerCanvas.height!==ch){layerCanvas.width=cw;layerCanvas.height=ch;}
 const main=ctx,g=layerCanvas.getContext('2d');g.clearRect(0,0,cw,ch);g.imageSmoothingEnabled=false;ctx=g;draw();ctx=main;ctx.globalAlpha=opacity;ctx.drawImage(layerCanvas,0,0);ctx.globalAlpha=1;
}
let seed=381992;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const stars=Array.from({length:180},(_,i)=>({x:rand()*1600,y:rand()*1100,l:i%3,t:rand()*TAU}));
function combatPhoto(img){let photo=combatPhotos.get(img);if(photo)return photo;const base=ditherPhoto(img),ca=document.createElement('canvas');ca.width=base.width;ca.height=base.height;const g=ca.getContext('2d');g.drawImage(base,0,0);const data=g.getImageData(0,0,ca.width,ca.height);for(let i=0;i<data.data.length;i+=4){const gray=data.data[i]*.22+data.data[i+1]*.7+data.data[i+2]*.08;for(let c=0;c<3;c++)data.data[i+c]=Math.round(data.data[i+c]*.5+gray*.5);}g.putImageData(data,0,0);combatPhotos.set(img,ca);return ca;}
function lowPhoto(img){let photo=lowPhotos.get(img);if(photo)return photo;photo=document.createElement('canvas');photo.width=Math.min(320,img.width);photo.height=Math.max(1,Math.round(img.height*photo.width/img.width));const g=photo.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(img,0,0,photo.width,photo.height);lowPhotos.set(img,photo);return photo;}
function background(G){rect(0,0,cw,ch,'#111620');const img=v.images?.[PHOTOS[G?.sector||0]];if(img?.complete&&img.width){let photo=G?combatPhoto(img):ditherPhoto(img);if(lowQuality)photo=lowPhoto(photo);const s=Math.max(cw/photo.width,ch/photo.height)*1.12,w=Math.round(photo.width*s),h=Math.round(photo.height*s);ctx.globalAlpha=G?.3:.78;ctx.drawImage(photo,Math.round((cw-w)/2-Math.sin(v.camX*.0002)*cw*.025),Math.round((ch-h)/2-Math.cos(v.camY*.0002)*ch*.025),w,h);ctx.globalAlpha=1;}
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
function ring(x,y,r,gaps,gw,color,width,warning){const steps=Math.max(60,Math.ceil(r*unit*TAU));for(let i=0;i<steps;i++){const a=i/steps*TAU;if(warning&&Math.floor(i/6)%2&&!gapAngle(gaps,gw,a))continue;const safe=gapAngle(gaps,gw,a),s=Math.max(1,Math.round((safe?8:width)*unit));rect(X(x+Math.cos(a)*r)-Math.floor(s/2),Y(y+Math.sin(a)*r)-Math.floor(s/2),s,s,safe?'#8af0a2':color);}}
function hazards(G){for(const h of G.hazards||[]){const active=h.age>=h.warning,red=active?'#df536c':'#c99069',a=h.angle||0;
 if(h.type==='sweep'){const angle=a+(active?h.spin*(h.age-h.warning):0),x=h.x-Math.cos(angle)*h.length,y=h.y-Math.sin(angle)*h.length;beam(x,y,angle,h.length*2,h.width,red);if(active)beam(x,y,angle,h.length*2,Math.max(3,h.width*.25),'#ffe0c9');else{for(const d of [Math.PI/2,Math.PI*1.5])arc(h.x,h.y,160,angle+d-.25,angle+d+.25,'#8af0a2',9);wline(x,y,x+Math.cos(angle)*h.length*2,y+Math.sin(angle)*h.length*2,'#2b2229',3,true);}continue;}
 if(h.type==='shell'||h.type==='ringwarn'){const r=h.type==='ringwarn'?h.r:active?h.r0+(h.r1-h.r0)*clamp((h.age-h.warning)/h.duration,0,1):Math.max(h.r0,130);ring(h.x,h.y,r,h.gaps||[],h.gapW||.6,red,active?h.width:4,!active);if(active)ring(h.x,h.y,r,h.gaps||[],h.gapW||.6,'#ffd4c9',3,false);continue;}
 if(h.type==='wallwarn'){const dx=Math.cos(a),dy=Math.sin(a),off=h.off||70;const point=d=>[h.x+dx*off-dy*d,h.y+dy*off+dx*d];wline(...point(-450),...point(h.gap-80),red,5,true);wline(...point(h.gap+80),...point(450),red,5,true);wline(...point(h.gap-80),...point(h.gap+80),'#8af0a2',9);continue;}
 if(h.type==='laser'||h.type==='dashline'){const width=h.width||24,len=h.length||900;beam(h.x,h.y,a,len,width,red);if(active)beam(h.x,h.y,a,len,Math.max(3,width*.25),'#ffe0c9');else{wline(h.x,h.y,h.x+Math.cos(a)*len,h.y+Math.sin(a)*len,'#2b2229',3,true);for(const side of [-1,1]){const x=h.x-Math.sin(a)*(width+24)*side,y=h.y+Math.cos(a)*(width+24)*side;wline(x,y,x+Math.cos(a)*Math.min(len,250),y+Math.sin(a)*Math.min(len,250),'#8af0a2',4);}}continue;}
 disk(h.x,h.y,h.r||100,'#5b303e');arc(h.x,h.y,h.r||100,0,TAU,red,3,!active);
}}
function hpBar(e,width,y,color){if(e.hp>=e.maxHp)return;const x=X(e.x)-Math.round(width*unit/2),yy=Y(y),w=Math.max(8,Math.round(width*unit));rect(x-1,yy-1,w+2,4,'#10131d');rect(x,yy,w,2,'#3c2936');rect(x,yy,w*clamp(e.hp/e.maxHp,0,1),2,color);}
function enemies(G){for(const e of G.enemies||[]){if(e.hp<=0||!visible(e.x,e.y,e.r*3))continue;const boss=e.type==='boss'||e.type==='decoy',angle=(e.angle||0)+Math.PI/2;ctx.globalAlpha=enemyOpacity*(e.hidden?.18:e.type==='decoy'?.55:1);
 if(e.elite){arc(e.x,e.y,e.r*1.45,0,TAU,'#f3be5e',5);arc(e.x,e.y,e.r*1.7,0,TAU,'#937043',2);}
 if(e.shielded)arc(e.x,e.y,e.r*1.35,0,TAU,'#8e9dcc',4,true);
 stamp(boss?'boss:'+(e.bossArt??G.sector)+':'+(e.phase||0):'enemy:'+e.type,e.x,e.y,e.r*(boss?3.8:3.5),angle,-1,e.flash>0,crowdDim&&!boss);ctx.globalAlpha=enemyOpacity;
 if(e.stageGuard>0)arc(e.x,e.y,e.r*1.65,0,TAU,'#ffe1f7',4,true);
 if(e.mirror>0){ring(e.x,e.y,e.r*1.65,[],0,'#d8c8ee',5,false);}
 if(!boss)hpBar(e,e.r*2,e.y+e.r*1.6,'#cf797b');
}ctx.globalAlpha=1;}
function enemyWarnings(G){for(const e of G.enemies||[]){if(e.hp<=0||e.hidden||!visible(e.x,e.y,e.r*3))continue;const boss=e.type==='boss'||e.type==='decoy';
 if(e.warnTime>0){const p=e.pendingAttack,pat=p?.pattern,a=p?.angle??e.angle??0,ph=p?.phase??e.phase??0;
 if(['ring','ring8','ring6'].includes(pat))arc(e.x,e.y,e.r+(boss?65:30),0,TAU,'#e8b987',4,true);
 else if(pat==='prism'||pat==='fan'){const n=pat==='prism'?3+ph:7+ph*2,step=.25;for(let i=0;i<n;i++){const b=a+(i-(n-1)/2)*step;wline(e.x+Math.cos(b)*e.r,e.y+Math.sin(b)*e.r,e.x+Math.cos(b)*250,e.y+Math.sin(b)*250,'#cf9b74',3,true);}for(const side of [-1,1])arc(e.x,e.y,190,a+side*((n-1)*step/2+.2),a+side*((n-1)*step/2+.6),'#8af0a2',8);}
 else if(pat==='side'){for(const side of [-1,1]){const b=a+side*Math.PI/2;wline(e.x,e.y,e.x+Math.cos(b)*170,e.y+Math.sin(b)*170,'#e8b987',3,true);}}
 else if(['blackout','squad','mirror','clone'].includes(pat))arc(e.x,e.y,e.r*1.4,0,TAU,'#e8b987',4,true);
 else wline(e.x,e.y,e.x+Math.cos(a)*(boss?240:160),e.y+Math.sin(a)*(boss?240:160),'#e8b987',3,true);
 }
}}
const digits={0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','010','010','010'],8:['111','101','111','101','111'],9:['111','101','111','001','111'],'-':['000','000','111','000','000']};
const numberCache=new Map();
function damage(text,x,y,color,big){const s=big?2:1,key=text+':'+color+':'+s;let img=numberCache.get(key);if(!img){img=document.createElement('canvas');img.width=text.length*4*s+2;img.height=5*s+2;const g=img.getContext('2d'),blocks=[];for(let k=0;k<text.length;k++){const rows=digits[text[k]];if(!rows)continue;for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(rows[j][i]==='1')blocks.push([1+(k*4+i)*s,1+j*s]);}g.fillStyle='#080b11';for(const [x,y] of blocks)g.fillRect(x-1,y-1,s+2,s+2);g.fillStyle=color;for(const [x,y] of blocks)g.fillRect(x,y,s,s);if(numberCache.size>=256)numberCache.delete(numberCache.keys().next().value);numberCache.set(key,img);}ctx.drawImage(img,X(x)-Math.floor(text.length*4*s/2)-1,Y(y)-1);}
const blastRows=['.......5......./......565....../.......5.......','......555....../....5566555..../...566666665.../....5566555..../......555......','...5.......5.../....5555555..../..5566666555.../.556668666655./..5566666555.../....5555555..../...5.......5...','..55.......55../.5555.....5555./..555.....555../....55...55..../..555.....555../.5555.....5555./..55.......55..','..5.........5../.....5...5...../..5.........5../.............../....5.....5....'];
const blastCache=new Map();
function blast(frame){if(blastCache.has(frame))return blastCache.get(frame);const ca=document.createElement('canvas');ca.width=ca.height=20;const c=ca.getContext('2d'),rows=blastRows[frame].split('/');for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(rows[y][x]!=='.'){c.fillStyle={'5':'#e1844b','6':'#ffd878','8':'#fff6d2'}[rows[y][x]];c.fillRect(x+2,y+5,1,1);}blastCache.set(frame,ca);return ca;}
export function consumeEvents(events){for(const e of events){if(e.kind==='kill'&&explosions.length<40)explosions.push({x:e.x,y:e.y,birth:lastTime});if(e.kind==='hit'&&sparks.length<32)sparks.push({x:e.x,y:e.y,birth:lastTime});if(e.kind==='level'&&levelBursts.length<3)levelBursts.push({x:e.x,y:e.y,birth:lastTime});}}
function weaponLine(e,color,evolved){
 const dx=e.x2-e.x,dy=e.y2-e.y,angle=Math.atan2(dy,dx),frame=Math.floor(v.time*15)%3;
 if(e.weapon==='chain'){
  let x=e.x,y=e.y;for(let k=1;k<=4;k++){const offset=k===4?0:Math.sin(k*7+frame*2)*13,nx=e.x+dx*k/4-Math.sin(angle)*offset,ny=e.y+dy*k/4+Math.cos(angle)*offset;wline(x,y,nx,ny,color,evolved?7:5);wline(x,y,nx,ny,'#fffbed',2);x=nx;y=ny;}
  pixelStamp('projectile:chain:'+Number(evolved)+':'+frame,e.x2,e.y2,angle+Math.PI/2);
 }else{
  wline(e.x,e.y,e.x2,e.y2,color,(evolved?9:6)+(e.weapon==='laser'?frame:0));wline(e.x,e.y,e.x2,e.y2,'#fffbed',2);
  if(e.weapon==='laser')pixelStamp('projectile:laser:'+Number(evolved)+':'+frame,e.x+dx*.06,e.y+dy*.06,angle+Math.PI/2);
 }
}
function effects(G,settings){for(const [index,e] of (G.effects||[]).entries()){if(lowQuality&&index>=48)continue;if(e.kind==='level'||!visible(e.x,e.y,e.radius))continue;const age=1-e.ttl/e.life,evolved=G.weapons?.some(w=>w.id===e.weapon&&w.evolved),color=evolved?'#c784f5':e.color;if(e.kind==='line'){weaponLine(e,color,evolved);}else if(e.kind==='mine'){pixelStamp('projectile:mine:'+Number(evolved)+':'+(Math.floor(v.time*10)%3),e.x,e.y);arc(e.x,e.y,e.radius,0,TAU,'#956c63',2,true);}else{arc(e.x,e.y,Math.max(1,e.radius*age),0,TAU,color,e.kind==='evolve'?7:4);if(e.kind==='evolve')arc(e.x,e.y,e.radius*age*.7,0,TAU,'#f0d6ff',3);}}
 for(let i=sparks.length-1;i>=0;i--){const e=sparks[i],age=v.time-e.birth;if(age>.14){sparks.splice(i,1);continue;}const x=X(e.x),y=Y(e.y),r=2+Math.floor(age*20);rect(x-1,y-1,3,3,'#fff8d2');for(const [dx,dy] of [[-1,-1],[1,-1],[-1,1],[1,1]])rect(x+dx*r,y+dy*r,1,1,'#efbb71');}
 for(let i=explosions.length-1;i>=0;i--){const e=explosions[i],frame=Math.floor((v.time-e.birth)*14);if(frame>=5){explosions.splice(i,1);continue;}if(frame>=0&&visible(e.x,e.y,50)){const img=blast(settings.reduced?Math.min(3,frame):frame);ctx.drawImage(img,X(e.x)-10,Y(e.y)-10);}}
 for(const [index,p] of (G.particles||[]).entries()){if(lowQuality&&index>=60)break;if(!visible(p.x,p.y,15))continue;const s=Math.max(1,Math.round(p.r*unit));rect(X(p.x),Y(p.y),s,s,p.color||'#ffd6a0');}
}
function floaters(G){for(const f of (G.floaters||[]).slice(0,lowQuality?12:24)){if(!visible(f.x,f.y,40))continue;const heavy=Number(f.text)>=75;damage(f.text,f.x,f.y,heavy?'#ffd260':f.color||'#eef2f8',heavy);}
}
function darkness(G){const p=G.player;if(!p?.inDark&&!G.blackout)return;const cx=X(p.x),cy=Y(p.y),r=(G.blackout>0?200:230)*unit;for(let y=0;y<ch;y+=4)for(let x=0;x<cw;x+=4){const d=Math.hypot(x-cx,y-cy);if(d>r*1.9)rect(x,y,4,4,'#090c14');else if(d>r*.6&&bayer[((y/4)%4)*4+(x/4)%4]/16<(d/r-.6)/1.3)rect(x,y,4,4,'#090c14');}}
let miniFrame=0;
function minimap(G){if(!mctx||miniFrame++%3)return;const w=mini.width,h=mini.height,s=Math.min((w-8)/4800,(h-8)/3200),mx=x=>Math.round((w-4800*s)/2+x*s),my=y=>Math.round((h-3200*s)/2+y*s);mctx.imageSmoothingEnabled=false;mctx.fillStyle='#171d2a';mctx.fillRect(0,0,w,h);for(const t of G.terrain||[]){if(t.kind==='galaxy'){mctx.fillStyle='#71809b';for(const arm of t.arms||[])for(const q of arm)mctx.fillRect(mx(q[0]),my(q[1]),1,1);mctx.fillStyle='#c8ad76';mctx.fillRect(mx(t.x-t.bar),my(t.y)-1,Math.max(2,Math.round(t.bar*2*s)),2);if(!t.sun.found){mctx.fillStyle='#ffd260';mctx.fillRect(mx(t.sun.x)-1,my(t.sun.y)-1,3,3);}continue;}mctx.fillStyle={emission:'#71464e',reflection:'#425877',dark:'#0a0d16',core:'#8d7960',bluestars:'#6c8baa'}[t.kind]||'#55526c';const r=Math.max(2,Math.round((t.r||50)*s));mctx.fillRect(mx(t.x)-r,my(t.y)-r,r*2,r*2);}for(const e of G.enemies||[]){if(e.hp<=0)continue;mctx.fillStyle=e.type==='boss'?'#ffb786':'#c26c7c';const k=e.type==='boss'?3:1;mctx.fillRect(mx(e.x)-k,my(e.y)-k,k*2,k*2);}for(const d of G.drops||[]){mctx.fillStyle='#ffd260';mctx.fillRect(mx(d.x)-2,my(d.y)-2,4,4);}if(G.beacon){mctx.fillStyle='#a9dfcf';mctx.fillRect(mx(G.beacon.x)-2,my(G.beacon.y)-2,4,4);}mctx.fillStyle='#edf4e9';mctx.fillRect(mx(G.player.x)-2,my(G.player.y)-2,4,4);}
function arrows(G){const targets=[];if(G.beacon?.hp>0)targets.push([G.beacon,'#a9dfcf']);const boss=G.enemies.find(e=>e.type==='boss'&&e.hp>0);if(boss)targets.push([boss,'#ef8b85']);const gal=G.terrain.find(t=>t.kind==='galaxy');if(gal&&!gal.sun.found&&!boss)targets.push([gal.sun,'#ffe08a']);for(const [e,color] of targets){const x=X(e.x),y=Y(e.y);if(x>20&&x<cw-20&&y>40&&y<ch-45)continue;const a=Math.atan2(y-ch/2,x-cw/2),dx=Math.cos(a),dy=Math.sin(a),f=Math.min((cw/2-20)/(Math.abs(dx)||1),(ch/2-45)/(Math.abs(dy)||1)),px=Math.round(cw/2+dx*f),py=Math.round(ch/2+dy*f);line(px-dx*7-dy*4,py-dy*7+dx*4,px,py,color,2);line(px-dx*7+dy*4,py-dy*7-dx*4,px,py,color,2);}}
const pixelImages=new Map();let enlarged=true;
function pixelStamp(id,x,y,angle=0,scale=1){
 if(!visible(x,y,45))return;const direction=directionFrame(angle),key=id+':'+direction+':'+scale+':'+spriteOpacity;let cached=pixelImages.get(key);
 if(!cached){
  const base=sprite(id,direction),data=base.getContext('2d').getImageData(0,0,base.width,base.height).data;let left=base.width,top=base.height,right=0,bottom=0;
  for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++)if(data[(y*base.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const image=document.createElement('canvas'),w=right-left+1,h=bottom-top+1;image.width=Math.max(1,Math.round(w*scale));image.height=Math.max(1,Math.round(h*scale));const c=image.getContext('2d');c.imageSmoothingEnabled=false;c.globalAlpha=spriteOpacity;c.drawImage(base,left,top,w,h,0,0,image.width,image.height);
  cached={image,x:Math.round((left-base.width/2)*scale),y:Math.round((top-base.height/2)*scale)};if(pixelImages.size>4096)pixelImages.clear();pixelImages.set(key,cached);
 }
 ctx.drawImage(cached.image,X(x)+cached.x,Y(y)+cached.y);
}
function enemyBullet(b){pixelStamp('bullet'+(Math.floor(v.time*8+(b.age||0)*2)%2===0?':spark':''),b.x,b.y,0,enlarged?1:.75);}
function player(G,p,settings){
 const ang=(p.angle||0)+Math.PI/2,size=Math.max(1,Math.round(76*unit)),cx=X(p.x),cy=Y(p.y);
 if(p.dashTime>0){ctx.globalAlpha=.3;for(let i=1;i<3;i++)stamp('ship:'+p.ship,p.x-Math.cos(p.angle)*i*24,p.y-Math.sin(p.angle)*i*24,76,ang);ctx.globalAlpha=1;}
 if(p.invul>0)arc(p.x,p.y,p.r*1.6,0,TAU,'#aacbd0',2,true);
 const direction=directionFrame(ang),flame=settings.reduced?0:Math.floor(v.time*12)%3;
 const key='ship:'+p.ship+':'+direction+':'+flame+':'+size+':'+Number(p.flash>0);
 stamp('ship:'+p.ship,p.x,p.y,76,ang,flame,p.flash>0);
 const img=sizedSprites.get(key);if(img){const rim=outlined(img);ctx.drawImage(rim,cx-Math.floor(size/2)-1,cy-Math.floor(size/2)-1);}
 // The marker stays outside the hull so its centre can be found in a crowd.
 const foot=cy+Math.max(9,Math.round(29*unit));line(cx-4,foot,cx+4,foot,'#090c14',3);line(cx-3,foot,cx+3,foot,'#c9ffff');rect(cx,foot-2,1,2,'#c9ffff');
 if(img)overlapRim(G,p,img,cx-Math.floor(size/2)-1,cy-Math.floor(size/2)-1);
}
let overlapCanvas;
function overlapRim(G,p,img,x,y){
 const near=(G.enemies||[]).filter(e=>e.hp>0&&!e.hidden&&Math.abs(e.x-p.x)<e.r*1.9+38&&Math.abs(e.y-p.y)<e.r*1.9+38);if(!near.length)return;
 if(!overlapCanvas)overlapCanvas=document.createElement('canvas');const c=overlapCanvas;if(c.width!==img.width+2||c.height!==img.height+2){c.width=img.width+2;c.height=img.height+2;}const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.imageSmoothingEnabled=false;
 for(const e of near){const boss=e.type==='boss'||e.type==='decoy',size=Math.max(1,Math.round(e.r*(boss?3.8:3.5)*unit));g.drawImage(sprite(boss?'boss:'+(e.bossArt??G.sector)+':'+(e.phase||0):'enemy:'+e.type,directionFrame((e.angle||0)+Math.PI/2)),X(e.x)-Math.floor(size/2)-x,Y(e.y)-Math.floor(size/2)-y,size,size);}
 g.globalCompositeOperation='source-in';g.drawImage(outlined(img),0,0);g.globalCompositeOperation='destination-out';g.drawImage(img,1,1);g.globalCompositeOperation='source-in';g.fillStyle='#c9ffff';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';ctx.drawImage(c,x,y);
}
export function render(G,V,settings={}){setup();if(!ctx)return;if(canvas.width!==Math.ceil(V.w/Math.max(1,Math.round(V.h/360)))||canvas.height!==Math.ceil(V.h/Math.max(1,Math.round(V.h/360))))resize(V.w,V.h);v={...V};lowQuality=settings.quality==='low';lang=settings.lang||'ko';unit=v.scale/zoom;const shake=settings.reduced?0:Math.min(v.shake||0,8);v.camX-=Math.round(shake*Math.sin(v.time*61)/zoom)/unit;v.camY-=Math.round(shake*Math.cos(v.time*49)/zoom)/unit;ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.globalAlpha=1;background(G);lastTime=v.time;if(!G)return;
 terrain(G);for(const o of G.obstacles||[])stamp(o.kind||'debris',o.x,o.y,o.r*3.2,o.angle||0);
 wline(18,18,4782,18,'#637386',3,true);wline(18,18,18,3182,'#637386',3,true);wline(4782,18,4782,3182,'#637386',3,true);wline(18,3182,4782,3182,'#637386',3,true);
 const crowded=(G.enemies?.length||0)>220||(G.shots?.length||0)+(G.effects?.length||0)>160;
 enemyOpacity=1;crowdDim=crowded;enemies(G);
 enlarged=settings.largeProjectiles!==false;
 const p=G.player,opacity=clamp(settings.effectsOpacity??.75,.1,1)*(crowded?.65:1),evolved=new Set((G.weapons||[]).filter(w=>w.evolved).map(w=>w.id)),frame=settings.reduced?0:Math.floor(v.time*12)%3;const drawEffects=()=>{
 for(const b of G.shots||[])pixelStamp('projectile:'+(b.weapon||'pulse')+':'+Number(evolved.has(b.weapon))+':'+frame,b.x,b.y,Math.atan2(b.vy,b.vx)+Math.PI/2,enlarged?1:.75);
 if(p?.orbitCount)for(let i=0;i<p.orbitCount;i++){const a=(G.orbitAngle||0)+i*TAU/p.orbitCount;pixelStamp('projectile:orbit:'+Number(evolved.has('orbit'))+':'+frame,p.x+Math.cos(a)*p.orbitRadius,p.y+Math.sin(a)*p.orbitRadius,a+Math.PI/2);}
 effects(G,settings);};if(!G.effects?.length&&!G.particles?.length&&!explosions.length){spriteOpacity=opacity;drawEffects();spriteOpacity=1;}else layer(drawEffects,opacity);floaters(G);darkness(G);
 ctx.globalAlpha=opacity;for(let i=levelBursts.length-1;i>=0;i--){const e=levelBursts[i],age=v.time-e.birth;if(age>.38){levelBursts.splice(i,1);continue;}const x=X(e.x),y=Y(e.y),width=Math.max(1,Math.round(9*(1-age/.38)));rect(x-width,y-60,width*2,60,'#a3f2d6');rect(x-1,y-60,3,60,'#ffffef');arc(e.x,e.y,35+age*450,0,TAU,'#caffed',5);}ctx.globalAlpha=1;
 for(const g of G.pickups||[]){if(g.kind==='heal')stamp('icon:heal',g.x,g.y,32);else pixelStamp((g.cluster||g.value>=12?'crystal':'xp')+(!settings.reduced&&Math.floor(v.time*3+g.x)%5===0?':spark':''),g.x,g.y);}
 for(const d of G.drops||[])stamp('icon:chest',d.x,d.y,48);
 const b=G.beacon;if(b?.hp>0){stamp('beacon',b.x,b.y,b.r*3);hpBar(b,b.r*2,b.y+b.r*1.7,'#8fc6ad');}
 hazards(G);enemyWarnings(G);arrows(G);
 for(const b of G.bullets||[])enemyBullet(b);
 if(p)player(G,p,settings);
 minimap(G);
}
export function snapshotShip(id,target){if(!target)return;const c=target.getContext('2d'),img=sprite('ship:'+id,1,0),scale=Math.max(1,Math.floor(Math.min(target.width/40,target.height/32)));c.imageSmoothingEnabled=false;c.clearRect(0,0,target.width,target.height);c.drawImage(img,Math.floor((target.width-48*scale)/2),Math.floor((target.height-48*scale)/2),48*scale,48*scale);}
export const shipSprite=id=>sprite('ship:'+id);
export const enemySprite=(id,phase=0)=>sprite(id==='boss'?'boss:'+phase:'enemy:'+id);
export const explosionSprite=frame=>blast(frame);
