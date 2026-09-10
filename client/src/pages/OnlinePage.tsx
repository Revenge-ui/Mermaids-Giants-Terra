import { FeatureFrame } from "../components/menu/FeatureFrame";

export function OnlinePage({ name, code, deckName, busy, connected, error, onNameChange, onCodeChange, onCreate, onJoin, onChangeDeck, onBack }: {
  name: string; code: string; deckName: string; busy: boolean; connected: boolean; error: string;
  onNameChange: (name: string) => void; onCodeChange: (code: string) => void;
  onCreate: () => void; onJoin: () => void; onChangeDeck: () => void; onBack: () => void;
}) {
  return <FeatureFrame icon="⚔" eyebrow="好友对战" title="联机模式" description="创建新的六位房间码，或加入旅伴的牌局。" onBack={onBack}>
    <div className="online-grid">
      <section className="online-card"><i>Ⅰ</i><h2>创建房间</h2><p>生成房间码并等待另一名玩家加入。</p><button className="feature-primary" onClick={onCreate} disabled={!connected || busy}>创建联机房间</button></section>
      <section className="online-card"><i>Ⅱ</i><h2>加入房间</h2><label htmlFor="online-code">六位房间码</label><input id="online-code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ""))} placeholder="482913" /><button className="feature-primary" onClick={onJoin} disabled={!connected || busy || code.length !== 6}>进入牌局</button></section>
    </div>
    <div className="online-selected-deck"><span>当前出战卡组</span><b>{deckName}</b><button onClick={onChangeDeck}>更换卡组</button></div>
    <label className="online-name" htmlFor="online-name">本局称号<input id="online-name" maxLength={16} value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="无名旅者" /></label>
    {error && <p className="feature-error" role="alert">{error}</p>}
  </FeatureFrame>;
}
