// "use client";

// import {useEffect, useRef} from "react";
// import * as Cesium from "cesium";

// export default function Globe() {
//     const globeContainerRef = useRef<HTMLDivElement | null>(null);

//     useEffect(() => {

//         (window as any).CESIUM_BASE_URL = "/";

//         const token = process.env.NEXT_PUBLIC_CESIUM_TOKEN;
//         if (token) {
//             Cesium.Ion.defaultAccessToken = token;
//         } else {
//             console.error("Cesium Ion access token is not defined.");
//         }

//         if(!globeContainerRef.current) return;

//         const viewer = new Cesium.Viewer(globeContainerRef.current, {
//             terrain: Cesium.Terrain.fromWorldTerrain(),
//         });

//         return () => {
//             viewer.destroy();
//         }
//     }, []);
//     return <div ref={globeContainerRef} className="w-full h-full" />;   
// }
"use client";

import { useEffect, useRef } from "react";

export default function Globe() {
  const globeContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function initCesium() {
      // Dynamically import Cesium only on the client
      const Cesium = await import("cesium");

      // Tell Cesium where to find its static assets
      (window as any).CESIUM_BASE_URL = "/";

      // Set token
      const token = process.env.NEXT_PUBLIC_CESIUM_TOKEN;
      console.log("Loaded Cesium token:", token);
      if (token) {
        Cesium.Ion.defaultAccessToken = token;
      } else {
        console.error("Cesium Ion token is missing");
      }

      if (!globeContainerRef.current) return;

      // Create the viewer
      const viewer = new Cesium.Viewer(globeContainerRef.current, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
      });

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-122.4175, 37.655, 400),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-15.0),
        },
      });

      // Cleanup
      return () => viewer.destroy();
    }

    initCesium();
  }, []);

  return <div ref={globeContainerRef} className="w-full h-full" />;
}
