export const C = {
  ink:'#090d18', void:'#111522', deep:'#1b2132', floor:'#252d3d', steel:'#354256', edge:'#4b5e70',
  purpleDark:'#28203c', purple:'#473257', violet:'#76529a', lavender:'#aa75dd',
  plum:'#56293e', red:'#b43e64', pink:'#ef6690', peach:'#ffaaa0',
  brown:'#553e46', rust:'#9b5748', orange:'#e68a4b', gold:'#f6bf58', yellow:'#ffe6a3',
  white:'#fff4db', silver:'#c1cebd', tealDark:'#173b42', teal:'#21636a', cyan:'#3da6ba',
  ice:'#78e1df', mint:'#c3f8df', greenDark:'#234b41', green:'#3d946c', lime:'#8be28d',
  blue:'#426b9e', cobalt:'#628ed5', paleBlue:'#a5b7df',
};

function canvas(w=640,h=360){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').imageSmoothingEnabled=false;return c;}
function rect(g,x,y,w,h,color) {
  g.fillStyle=color; g.fillRect(x,y,w,h);
}
function line(g,x0,y0,x1,y1,color,width=1) {
  x0=Math.round(x0); y0=Math.round(y0); x1=Math.round(x1); y1=Math.round(y1);
  const dx=Math.abs(x1-x0), sx=x0<x1?1:-1, dy=-Math.abs(y1-y0), sy=y0<y1?1:-1;
  let error=dx+dy;
  for (;;) {
    rect(g,x0,y0,width,width,color);
    if(x0===x1&&y0===y1)break;
    const e=2*error;
    if(e>=dy){error+=dy;x0+=sx;}
    if(e<=dx){error+=dx;y0+=sy;}
  }
}
function poly(g,points,color) {
  const ymin=Math.min(...points.map(p=>p[1])), ymax=Math.max(...points.map(p=>p[1]));
  for(let y=ymin;y<ymax;y++) {
    const xs=[];
    for(let i=0;i<points.length;i++) {
      const [a,b]=[points[i],points[(i+1)%points.length]];
      if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
    }
    xs.sort((a,b)=>a-b);
    for(let i=0;i+1<xs.length;i+=2)rect(g,Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,color);
  }
}
function oval(g,x,y,rx,ry,color) {
  for(let dy=-ry;dy<=ry;dy++) {
    const dx=Math.floor(rx*Math.sqrt(Math.max(0,1-dy*dy/(ry*ry))));
    rect(g,x-dx,y+dy,dx*2+1,1,color);
  }
}
function diamond(g,x,y,r,color) {poly(g,[[x,y-r],[x+r,y],[x,y+r+1],[x-r,y]],color);}
function edged(image) {
  const g=image.getContext('2d'), a=g.getImageData(0,0,image.width,image.height), original=new Uint8ClampedArray(a.data);
  for(let y=1;y<image.height-1;y++)for(let x=1;x<image.width-1;x++)if(original[(y*image.width+x)*4+3]) {
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const k=((y+dy)*image.width+x+dx)*4;
      if(!original[k+3]){a.data[k]=9;a.data[k+1]=13;a.data[k+2]=24;a.data[k+3]=255;}
    }
  }
  g.putImageData(a,0,0);return image;
}
const crewColors={pip:[C.cyan,C.ice,C.teal,C.white],bolt:[C.orange,C.gold,C.rust,C.gold],mori:[C.silver,C.white,C.teal,C.lime],mew:[C.violet,C.lavender,C.purple,C.silver]};
function crew(id,dir='front',frame=0) {
  const s=canvas(36,34),g=s.getContext('2d'),[body,light,shade,helmet]=crewColors[id];
  const bob=frame%2, y=2+bob;
  const footA=[0,-1,1,2][frame],footB=[0,2,-1,-1][frame];
  rect(g,12,23+footA,5,4,C.edge);rect(g,20,23+footB,5,4,C.edge);
  rect(g,12,23+footA,4,1,light);rect(g,20,23+footB,4,1,light);
  rect(g,11,15+bob,15,9,shade);rect(g,12,15+bob,11,7,body);rect(g,12,15+bob,4,5,light);
  rect(g,9,17+bob,3,6,shade);rect(g,9,17+bob,2,3,light);rect(g,25,17+bob,3,6,shade);
  if(id==='bolt') {
    rect(g,8,16+bob,20,7,shade);rect(g,10,16+bob,16,5,body);rect(g,10,16+bob,5,4,light);
    rect(g,7,16+bob,3,4,C.gold);rect(g,26,16+bob,3,4,C.rust);
  }
  rect(g,12,22+bob,13,2,C.purpleDark);rect(g,16,22+bob,3,2,C.silver);
  if(dir==='back') {
    rect(g,13,16+bob,11,7,C.steel);rect(g,14,16+bob,7,2,C.edge);rect(g,16,18+bob,5,4,shade);
    rect(g,16,19+bob,3,2,light);
  }else {
    rect(g,16,16+bob,3,6,shade);rect(g,18,17+bob,4,2,C.white);rect(g,19,17+bob,1,1,body);
    if(id==='mori'){rect(g,12,16+bob,4,8,C.white);rect(g,22,17+bob,3,7,C.white);rect(g,25,20+bob,3,3,C.lime);}
    if(id==='bolt'){rect(g,11,20+bob,15,2,C.brown);rect(g,13,20+bob,3,2,C.yellow);rect(g,23,15+bob,4,4,C.steel);}
  }
  poly(g,[[11,y],[24,y],[27,y+3],[27,y+10],[24,y+13],[11,y+13],[8,y+10],[8,y+3]],shade);
  rect(g,11,y,13,3,helmet);rect(g,9,y+3,17,7,helmet);rect(g,11,y+10,13,3,helmet);
  rect(g,11,y,9,1,C.white);rect(g,9,y+3,2,6,light);rect(g,24,y+4,2,7,shade);
  if(dir!=='back') {
    const vx=dir==='side'?16:11,vw=dir==='side'?10:13;
    rect(g,vx,y+4,vw,6,C.tealDark);rect(g,vx+1,y+4,vw-2,4,C.teal);
    rect(g,vx+1,y+4,4,1,C.ice);rect(g,vx+1,y+5,2,1,C.mint);
    rect(g,dir==='side'?23:14,y+6,2,2,C.white);
    if(dir==='front')rect(g,21,y+6,2,2,C.white);
    rect(g,vx+3,y+9,vw-5,1,shade);
    if(id==='mori'){rect(g,vx+2,y+5,4,4,C.cyan);rect(g,vx+7,y+5,4,4,C.cyan);rect(g,vx+2,y+5,2,1,C.mint);}
  }else{rect(g,13,y+5,9,4,light);rect(g,16,y+6,4,1,C.edge);}
  rect(g,7,y+5,2,4,C.edge);rect(g,27,y+5,2,4,body);
  if(id==='bolt'){rect(g,11,y-1,13,2,C.gold);rect(g,17,y-1,3,3,C.yellow);rect(g,8,14+bob,3,3,C.steel);}
  if(id==='mori'){rect(g,15,y-1,5,2,C.lime);rect(g,16,y-1,3,1,C.white);}
  if(id==='mew') {
    poly(g,[[10,y+3],[10,y-1],[15,y+1]],C.lavender);poly(g,[[21,y+1],[26,y-1],[26,y+4]],C.lavender);
    rect(g,11,y,2,2,C.pink);rect(g,24,y,1,2,C.pink);
    line(g,27,23+bob,31,21+bob,shade,2);line(g,31,21+bob,31,16+(frame%2),body,2);rect(g,31,15+(frame%2),2,2,C.yellow);
  }
  if(id==='bolt') {
    rect(g,29,17+bob,2,10,C.edge);rect(g,29,17+bob,1,8,C.silver);
    rect(g,27,12+bob,6,5,C.edge);rect(g,27,12+bob,2,4,C.silver);rect(g,31,12+bob,2,3,C.silver);
    rect(g,29,11+bob,2,3,C.void);
  }
  return edged(s);
}
function gun(id,angle=0) {
  const s=canvas(40,40),g=s.getContext('2d'),cx=17,cy=20;
  const direction=angle*Math.PI/180,co=Math.cos(direction),si=Math.sin(direction);
  const local=(x,y)=>[Math.round(cx+x*co-y*si),Math.round(cy+x*si+y*co)];
  const shape=(points,color)=>poly(g,points.map(([x,y])=>local(x,y)),color);
  shape([[-5,-3],[5,-3],[5,-2],[12,-2],[12,2],[3,2],[1,4],[-4,4]],C.steel);
  shape([[-4,-2],[5,-2],[5,0],[-4,0]],C.silver);
  shape([[5,-1],[12,-1],[12,1],[5,1]],id==='mori'?C.lime:C.ice);
  shape([[-2,2],[1,2],[0,7],[-3,6]],C.brown);
  if(id==='bolt') {
    shape([[0,-5],[7,-5],[10,-2],[10,3],[6,5],[0,5]],C.rust);
    shape([[2,-4],[7,-4],[9,-1],[3,-1]],C.gold);
    shape([[8,-1],[12,-1],[12,2],[8,2]],C.white);
  }
  if(id==='mew'){shape([[-5,-4],[4,-4],[4,-2],[-5,-2]],C.lavender);}
  const muzzle=local(16,0);
  return {image:edged(s),muzzle};
}
function flash(g,x,y,angle=0) {
  const a=angle*Math.PI/180,points=[[-2,0],[2,-3],[3,-1],[8,-2],[5,1],[8,3],[2,2],[0,4]];
  poly(g,points.map(([u,v])=>[Math.round(x+u*Math.cos(a)-v*Math.sin(a)),Math.round(y+u*Math.sin(a)+v*Math.cos(a))]),C.gold);
  diamond(g,x+2,y,2,C.white);
}
function enemy(type) {
  const s=canvas(32,32),g=s.getContext('2d');
  if(type==='slime') {
    poly(g,[[4,23],[5,14],[9,8],[16,6],[22,10],[26,15],[27,24],[22,26],[9,26]],C.plum);
    poly(g,[[5,21],[7,13],[12,9],[18,9],[23,14],[24,22],[19,24],[10,24]],C.red);
    rect(g,10,10,7,2,C.pink);rect(g,8,13,3,3,C.pink);
    rect(g,12,16,3,3,C.white);rect(g,20,16,3,3,C.white);rect(g,14,20,6,2,C.plum);
    rect(g,6,24,4,2,C.pink);rect(g,22,24,4,2,C.pink);
  }else {
    rect(g,10,22,5,5,C.purple);rect(g,20,21,5,5,C.purple);
    poly(g,[[10,12],[23,12],[26,18],[24,23],[10,23],[7,18]],C.plum);
    rect(g,10,13,13,6,C.red);rect(g,11,13,4,3,C.pink);rect(g,12,20,11,2,C.steel);
    poly(g,[[10,3],[22,3],[25,6],[24,13],[10,13],[7,9]],C.purple);
    rect(g,10,4,12,2,C.violet);rect(g,9,7,15,4,C.plum);rect(g,11,8,10,2,C.pink);rect(g,12,8,3,1,C.white);
    rect(g,21,16,9,4,C.steel);rect(g,26,16,4,2,C.orange);rect(g,8,14,3,5,C.pink);
  }
  return edged(s);
}
function swarmSprite() {
  const s=canvas(18,18),g=s.getContext('2d');
  line(g,5,7,3,2,C.red);line(g,12,7,15,3,C.red);
  poly(g,[[4,7],[7,5],[11,5],[14,8],[15,12],[12,15],[5,15],[2,12]],C.plum);
  poly(g,[[5,7],[10,6],[13,9],[13,12],[10,14],[5,13],[3,11]],C.red);
  rect(g,5,7,5,2,C.pink);rect(g,5,10,2,2,C.peach);rect(g,11,10,2,2,C.peach);
  rect(g,2,13,3,2,C.purple);rect(g,11,14,4,1,C.purple);
  return edged(s);
}
function tankerSprite(elite=false) {
  const s=canvas(elite?52:44,elite?50:42),g=s.getContext('2d'),o=elite?4:0;
  g.translate(o,o);
  poly(g,[[6,17],[3,8],[10,10],[12,4],[29,4],[33,11],[40,7],[38,18],[40,28],[35,34],[33,38],[26,38],[23,34],[17,34],[14,38],[7,38],[6,32],[3,27]],elite?C.gold:C.purpleDark);
  poly(g,[[11,13],[13,6],[28,6],[32,14],[36,21],[34,31],[27,34],[13,32],[7,25]],C.purple);
  poly(g,[[13,8],[27,8],[31,16],[26,20],[13,18],[8,22],[9,15]],elite?C.orange:C.violet);
  line(g,14,8,27,8,elite?C.yellow:C.lavender,2);
  rect(g,12,19,19,7,C.ink);rect(g,14,20,5,3,C.gold);rect(g,25,20,4,3,C.gold);
  rect(g,19,26,6,4,C.plum);rect(g,20,26,4,2,C.pink);
  poly(g,[[5,22],[10,20],[13,29],[8,32],[3,28]],C.purpleDark);
  poly(g,[[33,20],[39,23],[39,29],[32,32],[29,28]],C.purpleDark);
  rect(g,8,33,6,3,C.edge);rect(g,27,34,6,3,C.edge);
  if(elite){rect(g,11,3,20,2,C.yellow);rect(g,6,13,2,8,C.gold);rect(g,34,11,2,9,C.gold);}
  return edged(s);
}
function flyerSprite() {
  const s=canvas(30,26),g=s.getContext('2d');
  poly(g,[[12,10],[6,3],[1,2],[3,11],[9,16],[13,14],[17,14],[22,16],[28,9],[29,1],[23,4],[17,10]],C.brown);
  poly(g,[[11,11],[5,5],[3,4],[5,10],[10,13]],C.orange);
  poly(g,[[18,11],[24,6],[27,3],[25,10],[21,13]],C.gold);
  diamond(g,15,12,6,C.plum);diamond(g,15,11,4,C.rust);
  rect(g,12,9,6,2,C.pink);rect(g,14,10,2,2,C.peach);
  poly(g,[[13,16],[17,16],[16,20],[14,22],[13,18]],C.red);
  return edged(s);
}

const cache=new Map();
export function crewFrame(id,dir=0,frame=0,flash=false){
 const key=`c:${id}:${dir}:${frame}:${flash}`;if(cache.has(key))return cache.get(key);
 let s=crew(id,dir===2?'back':dir===0?'front':'side',frame);
 if(dir===1){const flip=canvas(36,34),g=flip.getContext('2d');g.translate(36,0);g.scale(-1,1);g.drawImage(s,0,0);s=flip;}
 if(flash){const g=s.getContext('2d');g.globalCompositeOperation='source-in';g.fillStyle=C.white;g.fillRect(0,0,36,34);}
 cache.set(key,s);return s;
}
export function weaponFrame(id,angle,firing=false){
 const step=((Math.round(angle/(Math.PI*2)*32)%32)+32)%32,key=`w:${id}:${step}:${firing}`;
 if(cache.has(key))return cache.get(key);
 const a=step/32*360,base=gun(id,a),g=base.image.getContext('2d');
 if(firing)flash(g,base.muzzle[0],base.muzzle[1],a);
 cache.set(key,base.image);return base.image;
}
export const enemyFamily=id=>['guard','shield','brute','tank','healer','jelly','orbiter'].includes(id)?'tank':['jet','gnat','wing','wingLeader','dodger','flock'].includes(id)?'flyer':['slime','fieldSlime','mini','swarm','rusher','worm','burrower','teleporter','sparkling'].includes(id)?'swarm':'trooper';
export function foeFrame(id,frame=0,flash=false,elite=false){
 const key=`e:${id}:${frame}:${flash}:${elite}`;if(cache.has(key))return cache.get(key);
 if(flash){const base=foeFrame(id,frame,false,elite),white=canvas(base.width,base.height),g=white.getContext('2d');g.drawImage(base,0,0);g.globalCompositeOperation='source-in';g.fillStyle=C.white;g.fillRect(0,0,white.width,white.height);cache.set(key,white);return white;}
 const family=enemyFamily(id),s=family==='tank'?tankerSprite(elite):family==='flyer'?flyerSprite():family==='swarm'?swarmSprite():enemy('trooper'),g=s.getContext('2d');
 const source={swarm:[C.plum,C.red,C.pink,C.peach],tank:[C.purpleDark,C.purple,C.violet,C.lavender],flyer:[C.plum,C.rust,C.pink,C.peach],trooper:[C.plum,C.red,C.pink,C.purple]};
 const target={swarm:[C.purpleDark,C.purple,C.violet,C.lavender],tank:[C.deep,C.blue,C.cobalt,C.paleBlue],flyer:[C.brown,C.rust,C.gold,C.yellow],trooper:[C.brown,C.rust,C.orange,C.purpleDark]};
 const image=g.getImageData(0,0,s.width,s.height);
 for(let i=0;i<image.data.length;i+=4){if(!image.data[i+3])continue;const col='#'+[0,1,2].map(j=>image.data[i+j].toString(16).padStart(2,'0')).join(''),idx=source[family].indexOf(col),color=flash?C.white:idx<0?col:target[family][idx];for(let j=0;j<3;j++)image.data[i+j]=parseInt(color.slice(1+j*2,3+j*2),16);}
 g.putImageData(image,0,0);
 const x=Math.floor(s.width/2),y=Math.floor(s.height/2);
 if(!flash){
  if(id==='jelly'){for(let j=-2;j<=2;j++){const xx=x+j*6;line(g,xx,y+11,xx+(j%2?2:-2),s.height-2,C.cobalt,2);rect(g,xx+(j%2?2:-2),s.height-3,2,2,C.ice);}}
  if(id==='sparkling'){poly(g,[[x+2,1],[x-3,8],[x+1,8],[x-2,16],[x+6,6],[x+1,6]],C.gold);rect(g,x,5,2,2,C.white);}
  if(id==='jet'){poly(g,[[x,1],[x-4,19],[x,24],[x+4,19]],C.steel);line(g,x,2,x,18,C.silver,2);for(const side of [-1,1])rect(g,x+side*9-1,12,3,7,C.edge);}
  if(id==='gnat'){line(g,x-2,y-4,x-7,1,C.gold,2);line(g,x+2,y-4,x+7,1,C.gold,2);rect(g,x-7,0,2,2,C.yellow);rect(g,x+6,0,2,2,C.yellow);}
  if(id==='weatherBomb'){g.clearRect(0,0,s.width,s.height);oval(g,x,y-3,10,12,C.ink);oval(g,x-1,y-4,8,10,C.rust);rect(g,x-5,y-10,5,2,C.gold);rect(g,x-4,y-4,3,3,C.yellow);rect(g,x+3,y-4,3,3,C.yellow);line(g,x,y+9,x,y+15,C.silver);rect(g,x-3,y+13,7,3,C.brown);}
  if(id==='pod'){rect(g,x-10,y-10,20,23,C.ink);rect(g,x-8,y-10,16,21,C.steel);rect(g,x-6,y-8,12,3,C.silver);rect(g,x-5,y-2,10,7,C.rust);rect(g,x-3,y,6,2,C.gold);for(const side of [-1,1])line(g,x+side*7,y+10,x+side*12,y+14,C.edge,3);}
  if(['shield','guard'].includes(id)){rect(g,x-7,y,14,11,C.ink);rect(g,x-5,y+1,10,8,C.cobalt);rect(g,x-1,y,2,9,C.ice);}
  if(['pod','weatherBomb','bomber'].includes(id)){line(g,x,y-9,x+4,y-13,C.gold,2);rect(g,x+3,y-14,3,3,C.white);}
  if(['worm','burrower'].includes(id)){line(g,2,y+5,s.width-3,y+5,C.rust,3);rect(g,3,y+2,2,4,C.gold);}
  if(id==='scarecrow'){rect(g,x-12,y-9,24,3,C.gold);rect(g,x-7,y-15,14,7,C.rust);rect(g,x-1,y+9,3,7,C.brown);}
  if(id==='teleporter'){g.clearRect(x-3,y-3,6,6);rect(g,x-1,y-7,2,2,C.ice);}
  if(id==='sniper'){rect(g,x,y+2,16,4,C.ink);rect(g,x,y+2,15,2,C.silver);}
  if(id==='healer'){rect(g,x-5,y-1,10,3,C.ice);rect(g,x-2,y-4,3,9,C.ice);}
  if(id==='summoner'){for(let j=-1;j<=1;j++)rect(g,x+j*5,y-11,2,8,C.gold);}
  if(frame%2){rect(g,x-6,s.height-4,3,2,C.edge);rect(g,x+4,s.height-3,3,2,C.edge);}
  if(elite){rect(g,x-7,1,14,2,C.gold);rect(g,x-3,0,6,1,C.yellow);}
 }
 cache.set(key,s);return s;
}
export function floorTile(id,variant=0){
 const key=`f:${id}:${variant}`;if(cache.has(key))return cache.get(key);
 const s=canvas(64,64),g=s.getContext('2d'),village=id==='village';rect(g,0,0,64,64,village?'#20332f':C.deep);
 for(let i=0;i<48;i++){const x=(i*17+variant*11)%64,y=(i*29+variant*7)%64;rect(g,x,y,2+i%4,1,village?[C.greenDark,C.tealDark,C.floor][i%3]:[C.floor,C.steel,C.purpleDark][i%3]);if(i%7===0)line(g,x,y,x+3,y-3,village?C.greenDark:C.void);}
 cache.set(key,s);return s;
}
