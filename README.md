# Contour ⛰️

**🏆 2nd Place out of 200 participants — Google Gemini 3 Hackathon 2026**

**Transform 2D topographic maps into explorable 3D terrain with Gemini Live API as a tour guide.**

🚨🚨🚨 [**Watch Demo Video**](https://drive.google.com/file/d/1bTEDKPn7YTp_soc8YL3LzkOpFNMKOYcw/view?usp=sharing) 🚨🚨🚨 - I'll upload a better one asap!


<p align="center">
  <img src="assets/image1.png" width="49%" alt="Orbit view of Kauai terrain" />
  <img src="assets/image2.png" width="49%" alt="Flying over terrain in plane mode" />
</p>

Generated from:
<p align="center">
  <img src="assets/map.jpg" width="49%" alt="Original Map" />
</p>

Upload a topo map in JPG or GeoTIFF, and Contour builds a 3D flyable terrain you can explore while chatting with Gemini about what you're seeing.

## Features

- **📤 Upload any map** — GeoTIFF (auto-extracts bounds) or JPG/PNG (Gemini-extracted bounds)
- **🗺️ Real elevation data** — Fetches DEM tiles from AWS Terrain Tiles
- **🎮 Fly mode** — WASD + mouse to soar over your terrain
- **🎤 Voice tour guide** — Talk to Gemini about the terrain using Live API
- **🌄 Dynamic lighting** — Adjustable sun position for dramatic relief


## Gemini Features Used

| Feature | Gemini Capability | How It's Used |
|---------|-------------------|---------------|
| 🗺️ **Bounds Extraction** | Gemini 2.0 Flash | Gemini reads lat/lon coordinates from map borders and graticules from JPGs|
| 🎨 **Texture Stylization** | Nano Banana Pro (via fal.ai) | Adds hypsometric-tinted textures and colours |
| 🎤 **Voice Tour Guide** | Gemini Live API | Real-time voice conversation while flying over terrain. Guide knows map name, bounds, and current flight position |

---

## Quick Start

```bash
# Clone and enter
git clone <repo>
cd contour

# Set up environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY and FAL_KEY

# Install dependencies
uv sync

# Run
uv run python run.py
```

Open http://localhost:8000

## Usage

1. **Upload a map** — Drop a GeoTIFF or JPG topo image
2. **Set bounds** — Auto-detected for GeoTIFF, or click "Extract with Gemini" for JPG
3. **Build terrain** — Click "Fetch Real DEM" to get elevation data
4. **Explore** — Adjust scale, enter Fly Mode (WASD)
5. **Talk to your guide** — Click "Start Voice Chat" and ask about the terrain

## Controls

| Mode | Control | Action |
|------|---------|--------|
| Orbit | Drag | Rotate view |
| Orbit | Scroll | Zoom in/out |
| Fly | WASD | Pitch and turn |

## Tech Stack

- **Frontend**: Vanilla JS + Three.js (no build step)
- **Backend**: FastAPI + Python
- **Elevation**: AWS Terrain Tiles (Terrarium encoding)
- **AI**: Gemini 2.0 Flash, Gemini Live API, fal.ai Nano Banana Pro

## Project Structure

```
contour/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── terrain.py       # GeoTIFF processing
│   ├── gemini_client.py # Gemini API calls
│   └── fal_stylize.py   # Texture stylization
├── frontend/
│   ├── index.html       # UI
│   ├── app.js           # Three.js scene + controls
│   ├── voice.js         # Gemini Live API voice chat
│   ├── audio-processor.js # AudioWorklet for mic capture
│   └── style.css        # Styling
├── run.py               # Entry point
├── pyproject.toml       # Dependencies (uv)
└── .env.example         # Environment template
```

## Sample Data

USGS Historical Topographic Maps work great:
- [USGS topoView](https://ngmdb.usgs.gov/topoview/viewer/)
- Download GeoTIFF or high-res JPG

## How It Works

1. **Upload** → Extract texture + bounds from GeoTIFF (or image)
2. **DEM Fetch** → Convert bounds to tile coords → fetch Terrarium PNGs → decode elevation
3. **3D Build** → Create PlaneGeometry → displace vertices by elevation → apply map texture
4. **Voice** → WebSocket to Gemini Live API → stream mic audio → receive spoken responses

## Known Limitations

- Voice chat exposes API key to browser (fine for demo, not production)
- DEM resolution limited to zoom 11 (~30m)
- Large GeoTIFFs may be slow to process

## Credits

- Elevation tiles: [Mapzen/AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
- Maps: [USGS National Map](https://www.usgs.gov/programs/national-geospatial-program/national-map)
- 3D: [Three.js](https://threejs.org/)
- AI: [Google Gemini](https://ai.google.dev/), [fal.ai](https://fal.ai/)

## License

Apache 2.0
