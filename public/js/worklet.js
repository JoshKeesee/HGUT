const worklet = (() => {
  const codeString = `const QUANTUM_SIZE=128;class audioMonitor extends AudioWorkletProcessor{constructor(){super(),this._volume=0,this._updateIntervalInMS=25,this._nextUpdateFrame=this._updateIntervalInMS}static get parameterDescriptors(){return[{name:"clipLevel",defaultValue:.98},{name:"averaging",defaultValue:.95},{name:"clipLag",defaultValue:750}]}get intervalInFrames(){return this._updateIntervalInMS/1e3*sampleRate}process(e,t,a){const r=a.clipLevel[0],s=a.averaging[0],n=a.clipLag[0],i=e[0].map(((e,t)=>{const a=e;let i=0,o=!1,l=0;for(let e=0;e<a.length;++e)Math.abs(a[e])>=r&&(o=!0,l=Date.now()),l+n<Date.now()&&(o=!1),i+=a[e]*a[e];const u=Math.sqrt(i/a.length);return this._volume=Math.max(u,this._volume*s),{value:this._volume,clipping:o}}));return this._nextUpdateFrame-=128,this._nextUpdateFrame<0&&(this._nextUpdateFrame+=this.intervalInFrames,this.port.postMessage({volume:i})),!0}}registerProcessor("audio-monitor",audioMonitor);`;
  return URL.createObjectURL(
    new Blob([codeString], { type: "text/javascript" }),
  );
})();
