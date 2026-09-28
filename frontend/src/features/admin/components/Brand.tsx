"use client";

export function Brand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <div className={`brand ${light ? "brand--light" : ""}`}>
      <span className="brand-mark"><span>TD</span></span>
      {!compact && <span className="brand-copy"><strong>Train Dabba</strong><small>Super admin portal</small></span>}
    </div>
  );
}
