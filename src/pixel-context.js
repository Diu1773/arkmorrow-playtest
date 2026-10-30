export function pixelContext(canvas){
 if(!globalThis.WebGLRenderingContext)return null;
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:true});
 if(!gl)return null;
 let program,buffer,position,uv,color,resolution,atlases=[],images=new WeakMap(),vertices=new Float32Array(49152*8),used=0,current=null,framebuffer,layerTexture,layerW=0,layerH=0,lost=false;
 const debug=gl.getExtension('WEBGL_debug_renderer_info'),device=gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER);
 const opaque=[1,1,1,1];
 const atlasSize=Math.min(2048,gl.getParameter(gl.MAX_TEXTURE_SIZE)),colors=new Map(),stack=[];
 const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 function texture(){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
 function newAtlas(){
  const a={texture:texture(),x:2,y:2,row:0};gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,atlasSize,atlasSize,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));atlases.push(a);return a;
 }
 function initialize(){
  program=gl.createProgram();const vs=shader(gl.VERTEX_SHADER,'attribute vec2 p;attribute vec2 t;attribute vec4 c;uniform vec2 r;varying vec2 v;varying vec4 k;void main(){gl_Position=vec4(p.x/r.x*2.0-1.0,1.0-p.y/r.y*2.0,0.0,1.0);v=t;k=c;}'),fs=shader(gl.FRAGMENT_SHADER,'precision '+(gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision?'highp':'mediump')+' float;uniform sampler2D s;varying vec2 v;varying vec4 k;void main(){gl_FragColor=texture2D(s,v)*k;}');
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  position=gl.getAttribLocation(program,'p');uv=gl.getAttribLocation(program,'t');color=gl.getAttribLocation(program,'c');resolution=gl.getUniformLocation(program,'r');buffer=gl.createBuffer();gl.useProgram(program);gl.uniform1i(gl.getUniformLocation(program,'s'),0);
  gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
  atlases=[];images=new WeakMap();newAtlas();framebuffer=gl.createFramebuffer();layerTexture=texture();layerW=layerH=0;current=null;used=0;
 }
 function flush(){
  if(!used||lost)return;
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,vertices.subarray(0,used),gl.STREAM_DRAW);
  for(const [location,size,offset] of [[position,2,0],[uv,2,8],[color,4,16]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,32,offset);}
  gl.uniform2f(resolution,canvas.width,canvas.height);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,current);gl.drawArrays(gl.TRIANGLES,0,used/8);used=0;
 }
 function quad(t,x,y,w,h,u0,v0,u1,v1,rgba){
  if(lost||!w||!h)return;if(current!==t||used+48>vertices.length){flush();current=t;}
  const r=rgba[0],g=rgba[1],b=rgba[2],a=rgba[3];for(let i=0;i<6;i++){const right=i===1||i===4||i===5,bottom=i===2||i===3||i===5;vertices[used++]=right?x+w:x;vertices[used++]=bottom?y+h:y;vertices[used++]=right?u1:u0;vertices[used++]=bottom?v1:v0;vertices[used++]=r;vertices[used++]=g;vertices[used++]=b;vertices[used++]=a;}
 }
 function entry(image){
  let e=images.get(image);if(e&&(e.w!==image.width||e.h!==image.height)){images.delete(image);e=null;}if(e){if(image.pixelDynamic){flush();gl.bindTexture(gl.TEXTURE_2D,e.atlas.texture);gl.texSubImage2D(gl.TEXTURE_2D,0,e.x,e.y,gl.RGBA,gl.UNSIGNED_BYTE,image);}return e;}
  const w=image.width,h=image.height;if(w+4>atlasSize||h+4>atlasSize)throw Error('Pixel atlas image exceeds texture size');
  let a=atlases.at(-1);if(a.x+w+2>atlasSize){a.x=2;a.y+=a.row+2;a.row=0;}
  if(a.y+h+2>atlasSize){flush();if(atlases.length>=4){for(const old of atlases)gl.deleteTexture(old.texture);atlases=[];images=new WeakMap();}a=newAtlas();}
  e={atlas:a,x:a.x,y:a.y,w,h};a.x+=w+2;a.row=Math.max(a.row,h);images.set(image,e);flush();gl.bindTexture(gl.TEXTURE_2D,a.texture);gl.texSubImage2D(gl.TEXTURE_2D,0,e.x,e.y,gl.RGBA,gl.UNSIGNED_BYTE,image);return e;
 }
 function rgba(value,alpha){
  let c=colors.get(value);if(!c){if(value[0]==='#'){let h=value.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');c=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255);c.push(h.length===8?parseInt(h.slice(6,8),16)/255:1);}else{const n=value.match(/[\d.]+/g)?.map(Number)??[255,255,255];c=[n[0]/255,n[1]/255,n[2]/255,n[3]??1];}colors.set(value,c);}if(alpha===1&&c[3]===1)return c;const a=c[3]*alpha;return [c[0]*a,c[1]*a,c[2]*a,a];
 }
 const ctx={
  canvas,backend:'WebGL',device,get lost(){return lost;},fillStyle:'#000000',globalAlpha:1,imageSmoothingEnabled:false,
  setTransform(){if(lost)return;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);},
  save(){stack.push([this.fillStyle,this.globalAlpha]);},restore(){const s=stack.pop();if(s)[this.fillStyle,this.globalAlpha]=s;},
  fillRect(x,y,w,h){const a=atlases.find(a=>a.texture===current)??atlases[0];quad(a.texture,x,y,w,h,.5/atlasSize,.5/atlasSize,.5/atlasSize,.5/atlasSize,rgba(this.fillStyle,this.globalAlpha));},
  clearRect(x,y,w,h){flush();gl.enable(gl.SCISSOR_TEST);gl.scissor(x,canvas.height-y-h,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.SCISSOR_TEST);},
  drawImage(image,...args){
   if(lost)return;const e=entry(image);let sx=0,sy=0,sw=e.w,sh=e.h,dx,dy,dw,dh;
   if(args.length===2){[dx,dy]=args;dw=sw;dh=sh;}else if(args.length===4)[dx,dy,dw,dh]=args;else [sx,sy,sw,sh,dx,dy,dw,dh]=args;
   const a=this.globalAlpha;quad(e.atlas.texture,dx,dy,dw,dh,(e.x+sx)/atlasSize,(e.y+sy)/atlasSize,(e.x+sx+sw)/atlasSize,(e.y+sy+sh)/atlasSize,(a===1?opaque:[a,a,a,a]));
  },
  pixelLayer(draw,opacity){
   flush();if(layerW!==canvas.width||layerH!==canvas.height){layerW=canvas.width;layerH=canvas.height;gl.bindTexture(gl.TEXTURE_2D,layerTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,layerW,layerH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,layerTexture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Pixel layer framebuffer incomplete');}else gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);try{draw();}finally{flush();gl.bindFramebuffer(gl.FRAMEBUFFER,null);}quad(layerTexture,0,0,canvas.width,canvas.height,0,1,1,0,[opacity,opacity,opacity,opacity]);flush();
  },
  flush,finish(){flush();gl.finish();},
 };
 initialize();canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;});canvas.addEventListener('webglcontextrestored',()=>{lost=false;initialize();});return ctx;
}
