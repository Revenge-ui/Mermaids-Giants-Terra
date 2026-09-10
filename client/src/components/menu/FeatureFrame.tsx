import type { ReactNode } from "react";

export function FeatureFrame({ icon, eyebrow, title, description, onBack, children }: {
  icon: string; eyebrow: string; title: string; description: string; onBack: () => void; children: ReactNode;
}) {
  return <main className="feature-shell"><div className="curtain curtain-left" /><div className="curtain curtain-right" />
    <section className="feature-panel">
      <button className="back-button" onClick={onBack}>‹ 返回大厅</button>
      <header><i>{icon}</i><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></header>
      <div className="feature-content">{children}</div>
    </section>
  </main>;
}
