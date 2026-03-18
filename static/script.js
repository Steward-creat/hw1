document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        gridSize: 5,
        start: [0, 0],
        goal: [4, 4],
        obstacles: [],
        maxObstacles: 3, // dynamically n-2
        currentMode: 'start', // 'start', 'goal', 'obstacle'
        policyData: null,
        valuesData: null
    };

    // --- DOM Elements ---
    const valueGridContainer = document.getElementById('value-grid-container');
    const policyGridContainer = document.getElementById('policy-grid-container');
    const valueYAxis = document.getElementById('value-y-axis');
    const valueXAxis = document.getElementById('value-x-axis');
    const policyYAxis = document.getElementById('policy-y-axis');
    const policyXAxis = document.getElementById('policy-x-axis');

    const gridSizeInput = document.getElementById('grid-size');
    const resetBtn = document.getElementById('btn-reset');
    const runBtn = document.getElementById('btn-run');
    const obstacleCounter = document.getElementById('obstacle-counter');
    const loadingOverlay = document.getElementById('loading-overlay');

    const convergenceMsg = document.getElementById('convergence-msg');
    const iterationCount = document.getElementById('iteration-count');

    // Mode Radio Buttons
    const modeRadios = document.querySelectorAll('input[name="placement-mode"]');

    // --- Initialization ---
    function init() {
        createGrid();
        updateObstacleCounter();
        setupEventListeners();
    }

    // --- Core Functions ---
    function createGrid() {
        // Clear existing grid
        valueGridContainer.innerHTML = '';
        policyGridContainer.innerHTML = '';
        valueYAxis.innerHTML = '';
        valueXAxis.innerHTML = '';
        policyYAxis.innerHTML = '';
        policyXAxis.innerHTML = '';

        // Setup Grid CSS templates
        const gridTemplate = `repeat(${state.gridSize}, minmax(0, 1fr))`;
        valueGridContainer.style.gridTemplateColumns = gridTemplate;
        valueGridContainer.style.gridTemplateRows = gridTemplate;
        policyGridContainer.style.gridTemplateColumns = gridTemplate;
        policyGridContainer.style.gridTemplateRows = gridTemplate;

        // Base cell size roughly based on screen constraints
        const cellSize = 60; // px
        valueGridContainer.style.width = `${state.gridSize * cellSize}px`;
        valueGridContainer.style.height = `${state.gridSize * cellSize}px`;
        policyGridContainer.style.width = `${state.gridSize * cellSize}px`;
        policyGridContainer.style.height = `${state.gridSize * cellSize}px`;

        // Generate Y axes cells (from top to bottom, highest to 0)
        for (let r = state.gridSize - 1; r >= 0; r--) {
            const vyLabel = document.createElement('div');
            vyLabel.textContent = r;
            const pyLabel = document.createElement('div');
            pyLabel.textContent = r;

            valueYAxis.appendChild(vyLabel);
            policyYAxis.appendChild(pyLabel);
        }

        // Generate X axes cells (from left to right, 0 to highest)
        for (let c = 0; c < state.gridSize; c++) {
            const vxLabel = document.createElement('div');
            vxLabel.textContent = c;
            vxLabel.className = 'text-center flex-1';
            const pxLabel = document.createElement('div');
            pxLabel.textContent = c;
            pxLabel.className = 'text-center flex-1';

            valueXAxis.appendChild(vxLabel);
            policyXAxis.appendChild(pxLabel);
        }

        // Generate Grid Cells.
        // Visually we want the bottom-left to be (0,0), so we iterate r from size-1 down to 0.
        for (let r = state.gridSize - 1; r >= 0; r--) {
            for (let c = 0; c < state.gridSize; c++) {

                // --- Value Cell ---
                const vCell = document.createElement('div');
                vCell.className = 'grid-cell value-cell cell-pop';
                vCell.dataset.r = r;
                vCell.dataset.c = c;
                vCell.id = `vcell-${r}-${c}`;

                const valueSpan = document.createElement('span');
                valueSpan.className = 'cell-value';
                valueSpan.id = `val-${r}-${c}`;
                vCell.appendChild(valueSpan);

                // --- Policy Cell ---
                const pCell = document.createElement('div');
                pCell.className = 'grid-cell policy-cell cell-pop';
                pCell.dataset.r = r;
                pCell.dataset.c = c;
                pCell.id = `pcell-${r}-${c}`;

                const arrowSpan = document.createElement('span');
                arrowSpan.className = 'cell-arrow';
                arrowSpan.id = `arr-${r}-${c}`;
                pCell.appendChild(arrowSpan);

                // Add event listeners for interaction to both
                [vCell, pCell].forEach(cell => {
                    cell.addEventListener('mousedown', () => handleCellClick(r, c));
                    cell.addEventListener('mouseenter', (e) => handleCellHover(e, r, c));
                });

                valueGridContainer.appendChild(vCell);
                policyGridContainer.appendChild(pCell);
            }
        }

        // Re-apply states
        renderStates();
    }

    function renderStates() {
        // Clear all states
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('cell-start', 'cell-goal', 'cell-obstacle', 'cell-path');
        });

        // Apply Start
        const vStartCell = document.getElementById(`vcell-${state.start[0]}-${state.start[1]}`);
        const pStartCell = document.getElementById(`pcell-${state.start[0]}-${state.start[1]}`);
        if (vStartCell) vStartCell.classList.add('cell-start');
        if (pStartCell) pStartCell.classList.add('cell-start');

        // Apply Goal
        const vGoalCell = document.getElementById(`vcell-${state.goal[0]}-${state.goal[1]}`);
        const pGoalCell = document.getElementById(`pcell-${state.goal[0]}-${state.goal[1]}`);
        if (vGoalCell) vGoalCell.classList.add('cell-goal');
        if (pGoalCell) pGoalCell.classList.add('cell-goal');

        // Apply Obstacles
        state.obstacles.forEach(obs => {
            const vObsCell = document.getElementById(`vcell-${obs[0]}-${obs[1]}`);
            const pObsCell = document.getElementById(`pcell-${obs[0]}-${obs[1]}`);
            if (vObsCell) vObsCell.classList.add('cell-obstacle');
            if (pObsCell) pObsCell.classList.add('cell-obstacle');
        });

        // Apply Values and Policy if they exist
        if (state.valuesData && state.policyData) {
            for (let r = 0; r < state.gridSize; r++) {
                for (let c = 0; c < state.gridSize; c++) {
                    const valSpan = document.getElementById(`val-${r}-${c}`);
                    const arrSpan = document.getElementById(`arr-${r}-${c}`);

                    const policy = state.policyData[`${r},{c}`] || state.policyData[`${r},${c}`];
                    let value = state.valuesData[r][c];

                    if (valSpan) {
                        // Don't show numeric values heavily on obstacles
                        if (state.obstacles.find(o => o[0] === r && o[1] === c)) {
                            valSpan.textContent = '';
                        } else {
                            valSpan.textContent = value.toFixed(2);
                        }
                    }

                    // Set Arrows based on policy
                    if (arrSpan && policy) {
                        // If it's the goal or obstacle, don't show arrow
                        if ((r === state.goal[0] && c === state.goal[1]) ||
                            state.obstacles.find(o => o[0] === r && o[1] === c)) {
                            arrSpan.textContent = '';
                        } else {
                            // Mapping backend logic to visual arrows.
                            // In backend, (0,0) is top-left.
                            // U: r-1 (visually up)
                            // D: r+1 (visually down)
                            // L: c-1 (visually left)
                            // R: c+1 (visually right)
                            // BUT wait! Notice how the visual grid generated in createGrid():
                            // 'for (let r = state.gridSize - 1; r >= 0; r--)'
                            // This means visually, row=0 is placed at the BOTTOM and row=size-1 is at the TOP.
                            // This flips the Y-axis interpretation visually relative to the array indices.
                            // Therefore:
                            // If python says 'U' (go to r-1), it's moving towards a SMALLER row index.
                            // On our UI grid, smaller row indices are at the BOTTOM. So 'U' actually means visually 'Down' on the UI grid!
                            // And 'D' (go to r+1) is moving to a larger row index, which is visually UP on the UI grid.
                            const arrows = { 'U': '↓', 'D': '↑', 'L': '←', 'R': '→' };
                            arrSpan.textContent = arrows[policy] || '';
                        }
                    } else if (arrSpan) {
                        arrSpan.textContent = '';
                    }
                }
            }

            // Draw Optimal Path
            let pathSet = new Set();
            let cr = state.start[0];
            let cc = state.start[1];
            let count = 0;
            let maxSteps = state.gridSize * state.gridSize;

            while (count < maxSteps) {
                if (cr === state.goal[0] && cc === state.goal[1]) {
                    pathSet.add(`${cr},${cc}`);
                    break;
                }

                if (state.obstacles.find(o => o[0] === cr && o[1] === cc)) {
                    break;
                }

                pathSet.add(`${cr},${cc}`);

                let action = state.policyData[`${cr},${cc}`];
                if (!action) break;

                // Standard Python array traversal matches exact coordinates
                if (action === 'U') cr -= 1;
                else if (action === 'D') cr += 1;
                else if (action === 'L') cc -= 1;
                else if (action === 'R') cc += 1;

                if (cr < 0 || cr >= state.gridSize || cc < 0 || cc >= state.gridSize) break;
                if (pathSet.has(`${cr},${cc}`)) break;

                count++;
            }

            pathSet.forEach(pos => {
                let parts = pos.split(',');
                let pr = parseInt(parts[0]);
                let pc = parseInt(parts[1]);
                let vpCell = document.getElementById(`vcell-${pr}-${pc}`);
                let ppCell = document.getElementById(`pcell-${pr}-${pc}`);
                if (vpCell) vpCell.classList.add('cell-path');
                if (ppCell) ppCell.classList.add('cell-path');
            });

        } else {
            // Clear texts
            for (let r = 0; r < state.gridSize; r++) {
                for (let c = 0; c < state.gridSize; c++) {
                    const valSpan = document.getElementById(`val-${r}-${c}`);
                    const arrSpan = document.getElementById(`arr-${r}-${c}`);
                    if (valSpan) valSpan.textContent = '';
                    if (arrSpan) arrSpan.textContent = '';
                }
            }
        }
    }

    function updateObstacleCounter() {
        state.maxObstacles = state.gridSize - 2;
        obstacleCounter.textContent = `(${state.obstacles.length}/${state.maxObstacles})`;

        // Visual feedback if maxed out
        if (state.obstacles.length >= state.maxObstacles) {
            obstacleCounter.classList.add('text-red-500');
            obstacleCounter.classList.remove('text-gray-500');
        } else {
            obstacleCounter.classList.remove('text-red-500');
            obstacleCounter.classList.add('text-gray-500');
        }
    }

    // --- Interaction Handlers ---

    // Support drag drawing for obstacles
    let isDrawing = false;
    document.addEventListener('mousedown', () => isDrawing = true);
    document.addEventListener('mouseup', () => isDrawing = false);

    function handleCellHover(e, r, c) {
        if (isDrawing && state.currentMode === 'obstacle') {
            handleCellClick(r, c);
        }
    }

    function handleCellClick(r, c) {
        // Prevent action if trying to act out of bounds (shouldn't happen but defensive)
        if (r < 0 || c < 0 || r >= state.gridSize || c >= state.gridSize) return;

        // Clear existing evaluation data when user modifies grid
        clearEvaluationData();

        const isStart = state.start[0] === r && state.start[1] === c;
        const isGoal = state.goal[0] === r && state.goal[1] === c;
        const obsIndex = state.obstacles.findIndex(obs => obs[0] === r && obs[1] === c);
        const isObstacle = obsIndex !== -1;

        if (state.currentMode === 'start') {
            if (!isGoal && !isObstacle) state.start = [r, c];
        } else if (state.currentMode === 'goal') {
            if (!isStart && !isObstacle) state.goal = [r, c];
        } else if (state.currentMode === 'obstacle') {
            if (isStart || isGoal) return; // Cannot override start/goal

            if (isObstacle) {
                // Toggle off
                state.obstacles.splice(obsIndex, 1);
            } else {
                // Toggle on if under limit
                if (state.obstacles.length < state.maxObstacles) {
                    state.obstacles.push([r, c]);
                }
            }
            updateObstacleCounter();
        }

        // Add small pop animation to clicked cell
        const vCell = document.getElementById(`vcell-${r}-${c}`);
        const pCell = document.getElementById(`pcell-${r}-${c}`);
        if (vCell) {
            vCell.classList.remove('cell-pop');
            void vCell.offsetWidth; // trigger reflow
            vCell.classList.add('cell-pop');
        }
        if (pCell) {
            pCell.classList.remove('cell-pop');
            void pCell.offsetWidth; // trigger reflow
            pCell.classList.add('cell-pop');
        }

        renderStates();
    }

    function clearEvaluationData() {
        state.policyData = null;
        state.valuesData = null;

        convergenceMsg.classList.remove('opacity-100');
        convergenceMsg.classList.add('opacity-0');
        iterationCount.textContent = 'Iteration: 0';

        renderStates();
    }

    function handleGridSizeChange(e) {
        const newSize = parseInt(e.target.value);
        if (newSize >= 5 && newSize <= 9) {
            state.gridSize = newSize;
            // Reset Constraints
            state.start = [0, 0];
            state.goal = [newSize - 1, newSize - 1];
            state.obstacles = [];

            clearEvaluationData();
            createGrid();
            updateObstacleCounter();
        }
    }

    function handleReset() {
        state.start = [0, 0];
        state.goal = [state.gridSize - 1, state.gridSize - 1];
        state.obstacles = [];

        clearEvaluationData();
        renderStates();
        updateObstacleCounter();
    }

    function runValueIteration(size, start, goal, obstacles) {
        const gamma = 0.9;
        const reward = -1;
        const theta = 0.001;
        const actionSpace = ['U', 'R', 'D', 'L'];
        const actionDeltas = {
            'U': [-1, 0],
            'D': [1, 0],
            'L': [0, -1],
            'R': [0, 1]
        };
        
        // Initialize V
        let V = Array(size).fill().map(() => Array(size).fill(0));
        let iterations = 0;
        
        const isTerminal = (r, c) => r === goal[0] && c === goal[1];
        const isObstacle = (r, c) => obstacles.some(o => o[0] === r && o[1] === c);
        const outOfBounds = (r, c) => r < 0 || c < 0 || r >= size || c >= size;
        
        const getNextState = (r, c, action) => {
            let dr = actionDeltas[action][0];
            let dc = actionDeltas[action][1];
            let nr = r + dr;
            let nc = c + dc;
            if (outOfBounds(nr, nc) || isObstacle(nr, nc)) {
                return [r, c];
            }
            return [nr, nc];
        };
        
        while (true) {
            let delta = 0;
            let newV = Array(size).fill().map(() => Array(size).fill(0));
            
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (isTerminal(r, c) || isObstacle(r, c)) continue;
                    
                    let v = V[r][c];
                    let maxVal = -Infinity;
                    
                    for (let action of actionSpace) {
                        let next = getNextState(r, c, action);
                        let val = reward + gamma * V[next[0]][next[1]];
                        if (val > maxVal) maxVal = val;
                    }
                    
                    newV[r][c] = maxVal;
                    delta = Math.max(delta, Math.abs(v - maxVal));
                }
            }
            V = newV;
            iterations++;
            if (delta < theta) break;
        }
        
        let policy = {};
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (isTerminal(r, c) || isObstacle(r, c)) {
                    policy[`${r},${c}`] = null;
                    continue;
                }
                let maxVal = -Infinity;
                let bestAction = null;
                for (let action of actionSpace) {
                    let next = getNextState(r, c, action);
                    let val = reward + gamma * V[next[0]][next[1]];
                    if (val > maxVal) {
                        maxVal = val;
                        bestAction = action;
                    }
                }
                policy[`${r},${c}`] = bestAction;
            }
        }
        
        return {
            policy: policy,
            values: V,
            iterations: iterations
        };
    }

    async function handleRunPolicy() {
        // Show loading state
        loadingOverlay.classList.remove('hidden');

        try {
            // Artificial delay so the user still sees the "loading" animation
            await new Promise(r => setTimeout(r, 200));

            // Run value iteration purely in the browser!
            const data = runValueIteration(state.gridSize, state.start, state.goal, state.obstacles);

            // Store results
            state.policyData = data.policy;
            state.valuesData = data.values;

            // Update UI
            convergenceMsg.textContent = 'Converged';
            convergenceMsg.className = 'text-sm font-medium bg-green-500 text-white px-3 py-1 rounded-full opacity-100 transition-opacity';
            iterationCount.textContent = `Iteration: ${data.iterations}`;

            renderStates();

        } catch (error) {
            console.error("Error running policy:", error);
            alert("Error running policy evaluation. Check console.");
        } finally {
            // Hide loading state
            loadingOverlay.classList.add('hidden');
        }
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        gridSizeInput.addEventListener('change', handleGridSizeChange);

        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.currentMode = e.target.value;
            });
        });

        resetBtn.addEventListener('click', handleReset);
        runBtn.addEventListener('click', handleRunPolicy);
    }

    // --- Boot ---
    init();
});
