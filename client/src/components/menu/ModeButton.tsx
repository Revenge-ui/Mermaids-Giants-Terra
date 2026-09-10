export function ModeButton({ icon, title, subtitle, onClick, disabled }: {
  icon: string; title: string; subtitle: string; onClick: () => void; disabled?: boolean;
}) {
  return <button className="mode-button" onClick={onClick} disabled={disabled}><i>{icon}</i><span><b>{title}</b><small>{subtitle}</small></span><em>›</em></button>;
}
