import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { UIAudioManager } from "../audioManager";

export function GameButton({ variant = "secondary", loading = false, className = "", children, disabled, onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "icon"; loading?: boolean }) {
  return <button {...props} className={`ui-button ${variant} ${className}`} disabled={disabled || loading} aria-busy={loading} onPointerEnter={() => UIAudioManager.play("hover")} onClick={(event) => { UIAudioManager.play("click"); onClick?.(event); }}>{loading && <Spinner />}{children}</button>;
}
export function GamePanel({ material = "stone", children, className = "" }: { material?: "stone" | "wood" | "parchment"; children: ReactNode; className?: string }) { return <section className={`ui-panel ${material} ${className}`}>{children}</section>; }
export function Spinner() { return <i className="ui-spinner" aria-hidden="true" />; }
export function GameLoading({ label = "正在准备旅程…" }: { label?: string }) { return <div className="ui-loading" role="status"><Spinner /><span>{label}</span></div>; }
// Only use determinate progress when the caller has a real measured value.
export function ProgressBar({ value, label }: { value: number; label: string }) { const progress = Math.max(0, Math.min(100, value)); return <div className="ui-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>; }
export function TransitionOverlay({ label }: { label: string }) { return <div className="ui-loading-overlay"><GameLoading label={label} /></div>; }
export function SceneTransition({ children }: { children: ReactNode }) { return <div className="scene-transition">{children}</div>; }
export function GameToast({ message, kind = "info", onClose }: { message: string; kind?: "info" | "success" | "warning" | "error"; onClose?: () => void }) {
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => { if (!message || !closeRef.current) return; const timer = window.setTimeout(() => closeRef.current?.(), 3000); return () => window.clearTimeout(timer); }, [message]);
  if (!message) return null;
  return <div className={`ui-toast ${kind}`} role={kind === "error" ? "alert" : "status"}><i>{kind === "success" ? "✓" : kind === "error" ? "!" : "◇"}</i><span>{message}</span>{onClose && <button aria-label="关闭提示" onClick={onClose}>×</button>}</div>;
}
export function GameModal({ title, children, onClose, className = "" }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const titleId = useId(); const root = useRef<HTMLElement>(null); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroll = document.body.style.overflow; document.body.style.overflow = "hidden";
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const nodes = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]') ?? []);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handle, true);
    return () => { document.body.style.overflow = scroll; document.removeEventListener("keydown", handle, true); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="ui-modal-backdrop" onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}><section ref={root} className={`ui-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId}><header><h2 id={titleId}>{title}</h2><GameButton variant="icon" aria-label="关闭弹窗" onClick={onClose}>×</GameButton></header>{children}</section></div>;
}
