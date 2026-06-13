/**
 * NgeRubik - Core 3D Logic & Game Controller Engine
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof THREE === 'undefined') {
            alert("Three.js engine was not initialized. Check your HTML script tags.");
            return;
        }

        const container = document.getElementById('canvas-container');
        if (!container) return;

        // 1. Initial 3D Scene Setup
        const scene = new THREE.Scene();
        const cubeWorldGroup = new THREE.Group();
        scene.add(cubeWorldGroup);

        const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(5.0, 5.0, 7.0);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);

        // 2. Materials Configuration (No Black Cores)
        const cubies = [];
        const spacing = 1.02; 
        const porcelainWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
        
        const stickerMats = {
            R: new THREE.MeshBasicMaterial({ color: 0xef4444 }), // Red
            L: new THREE.MeshBasicMaterial({ color: 0xf97316 }), // Orange
            U: new THREE.MeshBasicMaterial({ color: 0x10b981 }), // Green
            D: new THREE.MeshBasicMaterial({ color: 0x3b82f6 }), // Blue
            F: new THREE.MeshBasicMaterial({ color: 0xf8fafc }), // White
            B: new THREE.MeshBasicMaterial({ color: 0xeab308 })  // Yellow
        };

        // 3. Generate Rubik's Cube Array Structure
        function generateCube() {
            while(cubeWorldGroup.children.length > 0){
                cubeWorldGroup.remove(cubeWorldGroup.children[0]);
            }
            cubies.length = 0;

            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    for (let z = -1; z <= 1; z++) {
                        if (x === 0 && y === 0 && z === 0) continue; // Skip core center

                        const geometry = new THREE.BoxGeometry(0.94, 0.94, 0.94);
                        const cubeMaterials = [
                            x === 1  ? stickerMats.R : porcelainWhiteMat,
                            x === -1 ? stickerMats.L : porcelainWhiteMat,
                            y === 1  ? stickerMats.U : porcelainWhiteMat,
                            y === -1 ? stickerMats.D : porcelainWhiteMat,
                            z === 1  ? stickerMats.F : porcelainWhiteMat,
                            z === -1 ? stickerMats.B : porcelainWhiteMat
                        ];

                        const cubie = new THREE.Mesh(geometry, cubeMaterials);
                        cubie.position.set(x * spacing, y * spacing, z * spacing);
                        
                        cubie.userData = { 
                            x: x, y: y, z: z,
                            initialX: x, initialY: y, initialZ: z
                        };

                        cubeWorldGroup.add(cubie);
                        cubies.push(cubie);
                    }
                }
            }
        }
        generateCube();

        // 4. Mathematical Vector Rotation Engine
        let isAnimatingLayer = false;
        let currentAnimationData = null;
        let scrambleQueue = [];

        function rotateLayerAnimated(axis, layerValue, clockwise = true, customDuration = 160) {
            if (isAnimatingLayer) return false;
            isAnimatingLayer = true;

            const movingCubies = cubies.filter(c => Math.round(c.userData[axis]) === layerValue);
            const angleTarget = clockwise ? Math.PI / 2 : -Math.PI / 2;
            
            const initialTransforms = movingCubies.map(c => ({
                cubie: c,
                position: c.position.clone(),
                quaternion: c.quaternion.clone()
            }));

            const startTime = performance.now();

            currentAnimationData = function(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / customDuration, 1);
                const ease = 0.5 * (1 - Math.cos(progress * Math.PI)); // Cosine smooth curve
                
                const currentAngle = ease * angleTarget;

                const rotMatrix = new THREE.Matrix4();
                if (axis === 'x') rotMatrix.makeRotationX(currentAngle);
                if (axis === 'y') rotMatrix.makeRotationY(currentAngle);
                if (axis === 'z') rotMatrix.makeRotationZ(currentAngle);

                initialTransforms.forEach(t => {
                    t.cubie.position.copy(t.position).applyMatrix4(rotMatrix);
                    t.cubie.quaternion.copy(t.quaternion).premultiply(new THREE.Quaternion().setFromRotationMatrix(rotMatrix));
                });

                if (progress < 1) return true;

                movingCubies.forEach(c => {
                    c.userData.x = Math.round(c.position.x / spacing);
                    c.userData.y = Math.round(c.position.y / spacing);
                    c.userData.z = Math.round(c.position.z / spacing);
                });

                currentAnimationData = null;
                isAnimatingLayer = false;

                if (scrambleQueue.length > 0) {
                    const nextMove = scrambleQueue.shift();
                    rotateLayerAnimated(nextMove.axis, nextMove.layer, nextMove.cw, nextMove.dur);
                } else {
                    checkWinCondition();
                }
                return false;
            };
            return true;
        }

        // 5. Game Win Conditions Check
        let isGameActive = false;
        function checkWinCondition() {
            if (!isGameActive || isAnimatingLayer || scrambleQueue.length > 0) return;

            const isSolved = cubies.every(c => 
                c.userData.x === c.userData.initialX &&
                c.userData.y === c.userData.initialY &&
                c.userData.z === c.userData.initialZ
            );

            if (isSolved) {
                isGameActive = false;
                clearInterval(countdownInterval);
                setTimeout(() => {
                    alert("Selamat! You solved the Rubik's Cube before time ran out! 🎉🏆");
                }, 200);
            }
        }

        // 6. Dashboard Timer Operations
        let countdownInterval;
        let timeRemaining = 120; 
        const timerDisplay = document.getElementById('timer-out');
        const minutesInput = document.getElementById('user-minutes');
        const startBtn = document.getElementById('start-btn');
        const resetBtn = document.getElementById('reset-btn');

        function updateTimerUI(seconds) {
            const displayMins = Math.floor(seconds / 60);
            const displaySecs = seconds % 60;
            timerDisplay.innerText = 
                String(displayMins).padStart(2, '0') + ":" + 
                String(displaySecs).padStart(2, '0');
        }

        minutesInput.addEventListener('input', () => {
            if (!isGameActive) {
                const mins = parseInt(minutesInput.value) || 2;
                timerDisplay.innerText = String(mins).padStart(2, '0') + ":00";
            }
        });

        startBtn.addEventListener('click', () => {
            if (isAnimatingLayer || scrambleQueue.length > 0) return;
            clearInterval(countdownInterval);
            const mins = parseInt(minutesInput.value) || 2;
            timeRemaining = mins * 60;
            isGameActive = true;
            updateTimerUI(timeRemaining);

            countdownInterval = setInterval(() => {
                timeRemaining--;
                updateTimerUI(timeRemaining);

                if (timeRemaining <= 0) {
                    isGameActive = false;
                    clearInterval(countdownInterval);
                    alert("Oops! Your time is up! ⌛ Better luck next time!");
                }
            }, 1000);
        });

        resetBtn.addEventListener('click', () => {
            clearInterval(countdownInterval);
            isGameActive = false;
            isAnimatingLayer = false;
            currentAnimationData = null;
            scrambleQueue = [];
            
            const mins = parseInt(minutesInput.value) || 2;
            timerDisplay.innerText = String(mins).padStart(2, '0') + ":00";
            
            cubeWorldGroup.rotation.set(0, 0, 0);
            generateCube(); 
        });

        // 7. Randomization Engine (Scrambler)
        const scrambleBtn = document.getElementById('scramble-btn');
        scrambleBtn.addEventListener('click', () => {
            if (isAnimatingLayer || scrambleQueue.length > 0) return;
            
            scrambleQueue = [];
            const axes = ['x', 'y', 'z'];
            const layers = [-1, 0, 1];

            for (let i = 0; i < 20; i++) {
                scrambleQueue.push({
                    axis: axes[Math.floor(Math.random() * axes.length)],
                    layer: layers[Math.floor(Math.random() * layers.length)],
                    cw: Math.random() > 0.5,
                    dur: 60 
                });
            }

            const firstMove = scrambleQueue.shift();
            rotateLayerAnimated(firstMove.axis, firstMove.layer, firstMove.cw, firstMove.dur);
            
            const checkEnd = setInterval(() => {
                if (scrambleQueue.length === 0 && !isAnimatingLayer) {
                    clearInterval(checkEnd);
                    isGameActive = true;
                }
            }, 100);
        });

        // 8. Finger-Swipe & Camera View Controllers
        let activeInputMode = null; 
        let previousPointerPosition = { x: 0, y: 0 };
        let startPointerPosition = { x: 0, y: 0 };
        
        let intersectedCubie = null;
        let selectedNormalAxis = null; 
        
        let targetRotationSpeedX = 0;
        let targetRotationSpeedY = 0;
        
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        container.addEventListener('pointerdown', (e) => {
            const rect = renderer.domElement.getBoundingClientRect();
            const clientX = e.clientX - rect.left;
            const clientY = e.clientY - rect.top;
            const touchYPercent = clientY / rect.height;

            if (touchYPercent > 0.75) {
                activeInputMode = 'camera';
                previousPointerPosition = { x: e.clientX, y: e.clientY };
                targetRotationSpeedX = 0;
                targetRotationSpeedY = 0;
            } else {
                if (isAnimatingLayer || scrambleQueue.length > 0) return; 
                activeInputMode = 'playing-intent';
                
                startPointerPosition = { x: e.clientX, y: e.clientY };
                
                mouse.x = (clientX / rect.width) * 2 - 1;
                mouse.y = -(clientY / rect.height) * 2 + 1;

                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(cubeWorldGroup.children);

                if (intersects.length > 0) {
                    intersectedCubie = intersects[0].object;
                    const normal = intersects[0].face.normal;
                    if (Math.abs(normal.x) > 0.9) selectedNormalAxis = 'x';
                    if (Math.abs(normal.y) > 0.9) selectedNormalAxis = 'y';
                    if (Math.abs(normal.z) > 0.9) selectedNormalAxis = 'z';
                } else {
                    intersectedCubie = null;
                }
            }
        });

        container.addEventListener('pointermove', (e) => {
            if (!activeInputMode) return;

            if (activeInputMode === 'camera') {
                const deltaMove = {
                    x: e.clientX - previousPointerPosition.x,
                    y: e.clientY - previousPointerPosition.y
                };
                targetRotationSpeedY = deltaMove.x * 0.015;
                targetRotationSpeedX = deltaMove.y * 0.015;
                previousPointerPosition = { x: e.clientX, y: e.clientY };
            } 
            else if (activeInputMode === 'playing-intent' && intersectedCubie) {
                const deltaSwipeX = e.clientX - startPointerPosition.x;
                const deltaSwipeY = e.clientY - startPointerPosition.y;
                const distance = Math.sqrt(deltaSwipeX * deltaSwipeX + deltaSwipeY * deltaSwipeY);

                if (distance > 22) { 
                    activeInputMode = 'playing-executed';

                    let targetAxis = 'y';
                    let isClockwise = true;

                    if (selectedNormalAxis === 'y') {
                        if (Math.abs(deltaSwipeX) > Math.abs(deltaSwipeY)) {
                            targetAxis = 'y';
                            isClockwise = deltaSwipeX > 0;
                        } else {
                            targetAxis = 'x';
                            isClockwise = deltaSwipeY > 0;
                        }
                    } 
                    else if (selectedNormalAxis === 'x') {
                        if (Math.abs(deltaSwipeX) > Math.abs(deltaSwipeY)) {
                            targetAxis = 'y';
                            isClockwise = deltaSwipeX < 0;
                        } else {
                            targetAxis = 'z';
                            isClockwise = deltaSwipeY > 0;
                        }
                    } 
                    else if (selectedNormalAxis === 'z') {
                        if (Math.abs(deltaSwipeX) > Math.abs(deltaSwipeY)) {
                            targetAxis = 'y';
                            isClockwise = deltaSwipeX > 0;
                        } else {
                            targetAxis = 'x';
                            isClockwise = deltaSwipeY < 0;
                        }
                    }

                    const layerValue = intersectedCubie.userData[targetAxis];
                    rotateLayerAnimated(targetAxis, Math.round(layerValue), isClockwise, 160);
                }
            }
        });

        window.addEventListener('pointerup', () => {
            activeInputMode = null;
            intersectedCubie = null;
        });

        // 9. Frame Render Loop Pass
        function animate(timestamp) {
            requestAnimationFrame(animate);

            if (currentAnimationData) {
                currentAnimationData(timestamp);
            }

            cubeWorldGroup.rotation.y += targetRotationSpeedY;
            cubeWorldGroup.rotation.x += targetRotationSpeedX;

            targetRotationSpeedY *= 0.92;
            targetRotationSpeedX *= 0.92;

            renderer.render(scene, camera);
        }
        animate(performance.now());

        // Handle Orientation / Window Resizing
        window.addEventListener('resize', () => {
            if(!container.clientWidth || !container.clientHeight) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });

    } catch (err) {
        console.error("Runtime Exception: ", err);
    }
});
