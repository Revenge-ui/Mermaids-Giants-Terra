export function Mana({ current, max, temporary = 0, compact = false }: { current: number; max: number; temporary?: number; compact?: boolean }) {
  const slots = max + temporary;
  return (
    <div className={`mana ${compact ? "compact" : ""}`} aria-label={`${current}/${max} 法力${temporary ? `，含 ${temporary} 点临时法力` : ""}`}>
      <span className="mana-count"><b>{current}</b> / {max}{temporary > 0 && <em> +{temporary}</em>}</span>
      <span className="crystals">
        {Array.from({ length: slots }, (_, index) => <i key={index} className={`${index < current ? "full" : "spent"} ${index >= max ? "temporary" : ""}`} />)}
      </span>
    </div>
  );
}
