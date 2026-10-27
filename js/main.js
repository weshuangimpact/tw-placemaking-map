import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

let scene, camera, renderer, labelRenderer, controls;
let islandsData = [];
const islandMeshes = [];

init();

async function init() {
    // 1. 初始化場景與相機
    scene = new THREE.Scene();
    scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    scene.fog = new THREE.FogExp2(scene.background, 0.02);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 30, 40);

    // 2. 渲染器 (WebGL 與 HTML 標籤)
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none'; // 讓滑鼠可以穿透到 3D 控制
    document.getElementById('canvas-container').appendChild(labelRenderer.domElement);

    // 3. 控制器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // 不可看到地底下

    // 4. 光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // 5. 載入資料並生成島嶼 (台灣立體配置)
    await loadDataAndBuildIslands();

    // 6. 事件監聽
    window.addEventListener('resize', onWindowResize);
    document.getElementById('btn-reset').addEventListener('click', () => {
        camera.position.set(0, 30, 40); controls.target.set(0,0,0);
    });
    document.getElementById('btn-close').addEventListener('click', () => {
        document.getElementById('info-panel').classList.add('hidden');
    });

    // 監聽主題改變以更換 3D 背景色
    window.addEventListener('themeChanged', (e) => {
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
        scene.background = new THREE.Color(bgColor);
        scene.fog.color = new THREE.Color(bgColor);
    });

    animate();
}

async function loadDataAndBuildIslands() {
    try {
        const response = await fetch('./data/content.json');
        islandsData = await response.json();
        
        // 依照台灣真實地理位置定義 X, Z 座標 (中心點 0,0 為創生願景島)
        const layout = {
            "創生願景島": [0, 0],
            "基隆市": [2, -12], "臺北市": [0, -10], "新北市": [-2, -10], "桃園市": [-4, -8],
            "新竹縣市": [-5, -6], "苗栗縣": [-6, -3], "臺中市": [-7, 0], "彰化縣": [-8, 3],
            "南投縣": [-3, 2], "雲林縣": [-9, 6], "嘉義縣市": [-8, 9], "臺南市": [-9, 12],
            "高雄市": [-8, 15], "屏東縣": [-6, 18], "宜蘭縣": [4, -7], "花蓮縣": [4, 1],
            "臺東縣": [3, 10], "澎湖縣": [-18, 5], "金門縣": [-22, -2], "連江縣 (馬祖)": [-15, -12]
        };

        const islandGeo = new THREE.CylinderGeometry(2, 2.5, 1, 6);
        const islandMat = new THREE.MeshLambertMaterial({ color: 0x8fbc8f }); // 綠色土地

        islandsData.forEach((island) => {
            const pos = layout[island.name] || [0, 0];
            
            // 建立 3D 島嶼
            const mesh = new THREE.Mesh(islandGeo, islandMat);
            mesh.position.set(pos[0], 0, pos[1]);
            scene.add(mesh);
            islandMeshes.push(mesh);

            // 建立 HTML 標籤
            const div = document.createElement('div');
            div.className = 'island-label';
            div.textContent = island.name;
            div.onclick = () => showIslandInfo(island, mesh); // 點擊標籤打開面板
            
            const label = new CSS2DObject(div);
            label.position.set(0, 2, 0);
            mesh.add(label);
        });
    } catch (e) { console.error("載入資料失敗", e); }
}

function showIslandInfo(island, mesh) {
    // 攝影機飛向該島
    controls.target.copy(mesh.position);
    camera.position.set(mesh.position.x, mesh.position.y + 10, mesh.position.z + 15);
    
    // 更新並打開面板
    document.getElementById('panel-title').textContent = island.name;
    document.getElementById('panel-intro').textContent = island.intro;
    document.getElementById('panel-focus').textContent = island.focus;
    document.getElementById('panel-cases').textContent = island.cases;
    document.getElementById('info-panel').classList.remove('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
}
