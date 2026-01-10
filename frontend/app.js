/**
 * Contour - 3D Terrain Viewer
 * Main application logic
 */

// ===========================================
// STATE
// ===========================================
const state = {
    scene: null,
    camera: null,
    renderer: null,
    terrain: null,
    sun: null,

    // Data
    fileId: null,
    bounds: null,
    textureB64: null,
    heightmapB64: null,

    // Textures
    colorTexture: null,
    heightmapTexture: null,

    // Camera
    cameraMode: 'orbit',
    orbitAngle: 0,
    orbitRadius: 120,
    orbitPhi: Math.PI / 4,
    isDragging: false,
    lastMouse: { x: 0, y: 0 },
    keys: {}
};

// ===========================================
// INITIALIZATION
// ===========================================
function init() {
    const container = document.getElementById('container');

    // Scene
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x0a1628);

    // Camera
    state.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    );
    updateOrbitCamera();

    // Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enable shadow mapping
    state.renderer.shadowMap.enabled = true;
    state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(state.renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    state.scene.add(ambient);

    state.sun = new THREE.DirectionalLight(0xffffff, 1.0);
    // Match original position: (-100, 150, 100)
    state.sun.position.set(-100, 150, 100);

    // Explicitly set target to terrain center
    state.sun.target.position.set(0, 0, 0);
    state.scene.add(state.sun.target);

    // Configure shadow casting
    state.sun.castShadow = true;
    state.sun.shadow.mapSize.width = 2048;
    state.sun.shadow.mapSize.height = 2048;

    // Shadow camera frustum (orthographic bounds)
    state.sun.shadow.camera.left = -75;
    state.sun.shadow.camera.right = 75;
    state.sun.shadow.camera.top = 75;
    state.sun.shadow.camera.bottom = -75;
    state.sun.shadow.camera.near = 1;
    state.sun.shadow.camera.far = 400;
    state.sun.shadow.camera.updateProjectionMatrix();

    // Shadow quality tuning - try zero bias first
    state.sun.shadow.bias = 0;

    state.scene.add(state.sun);

    // Water plane
    const waterGeo = new THREE.PlaneGeometry(400, 400);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x1a4a6e,
        transparent: true,
        opacity: 0.9,
        roughness: 0.2
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1;
    water.receiveShadow = true;
    state.scene.add(water);

    // Setup UI
    setupUI();
    updateStepNumbers();

    // Start render loop
    animate();

    setStatus('Ready. Upload a map to begin.');
}

// ===========================================
// UI SETUP
// ===========================================
function setupUI() {
    // File upload
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) uploadFile(file);
    });

    // Bounds inputs
    ['north', 'south', 'east', 'west'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            if (!state.bounds) state.bounds = {};
            state.bounds[id] = parseFloat(e.target.value);
        });
    });

    // Extract bounds button
    document.getElementById('extract-bounds-btn').addEventListener('click', extractBoundsWithGemini);

    // Terrain buttons
    document.getElementById('fetch-dem-btn').addEventListener('click', fetchDEM);
    document.getElementById('gemini-heightmap-btn').addEventListener('click', generateHeightmapWithGemini);
    document.getElementById('stylize-btn').addEventListener('click', stylizeTexture);

    // View controls
    const exagSlider = document.getElementById('exag');
    exagSlider.addEventListener('input', () => {
        document.getElementById('exag-val').textContent = exagSlider.value + '×';
        if (state.terrain && state.heightmapTexture) {
            createTerrain(); // Rebuild terrain with new exaggeration
        }
    });

    const rotSlider = document.getElementById('rotation');
    rotSlider.addEventListener('input', () => {
        document.getElementById('rotation-val').textContent = rotSlider.value + '%';
    });

    // Lighting controls
    const azimuthSlider = document.getElementById('sun-azimuth');
    const elevationSlider = document.getElementById('sun-elevation');

    function updateSunPosition() {
        const azimuthDeg = parseFloat(azimuthSlider.value);
        const elevationDeg = parseFloat(elevationSlider.value);

        // Update value displays
        document.getElementById('sun-azimuth-val').textContent = azimuthDeg + '°';
        document.getElementById('sun-elevation-val').textContent = elevationDeg + '°';

        // Convert to radians
        const azimuthRad = azimuthDeg * Math.PI / 180;
        const elevationRad = elevationDeg * Math.PI / 180;

        // Calculate x,y,z position (distance matches original sun position)
        const distance = 206;
        const x = distance * Math.cos(elevationRad) * Math.cos(azimuthRad);
        const y = distance * Math.sin(elevationRad);
        const z = distance * Math.cos(elevationRad) * Math.sin(azimuthRad);

        // Update sun position
        if (state.sun) {
            state.sun.position.set(x, y, z);
        }
    }

    azimuthSlider.addEventListener('input', updateSunPosition);
    elevationSlider.addEventListener('input', updateSunPosition);

    document.getElementById('reset-sun-btn').addEventListener('click', () => {
        azimuthSlider.value = 135;
        elevationSlider.value = 47;
        updateSunPosition();
    });

    document.getElementById('fly-btn').addEventListener('click', toggleFlyMode);

    // Mouse controls
    setupMouseControls();

    // Keyboard controls
    document.addEventListener('keydown', (e) => state.keys[e.code] = true);
    document.addEventListener('keyup', (e) => state.keys[e.code] = false);

    // Resize
    window.addEventListener('resize', () => {
        state.camera.aspect = window.innerWidth / window.innerHeight;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function updateStepNumbers() {
    const sections = document.querySelectorAll('#controls section');
    let stepNumber = 1;

    sections.forEach(section => {
        const heading = section.querySelector('h3[data-step-label]');
        if (!heading) return;

        if (!section.classList.contains('hidden')) {
            const label = heading.dataset.stepLabel;
            heading.textContent = `${stepNumber}. ${label.toUpperCase()}`;
            stepNumber++;
        }
    });
}

function setupMouseControls() {
    const canvas = state.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
        if (state.cameraMode === 'orbit') {
            state.isDragging = true;
            state.lastMouse = { x: e.clientX, y: e.clientY };
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (state.cameraMode === 'orbit' && state.isDragging) {
            const dx = e.clientX - state.lastMouse.x;
            const dy = e.clientY - state.lastMouse.y;
            state.orbitAngle += dx * 0.01;
            state.orbitPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, state.orbitPhi + dy * 0.01));
            state.lastMouse = { x: e.clientX, y: e.clientY };
            updateOrbitCamera();
        } else if (state.cameraMode === 'fly' && document.pointerLockElement === canvas) {
            state.camera.rotation.y -= e.movementX * 0.002;
            state.camera.rotation.x = Math.max(
                -Math.PI / 2,
                Math.min(Math.PI / 2, state.camera.rotation.x - e.movementY * 0.002)
            );
        }
    });

    canvas.addEventListener('mouseup', () => state.isDragging = false);
    canvas.addEventListener('mouseleave', () => state.isDragging = false);

    canvas.addEventListener('wheel', (e) => {
        if (state.cameraMode === 'orbit') {
            state.orbitRadius = Math.max(20, Math.min(300, state.orbitRadius + e.deltaY * 0.1));
            updateOrbitCamera();
        }
    });
}

// ===========================================
// FILE UPLOAD
// ===========================================
async function uploadFile(file) {
    showLoading('Uploading...');
    setStatus('Uploading...', 'loading');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Upload failed');
        }

        const data = await response.json();

        // Store data
        state.fileId = data.file_id;
        state.textureB64 = data.texture_b64;

        // Update UI
        document.getElementById('file-info').classList.remove('hidden');
        document.getElementById('file-name').textContent = file.name;

        if (data.has_bounds) {
            state.bounds = data.bounds;
            document.getElementById('file-bounds').textContent = 'Georeferenced';
            document.getElementById('bounds-section').classList.add('hidden');

            // Update bounds inputs
            document.getElementById('north').value = data.bounds.north.toFixed(4);
            document.getElementById('south').value = data.bounds.south.toFixed(4);
            document.getElementById('east').value = data.bounds.east.toFixed(4);
            document.getElementById('west').value = data.bounds.west.toFixed(4);
        } else {
            document.getElementById('file-bounds').textContent = 'No bounds';
            document.getElementById('bounds-section').classList.remove('hidden');
        }

        // Load texture
        loadTexture(data.texture_b64);

        // Show terrain section
        document.getElementById('terrain-section').classList.remove('hidden');
        updateStepNumbers();

        hideLoading();
        setStatus(`Loaded: ${data.width}×${data.height}px`, 'success');

    } catch (err) {
        hideLoading();
        setStatus('Error: ' + err.message, 'error');
        console.error(err);
    }
}

// ===========================================
// TEXTURE & TERRAIN
// ===========================================
function loadTexture(base64) {
    const loader = new THREE.TextureLoader();
    state.colorTexture = loader.load('data:image/jpeg;base64,' + base64, () => {
        // Create initial flat terrain
        createTerrain();
        document.getElementById('view-section').classList.remove('hidden');
        document.getElementById('lighting-section').classList.remove('hidden');
        updateStepNumbers();
    });
}

function createTerrain() {
    // Remove existing terrain
    if (state.terrain) {
        state.scene.remove(state.terrain);
        state.terrain.geometry.dispose();
        state.terrain.material.dispose();
    }

    const size = 100;
    const segments = 256;
    const exag = parseFloat(document.getElementById('exag').value);

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

    // Apply heightmap to actual geometry vertices (not displacement map)
    if (state.heightmapTexture) {
        applyHeightmapToGeometry(geometry, state.heightmapTexture, exag);
    }

    const material = new THREE.MeshStandardMaterial({
        map: state.colorTexture,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide
    });

    state.terrain = new THREE.Mesh(geometry, material);
    state.terrain.rotation.x = -Math.PI / 2;
    state.terrain.castShadow = true;
    state.terrain.receiveShadow = true;
    state.scene.add(state.terrain);
}

function applyHeightmapToGeometry(geometry, heightmapTexture, scale) {
    const img = heightmapTexture.image;
    if (!img) return;

    // Create canvas to read pixel data
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, img.width, img.height);

    const positions = geometry.attributes.position;
    const width = Math.sqrt(positions.count);

    for (let i = 0; i < positions.count; i++) {
        const x = i % width;
        const y = Math.floor(i / width);

        // Sample heightmap
        const u = x / (width - 1);
        const v = y / (width - 1);
        const px = Math.floor(u * (img.width - 1));
        const py = Math.floor(v * (img.height - 1));
        const idx = (py * img.width + px) * 4;

        // Get grayscale value (0-255)
        const height = imgData.data[idx] / 255;

        // Apply to Z coordinate (plane is in XY, Z is up before rotation)
        positions.setZ(i, height * scale);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals(); // Recalculate normals for proper lighting
}

// ===========================================
// DEM FETCHING
// ===========================================
async function fetchDEM() {
    if (!state.bounds) {
        setStatus('Set bounds first', 'error');
        return;
    }

    const { north, south, east, west } = state.bounds;
    const zoom = 11;

    showLoading('Fetching elevation tiles...');
    setStatus('Fetching DEM...', 'loading');

    try {
        // Convert bounds to tile coords
        const minTile = latLonToTile(north, west, zoom);
        const maxTile = latLonToTile(south, east, zoom);

        const xMin = Math.min(minTile.x, maxTile.x);
        const xMax = Math.max(minTile.x, maxTile.x);
        const yMin = Math.min(minTile.y, maxTile.y);
        const yMax = Math.max(minTile.y, maxTile.y);

        const tileSize = 256;
        const width = (xMax - xMin + 1) * tileSize;
        const height = (yMax - yMin + 1) * tileSize;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fetch tiles
        const tilePromises = [];
        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${x}/${y}.png`;
                tilePromises.push(
                    loadImage(url)
                        .then(img => ({ img, x: (x - xMin) * tileSize, y: (y - yMin) * tileSize }))
                        .catch(() => null)
                );
            }
        }

        const tiles = await Promise.all(tilePromises);

        // Draw tiles
        let loaded = 0;
        for (const tile of tiles) {
            if (tile?.img) {
                ctx.drawImage(tile.img, tile.x, tile.y);
                loaded++;
            }
        }

        if (loaded === 0) {
            throw new Error('No tiles loaded - try Gemini heightmap instead');
        }

        // Convert to elevation
        const imageData = ctx.getImageData(0, 0, width, height);
        const elevation = new Float32Array(width * height);

        for (let i = 0; i < width * height; i++) {
            const r = imageData.data[i * 4];
            const g = imageData.data[i * 4 + 1];
            const b = imageData.data[i * 4 + 2];
            elevation[i] = (r * 256 + g + b / 256) - 32768;
        }

        // Find range
        let eMin = Infinity, eMax = -Infinity;
        for (const e of elevation) {
            if (e > 0) {
                eMin = Math.min(eMin, e);
                eMax = Math.max(eMax, e);
            }
        }

        // Create heightmap
        const hmCanvas = document.createElement('canvas');
        hmCanvas.width = width;
        hmCanvas.height = height;
        const hmCtx = hmCanvas.getContext('2d');
        const hmData = hmCtx.createImageData(width, height);

        for (let i = 0; i < width * height; i++) {
            let val = 0;
            if (elevation[i] > 0 && eMax > eMin) {
                val = ((elevation[i] - eMin) / (eMax - eMin)) * 255;
            }
            hmData.data[i * 4] = val;
            hmData.data[i * 4 + 1] = val;
            hmData.data[i * 4 + 2] = val;
            hmData.data[i * 4 + 3] = 255;
        }
        hmCtx.putImageData(hmData, 0, 0);

        // Crop to bounds
        const tileBoundsNW = tileToLatLon(xMin, yMin, zoom);
        const tileBoundsSE = tileToLatLon(xMax + 1, yMax + 1, zoom);

        const cropX = ((west - tileBoundsNW.lon) / (tileBoundsSE.lon - tileBoundsNW.lon)) * width;
        const cropY = ((tileBoundsNW.lat - north) / (tileBoundsNW.lat - tileBoundsSE.lat)) * height;
        const cropW = ((east - west) / (tileBoundsSE.lon - tileBoundsNW.lon)) * width;
        const cropH = ((north - south) / (tileBoundsNW.lat - tileBoundsSE.lat)) * height;

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = 512;
        finalCanvas.height = 512;
        finalCanvas.getContext('2d').drawImage(
            hmCanvas, cropX, cropY, cropW, cropH, 0, 0, 512, 512
        );

        // Create texture
        state.heightmapTexture = new THREE.CanvasTexture(finalCanvas);
        createTerrain();

        hideLoading();
        setStatus(`DEM loaded: ${eMin.toFixed(0)}m - ${eMax.toFixed(0)}m`, 'success');

    } catch (err) {
        hideLoading();
        setStatus('DEM Error: ' + err.message, 'error');
        console.error(err);
    }
}

function latLonToTile(lat, lon, z) {
    const x = Math.floor((lon + 180) / 360 * Math.pow(2, z));
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, z));
    return { x, y };
}

function tileToLatLon(x, y, z) {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return {
        lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
        lon: x / Math.pow(2, z) * 360 - 180
    };
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// ===========================================
// GEMINI INTEGRATION
// ===========================================
async function extractBoundsWithGemini() {
    if (!state.fileId) {
        setStatus('Upload a file first', 'error');
        return;
    }

    showLoading('Extracting bounds with Gemini...');
    setStatus('Analyzing map...', 'loading');

    try {
        const response = await fetch(`/api/extract-bounds?file_id=${state.fileId}`, {
            method: 'POST'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to extract bounds');
        }

        const data = await response.json();
        state.bounds = data.bounds;

        // Update UI
        document.getElementById('north').value = data.bounds.north.toFixed(4);
        document.getElementById('south').value = data.bounds.south.toFixed(4);
        document.getElementById('east').value = data.bounds.east.toFixed(4);
        document.getElementById('west').value = data.bounds.west.toFixed(4);

        hideLoading();
        setStatus('Bounds extracted', 'success');

    } catch (err) {
        hideLoading();
        setStatus('Gemini error: ' + err.message, 'error');
        console.error(err);
    }
}

async function generateHeightmapWithGemini() {
    if (!state.fileId) {
        setStatus('Upload a file first', 'error');
        return;
    }

    showLoading('Generating heightmap with Gemini...');
    setStatus('Generating heightmap...', 'loading');

    try {
        const response = await fetch(`/api/generate-heightmap?file_id=${state.fileId}`, {
            method: 'POST'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to generate heightmap');
        }

        const data = await response.json();

        // Load heightmap texture
        const loader = new THREE.TextureLoader();
        state.heightmapTexture = loader.load(
            'data:image/png;base64,' + data.heightmap_b64,
            () => {
                createTerrain();
                hideLoading();
                setStatus('Heightmap generated', 'success');
            }
        );

    } catch (err) {
        hideLoading();
        setStatus('Gemini error: ' + err.message, 'error');
        console.error(err);
    }
}

async function stylizeTexture() {
    if (!state.fileId) {
        setStatus('Upload a file first', 'error');
        return;
    }

    const btn = document.getElementById('stylize-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '🎨 Stylizing...';

    showLoading('Stylizing texture (30-60s)...');
    setStatus('Sending to FAL API...', 'loading');

    try {
        const response = await fetch(`/api/stylize?file_id=${state.fileId}`, {
            method: 'POST'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Stylization failed');
        }

        const data = await response.json();

        // Load stylized texture from FAL CDN
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');

        state.colorTexture = loader.load(
            data.stylized_url,
            () => {
                createTerrain();
                hideLoading();
                btn.disabled = false;
                btn.textContent = originalText;
                setStatus('Texture stylized successfully', 'success');
            },
            undefined,
            (error) => {
                throw new Error('Failed to load stylized texture: ' + error.message);
            }
        );

    } catch (err) {
        hideLoading();
        btn.disabled = false;
        btn.textContent = originalText;
        setStatus('Stylization error: ' + err.message, 'error');
        console.error(err);
    }
}

// ===========================================
// CAMERA CONTROLS
// ===========================================
function updateOrbitCamera() {
    state.camera.position.x = state.orbitRadius * Math.sin(state.orbitPhi) * Math.cos(state.orbitAngle);
    state.camera.position.y = state.orbitRadius * Math.cos(state.orbitPhi);
    state.camera.position.z = state.orbitRadius * Math.sin(state.orbitPhi) * Math.sin(state.orbitAngle);
    state.camera.lookAt(0, 0, 0);
}

function toggleFlyMode() {
    const canvas = state.renderer.domElement;
    state.cameraMode = state.cameraMode === 'orbit' ? 'fly' : 'orbit';

    document.getElementById('fly-btn').textContent =
        state.cameraMode === 'orbit' ? 'Enter Fly Mode' : 'Exit Fly Mode';

    if (state.cameraMode === 'fly') {
        state.camera.rotation.order = 'YXZ';
        canvas.requestPointerLock();
    }
}

// ===========================================
// ANIMATION
// ===========================================
let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    // Auto-rotate in orbit mode
    if (state.cameraMode === 'orbit' && !state.isDragging) {
        const speed = parseFloat(document.getElementById('rotation').value) / 100;
        state.orbitAngle += 0.003 * speed;
        updateOrbitCamera();
    }

    // Fly mode movement
    if (state.cameraMode === 'fly') {
        const speed = state.keys['ShiftLeft'] ? 80 : 25;
        const dir = new THREE.Vector3();

        if (state.keys['KeyW']) dir.z -= 1;
        if (state.keys['KeyS']) dir.z += 1;
        if (state.keys['KeyA']) dir.x -= 1;
        if (state.keys['KeyD']) dir.x += 1;
        if (state.keys['Space']) dir.y += 1;
        if (state.keys['KeyC']) dir.y -= 1;

        dir.normalize().applyQuaternion(state.camera.quaternion);
        state.camera.position.addScaledVector(dir, speed * delta);
    }

    state.renderer.render(state.scene, state.camera);
}

// ===========================================
// UTILITIES
// ===========================================
function setStatus(msg, type = '') {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.className = type;
}

function showLoading(text) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// ===========================================
// START
// ===========================================
init();
