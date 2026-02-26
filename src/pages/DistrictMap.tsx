import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Map as MapIcon,
  Layers,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  fetchDistrictData,
  districtLayerConfigs,
  STATE_MAP_CONFIG,
  type DistrictLayer,
} from "@/lib/stateDistricts";
import { US_STATES } from "@/lib/usStates";

import "leaflet/dist/leaflet.css";

const layerToggleLabels: { id: DistrictLayer; short: string }[] = [
  { id: "congressional", short: "Congress" },
  { id: "state-senate", short: "Senate" },
  { id: "state-house", short: "House" },
];

const DistrictMap = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const geoLayersRef = useRef<Record<string, any>>({});
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const [selectedState, setSelectedState] = useState("NV");
  const [activeLayer, setActiveLayer] = useState<DistrictLayer>("congressional");
  const [geoData, setGeoData] = useState<Record<string, GeoJSON.FeatureCollection> | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  const stateConfig = STATE_MAP_CONFIG[selectedState] || STATE_MAP_CONFIG.NV;
  const stateName = US_STATES.find((s) => s.abbr === selectedState)?.name || selectedState;

  // Fetch GeoJSON when state changes
  useEffect(() => {
    setLoading(true);
    setGeoData(null);
    fetchDistrictData(selectedState).then((data) => {
      setGeoData(data);
      setLoading(false);
    });
  }, [selectedState]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      leafletRef.current = L;

      const map = L.map(mapRef.current!, {
        center: stateConfig.center,
        zoom: stateConfig.zoom,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      if (geoData) renderLayer(activeLayer, map, L, geoData);
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center map when state changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(stateConfig.center, stateConfig.zoom);
    }
  }, [selectedState, stateConfig]);

  const renderLayer = useCallback(
    (layerId: DistrictLayer, map?: any, L?: any, data?: any) => {
      const m = map || mapInstanceRef.current;
      const l = L || leafletRef.current;
      const d = data || geoData;
      if (!m || !l || !d?.[layerId]) return;

      // Remove old layers
      Object.values(geoLayersRef.current).forEach((gl: any) => {
        if (m.hasLayer(gl)) m.removeLayer(gl);
      });
      geoLayersRef.current = {};

      const config = districtLayerConfigs[layerId];
      const collection = d[layerId];
      if (!collection.features.length) return;

      const geoLayer = l.geoJSON(collection, {
        style: () => ({
          color: "hsl(220, 20%, 30%)",
          weight: 2,
          fillColor: config.fillColor,
          fillOpacity: 0.35,
          opacity: 0.8,
        }),
        onEachFeature: (feature: any, layer: any) => {
          const props = feature.properties || {};
          const name =
            props.NAMELSAD || props.NAME || props.BASENAME ||
            `District ${props.district || props.CD118FP || props.SLDUST || props.SLDLST || "?"}`;

          layer.bindPopup(
            `<div style="font-family: Inter, sans-serif; font-size: 13px;">
              <strong style="font-family: 'Playfair Display', serif;">${name}</strong>
            </div>`,
            { className: "district-popup" }
          );

          layer.on({
            mouseover: (e: any) => {
              e.target.setStyle({ fillOpacity: 0.6, weight: 3 });
              setHoveredDistrict(name);
            },
            mouseout: (e: any) => {
              geoLayer.resetStyle(e.target);
              setHoveredDistrict(null);
            },
          });
        },
      }).addTo(m);

      geoLayersRef.current[layerId] = geoLayer;

      try {
        m.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
      } catch {
        m.setView(stateConfig.center, stateConfig.zoom);
      }
    },
    [geoData, stateConfig]
  );

  // Re-render when active layer or data changes
  useEffect(() => {
    if (!loading && geoData && mapInstanceRef.current && leafletRef.current) {
      renderLayer(activeLayer);
    }
  }, [activeLayer, loading, geoData, renderLayer]);

  const featureCount = geoData?.[activeLayer]?.features.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="h-5 w-px bg-border" />

          {/* State selector */}
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-[180px] font-body text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {US_STATES.map((s) => (
                <SelectItem key={s.abbr} value={s.abbr}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hoveredDistrict && (
            <span className="ml-auto hidden font-body text-xs text-muted-foreground md:inline">
              {hoveredDistrict}
            </span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <MapIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-headline md:text-3xl">
                {stateName} District Map
              </h1>
              <p className="font-body text-sm text-secondary-custom">
                Explore {stateName}'s congressional and state legislative district boundaries
              </p>
            </div>
          </div>
        </motion.div>

        {/* Layer toggles */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-4 flex flex-wrap items-center gap-2"
        >
          <Layers className="h-4 w-4 text-muted-foreground" />
          {layerToggleLabels.map((lt) => (
            <Button
              key={lt.id}
              variant={activeLayer === lt.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveLayer(lt.id)}
              className="font-body text-xs"
            >
              {lt.short}
            </Button>
          ))}
          <span className="ml-auto font-body text-xs text-muted-foreground">
            {loading ? "Loading…" : `${featureCount} districts`}
          </span>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="relative overflow-hidden rounded-xl border border-border shadow-card"
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="font-body text-sm text-muted-foreground">Loading {stateName} district boundaries…</p>
              </div>
            </div>
          )}
          <div
            ref={mapRef}
            className="h-[500px] w-full md:h-[650px]"
            style={{ background: "hsl(220, 20%, 7%)" }}
          />
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4"
        >
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="font-body text-xs font-medium text-headline">{districtLayerConfigs[activeLayer].label}</span>
          <div className="flex items-center gap-4">
            {layerToggleLabels.map((lt) => (
              <div key={lt.id} className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm" style={{ background: districtLayerConfigs[lt.id].fillColor }} />
                <span className="font-body text-xs text-muted-foreground">{lt.short}</span>
              </div>
            ))}
          </div>
          <p className="ml-auto font-body text-[10px] italic text-muted-foreground/60">
            Boundaries: U.S. Census Bureau TIGERweb
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default DistrictMap;
