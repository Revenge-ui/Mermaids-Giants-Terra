export function DeckManaCurve({ curve }: { curve: readonly number[] }) {
  const peak = Math.max(1, ...curve);
  return <div className="mana-curve"><h4>费用曲线</h4><div>{curve.map((count, cost) => <span key={cost}><i style={{ height: `${Math.max(4, count / peak * 54)}px` }} /><b>{count}</b><small>{cost === 7 ? "7+" : cost}</small></span>)}</div></div>;
}
