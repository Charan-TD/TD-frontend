"use client";

export function Brand({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <div className={`brand ${light ? "brand--light" : ""}`}>
      <span className="brand-mark"><img src="/logo.jpg" alt="Train Dhaba" width={40} height={40} /></span>
      {!compact && <span className="brand-copy"><strong>Train Dabba</strong><small>Super admin portal</small></span>}
    </div>
  );
}
