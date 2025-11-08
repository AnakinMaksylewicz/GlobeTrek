"use client";

import { useEffect, useRef } from "react";

export default function Globe() {
  const globeContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function initCesium() {
      const Cesium = await import("cesium");


      (window as any).CESIUM_BASE_URL = "/";

      
      const token = process.env.NEXT_PUBLIC_CESIUM_TOKEN;
      if (token) {
        Cesium.Ion.defaultAccessToken = token;
      } else {
        console.error("Cesium Ion token is missing");
      }

      if (!globeContainerRef.current) return;


      const viewer = new Cesium.Viewer(globeContainerRef.current, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
      });

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-80.24720398147936, 25.874578, 300),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-45.0),
        },
      });

      
      return () => viewer.destroy();
    }

    initCesium();
  }, []);

  return <div ref={globeContainerRef} className="w-full h-full" />;
}
