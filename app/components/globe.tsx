"use client";

import { useEffect, useRef } from "react";

type FlyLocation = {
  name: string;
  lat: number;
  lon: number;
}

export default function Globe({flySequence = []}: {flySequence?: FlyLocation[]}) {
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);

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
      
      viewerRef.current = viewer;
      
      return () => viewer.destroy();
    }

    initCesium();
  }, []);

  useEffect(() => {
  if (!viewerRef.current || flySequence.length === 0) return;

  import("cesium").then((Cesium) => {
    const viewer = viewerRef.current;

    viewer.entities.removeAll();

    flySequence.forEach((loc, index) => {
      setTimeout(() => {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat, 300),
          duration: 4,
        });

        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat),
          point: { pixelSize: 10, color: Cesium.Color.RED },
          name: loc.name,
        });
      }, index * 5000);
    });
  });
}, [flySequence]);



  return <div ref={globeContainerRef} className="w-full h-full" />;
}
