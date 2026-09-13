import { type PlayerViewState } from "@riftbound/shared";
import type { CSSProperties } from "react";
import { CardFace } from "../ui/CardFace";
import { GameButton, GameLoading } from "../ui/GameUI";

export function MulliganOverlay({ game, resolved = false, selectedIds, pending, onToggle, onConfirm }: {
  game: PlayerViewState; resolved?: boolean; selectedIds: readonly string[]; pending: boolean;
  onToggle: (instanceId: string) => void; onConfirm: () => void;
}) {
  const second = game.you.playerId !== game.firstPlayerId;
  const waiting = game.mulliganConfirmed && !resolved;
  return <div className={`mulligan-overlay ${resolved ? "resolved" : ""}`}><section className="mulligan-panel" role="dialog" aria-modal="true" aria-labelledby="mulligan-heading">
    <p className="mulligan-kicker">{resolved ? "命运已定 · 对决即将开始" : second ? "后手 · 四张起手牌与一枚馈赠" : "先手 · 三张起手牌"}</p>
    <h2 id="mulligan-heading">{resolved ? "准备迎接你的第一回合" : waiting ? "起手已确认" : "选择你要替换的卡牌"}</h2>
    <p>{resolved ? "新的篇章，由此开启" : waiting ? "你的选择已由服务器保存。" : "点击卡牌标记替换，再次点击取消；也可以保留全部起手。"}</p>
    <div className={`mulligan-cards ${resolved ? "resolved-cards" : ""} ${pending ? "returning-cards" : ""}`}>
      {game.you.hand.map((card, index) => {
        const special = card.definitionId === "SPECIAL_BITCOIN_COIN";
        const selected = selectedIds.includes(card.instanceId);
        return <div className="opening-card-slot" key={card.instanceId} style={{ "--deal-index": index } as CSSProperties}><button className={`${special ? "special" : ""} ${selected ? "replace" : ""}`} disabled={special || pending || waiting || resolved} aria-pressed={selected} aria-label={special ? "后手奖励，比特币，不可替换" : `起手牌 ${index + 1}${selected ? "，已标记替换" : "，点击替换"}`} onClick={() => onToggle(card.instanceId)}><CardFace card={card} /></button><em>{special ? "后手奖励 · 不可替换" : resolved ? "准备就绪" : selected ? "↻ 替换" : waiting ? "已保留" : "点击替换"}</em></div>;
      })}
    </div>
    {second && <div className="bitcoin-note"><b>₿ 比特币</b><span>0 费 · 本回合 +1 临时水晶 · 不增加永久上限</span></div>}
    {waiting ? <GameLoading label={game.opponent.name === "人类新神" ? "人类新神正在选择起手…" : "等待对手准备…"} /> : !resolved && <GameButton className="mulligan-confirm" variant="primary" loading={pending} onClick={onConfirm}>{`确认起手${selectedIds.length ? ` · 替换 ${selectedIds.length} 张` : " · 全部保留"}`}</GameButton>}
  </section></div>;
}
