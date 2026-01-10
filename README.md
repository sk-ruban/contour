# Contour 🏔️

**Transform 2D topographic maps into explorable 3D terrain with an AI tour guide.**

Upload a USGS topo map or GeoTIFF, and Contour builds a 3D flyable terrain you can explore while chatting with Gemini about what you're seeing.

![Contour Demo](https://drive.google.com/file/d/1bTEDKPn7YTp_soc8YL3LzkOpFNMKOYcw/view?usp=sharing)

## Features

- **📤 Upload any map** — GeoTIFF (auto-extracts bounds) or JPG/PNG (manual or AI-extracted bounds)
- **🗺️ Real elevation data** — Fetches DEM tiles from AWS Terrain Tiles
- **🎮 Fly mode** — WASD + mouse to soar over your terrain
- **🎤 Voice tour guide** — Talk to Gemini about the terrain using Live API
- **🌄 Dynamic lighting** — Adjustable sun position for dramatic relief

## Quick Start

```bash
# Clone and enter
git clone <repo>
cd contour

# Set up environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Install dependencies
pip install -r requirements.txt

# Run
python run.py
```

Open http://localhost:8000

## Usage

1. **Upload a map** — Drop a GeoTIFF or topo image
2. **Set bounds** — Auto-detected for GeoTIFF, or click "Extract with Gemini" for images
3. **Build terrain** — Click "Fetch Real DEM" to get elevation data
4. **Explore** — Adjust exaggeration, enter Fly Mode (WASD + Space/C)
5. **Talk to your guide** — Click "Start Voice Chat" and ask about the terrain

## Controls

| Mode | Control | Action |
|------|---------|--------|
| Orbit | Drag | Rotate view |
| Orbit | Scroll | Zoom in/out |
| Fly | WASD | Move horizontally |
| Fly | Space/C | Ascend/descend |
| Fly | Mouse | Look around |
| Fly | Shift | Speed boost |

## Tech Stack

- **Frontend**: Vanilla JS + Three.js (no build step)
- **Backend**: FastAPI + Python
- **Elevation**: AWS Terrain Tiles (Terrarium encoding)
- **AI**: Gemini 2.0 Flash (bounds extraction) + Gemini Live API (voice chat)

## Project Structure

```
contour/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── terrain.py       # GeoTIFF processing
│   └── gemini_client.py # Gemini API calls
├── frontend/
│   ├── index.html       # UI
│   ├── app.js           # Three.js scene + controls
│   ├── voice.js         # Gemini Live API voice chat
│   └── style.css        # Styling
├── run.py               # Entry point
└── requirements.txt
```

## Environment Variables

```bash
GEMINI_API_KEY=your_key_here
```

## Sample Data

USGS Historical Topographic Maps work great:
- [USGS topoView](https://ngmdb.usgs.gov/topoview/)
- Download GeoTIFF or high-res JPG
- Hawaiian islands recommended (dramatic terrain!)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload map file |
| `/api/extract-bounds` | POST | Use Gemini to read map coordinates |
| `/api/generate-heightmap` | POST | Generate heightmap with Gemini |
| `/api/gemini-key` | GET | Get API key for voice chat |
| `/api/health` | GET | Health check |

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
- AI: [Google Gemini](https://ai.google.dev/)

## License

MIT

---

*Built for the Gemini API Developer Competition 2025* 🚀
