"use client";

import { useEffect, useState } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

export function DashboardAmbientShader() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[300px] overflow-hidden bg-[#f5f7fb]" aria-hidden="true">
    <MeshGradient className="absolute inset-0 h-full w-full opacity-35" colors={["#f5f9fd", "#eaf4fb", "#edf2f8", "#dfeaf4"]} distortion={0.18} swirl={0.08} speed={reducedMotion ? 0 : 0.16} minPixelRatio={0.5} maxPixelCount={350000} />
    <div className="absolute inset-0 bg-white/65" />
  </div>;
}
