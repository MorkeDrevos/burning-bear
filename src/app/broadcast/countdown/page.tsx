'use client';

import useStateData, { pad2 } from '../_useStateData';

export default function Countdown() {
  const { nextBurnMs } = useStateData();
  const t = Math.max(0, Math.floor((nextBurnMs ?? 0) / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;

  return (
    <div style={{
      position:'fixed', inset:0, display:'grid', placeItems:'center',
      background:'radial-gradient(60% 50% at 50% 55%, rgba(255,160,60,.15), rgba(0,0,0,0))',
      pointerEvents:'none', color:'#ffeccc', fontFamily:'Inter, ui-sans-serif'
    }}>
      <div style={{textAlign:'center'}}>
        <div style={{opacity:.8, letterSpacing:'0.25em', textTransform:'uppercase'}}>Next burn in</div>
        <div style={{marginTop:8, fontSize:92, fontWeight:900, textShadow:'0 0 18px rgba(255,180,70,.35)'}}>
          {h}:{pad2(m)}:{pad2(s)}
        </div>
      </div>
    </div>
  );
}
