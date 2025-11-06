'use client';

import useStateData, { fmtMoney } from '../_useStateData';

export default function LowerThird() {
  const { burnsSorted, priceUsdPerSol } = useStateData();
  const visible = burnsSorted.slice(0, Math.max(4, Math.min(10, burnsSorted.length)));
  const items = visible.length > 1 ? [...visible, ...visible] : visible;
  const dur = Math.max(20, visible.length * 6);

  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
      <div style={{
        position:'absolute', left:0, right:0, bottom:0, height:64, overflow:'hidden',
        background:'linear-gradient(180deg, rgba(12,18,15,.0), rgba(12,18,15,.85))',
        borderTop:'1px solid rgba(255,255,255,.08)'
      }}>
        <div style={{
          display:'flex', gap:16, padding:'10px 12px',
          animation:`marquee ${dur}s linear infinite`,
          whiteSpace:'nowrap', color:'rgba(255,240,210,.92)', fontSize:16, fontWeight:700
        }}>
          {items.map((b, i) => (
            <span key={b.id+'-'+i} style={{
              display:'inline-flex', alignItems:'center', gap:10,
              padding:'8px 12px', borderRadius:14, background:'rgba(255,170,70,.08)',
              border:'1px solid rgba(255,170,70,.25)'
            }}>
              🔥 Burn • {b.amount.toLocaleString()} BBURN
              {typeof b.sol === 'number' ? (
                <em style={{ fontWeight:600, opacity:.85 }}>
                  &nbsp;≈ {b.sol.toFixed(4)} SOL ({fmtMoney(b.sol * priceUsdPerSol)})
                </em>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
