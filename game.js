class Coordinate {
    constructor(q, r) {
        this.q = parseInt(q, 10);
        this.r = parseInt(r, 10);
    }

    equals(otherCoordinate){
        return this.q === otherCoordinate.q && this.r === otherCoordinate.r;
    }

    add(otherCoordinate){
        const newQ = this.q + otherCoordinate.q;
        const newR = this.r + otherCoordinate.r;
        return new Coordinate(newQ, newR);
    }
    
    subtract(otherCoordinate){
        const newQ = this.q - otherCoordinate.q;
        const newR = this.r - otherCoordinate.r;
        return new Coordinate(newQ, newR);
    }

    toString() {
        return `(q=${this.q}, r=${this.r})`
    }
}

class Game {
    constructor() {
        this.boardLayout = [5, 6, 7, 8, 9, 8, 7, 6, 5];
        this.initialMarbles = {
            '0,0': 'black', '0,1': 'black', '0,2': 'black', '0,3': 'black', '0,4': 'black',
            '1,0': 'black', '1,1': 'black', '1,2': 'black', '1,3': 'black', '1,4': 'black', '1,5': 'black',
            '2,2': 'black', '2,3': 'black', '2,4': 'black',
            '8,0': 'white', '8,1': 'white', '8,2': 'white', '8,3': 'white', '8,4': 'white',
            '7,0': 'white', '7,1': 'white', '7,2': 'white', '7,3': 'white', '7,4': 'white', '7,5': 'white',
            '6,2': 'white', '6,3': 'white', '6,4': 'white',
        };
        this.currentTurn = 'white';
        this.whiteScore = 0;
        this.blackScore = 0;
        this.selectedCoords = [];
        this.board = new Map();
        this.winner = null;
        this.message = null;
    }

    // Convert 2D coordinate to axial coordinates
    toAxial(row, col) {
        const r = 4 - row;
        let q;
        if (row <= 4){
            q = -(4 -col)
        } else {
            q = -(4 - (row - 4) - col);
        }
        return new Coordinate(q, r);
    }

    setupBoard() {
        for (let i = 0; i < this.boardLayout.length; i++) {
            for (let j = 0; j < this.boardLayout[i]; j++) {
                const axialCoord = this.toAxial(i, j);
                const marbleColor = this.initialMarbles[`${i},${j}`];
                if (marbleColor) {
                    this.board.set(axialCoord.toString(), marbleColor);
                } else {
                    this.board.set(axialCoord.toString(), null);
                }
            }
        }
        this.generateGutterMap();
    }

    generateGutterMap() {
        this.gutterMap = new Map(); // Maps "off-board coordinate string" -> {q, r, rotation}
        const tempSlots = [];

        // Iterate over all board cells to find "exit" neighbors
        for (const [coordStr, _] of this.board) {
            const parts = coordStr.match(/q=(-?\d+), r=(-?\d+)/);
            if (!parts) continue;
            const q = parseInt(parts[1], 10);
            const r = parseInt(parts[2], 10);
            const coord = new Coordinate(q, r);

            const neighbors = this.getNeighbors(coord);
            neighbors.forEach(n => {
                if (!this.board.has(n.toString())) {
                    // Check if we already found this slot
                    if (!tempSlots.some(s => s.coord.equals(n))) {
                         // Calculate angle for sorting (0 to 2PI)
                        // Hex to Pixel conversion (approximate for angle)
                        // x = q + r/2
                        // y = r
                        const x = n.q + n.r/2;
                        const y = n.r * (Math.sqrt(3)/2); // Aspect ratio correction not strictly needed for sorting but good for accuracy
                        let angle = Math.atan2(y, x);
                        
                        tempSlots.push({
                            coord: n,
                            angle: angle
                        });
                    }
                }
            });
        }

        // Sort by angle to create a ring
        tempSlots.sort((a, b) => a.angle - b.angle);

        this.orderedGutterSlots = tempSlots.map(s => s.coord);
        
        // Re-populate Map with index info
        this.orderedGutterSlots.forEach((coord, index) => {
            this.gutterMap.set(coord.toString(), {
                coord: coord,
                index: index
            });
        });
    }

    clearSelection() {
        this.selectedCoords = [];
    }

    _isValidNewSelection(coord) {
        if (this.selectedCoords.length === 0) {
            return true;
        }
    
        const isAdjacent = this.selectedCoords.some(selectedCoord =>
            this.getNeighbors(selectedCoord).some(neighbor => neighbor.equals(coord))
        );
        if (!isAdjacent) {
            return false;
        }
        // Check if the new selection maintains a straight line
        if (this.selectedCoords.length === 2) {
            const availableCoords = this.computeNextCoordinates();
            return availableCoords.some(c => c.equals(coord));
        }
        return true;
    }

    toggleMarbleSelection(coord) {
        const marbleColor = this.board.get(coord.toString());
        if (marbleColor !== this.currentTurn) {
            this.clearSelection();
            return;
        }
    
        const selectedIndex = this.selectedCoords.findIndex(c => c.equals(coord));
    
        if (selectedIndex > -1) {
            // Prevent deselecting the middle marble of a 3-marble selection
            if (this.selectedCoords.length === 3 && selectedIndex === 1) return;
            this.selectedCoords.splice(selectedIndex, 1);
        } else {
            if (this.selectedCoords.length >= 3) {
                this.message = "Cannot select more than 3 marbles. You greedy!";
                return;
            }
            if (this._isValidNewSelection(coord)) {
                this.selectedCoords.push(coord);
                // Sort selected coordinates by top-down, left-right for consistency
                this.selectedCoords.sort((a, b) => b.r - a.r || a.q - b.q);
            }
        }
    }

    getNeighbors(middleCoord) {
        const neighbors = [];
        const qValue = middleCoord.q;
        const rValue = middleCoord.r;
        
        neighbors.push(new Coordinate(qValue - 1, rValue));
        neighbors.push(new Coordinate(qValue + 1, rValue));
        neighbors.push(new Coordinate(qValue, rValue - 1));
        neighbors.push(new Coordinate(qValue, rValue + 1));
        neighbors.push(new Coordinate(qValue - 1, rValue + 1));
        neighbors.push(new Coordinate(qValue + 1, rValue - 1));

        return neighbors;
    }

    computeVector(toCoordinate){
        const coords = this.selectedCoords;
        // Check if toCoordinate is adjacent to either end of the selected marbles
        if (this.getNeighbors(coords[0]).some(neighbor => neighbor.equals(toCoordinate))) {
            return toCoordinate.subtract(coords[0]);
        }
        if (this.getNeighbors(coords[coords.length - 1]).some(neighbor => neighbor.equals(toCoordinate))) {
            return toCoordinate.subtract(coords[coords.length - 1]);
        }
        return null;
    }

    computeNextCoordinates(){
        const coords = this.selectedCoords;
        const currentDirection = coords[1].subtract(coords[0]);

        return [
            coords[0].subtract(currentDirection),
            coords[coords.length - 1].add(currentDirection)
        ];
    }

    _isBroadsideMoveValid(direction) {
        for (const coord of this.selectedCoords) {
            const toCoordinate = coord.add(direction);
            // Check if the target cell is within the board and empty
            if (this.board.has(toCoordinate.toString()) && this.board.get(toCoordinate.toString()) !== null) {
                return false;
            }
        }
        return true;
    }
    
    _isInlineMoveValid(direction) {
        const coords = this.selectedCoords;
        let frontMarbleCoordination = coords[0];
        let maxDot = -Infinity;
    
        // Determine the front marble by projecting onto the direction vector
        coords.forEach(coord => {
            const dot = coord.q * direction.q + coord.r * direction.r;
            // Select the marble with the maximum dot product
            if (dot > maxDot) {
                maxDot = dot;
                frontMarbleCoordination = coord;
            }
        });
        
        let nextCoordinate = frontMarbleCoordination.add(direction);
        let defenders = [];
        
        while (true) {
            if (!this.board.has(nextCoordinate.toString())) {
                // Pushed off the board
                return true;
            }
    
            const marbleColor = this.board.get(nextCoordinate.toString());
            if (marbleColor === null) {
                // Empty cell
                return true;
            }
    
            if (marbleColor === this.currentTurn) {
                // Blocked by own marble
                return false;
            }
    
            defenders.push(marbleColor);
    
            if (defenders.length >= coords.length || defenders.length >= 3) {
                // Cannot push if defenders are equal or more, or 3
                return false;
            }
            nextCoordinate = nextCoordinate.add(direction);
        }
    }

    isMoveValid(direction, moveType){
        if (moveType === 'broadside') {
            return this._isBroadsideMoveValid(direction);
        }
        
        if (moveType === 'in-Line') {
            return this._isInlineMoveValid(direction);
        }
        return false;
    }

    computeValidMoveDirections() {
        const directions = [];
        if (this.selectedCoords.length === 0) return directions;

        const directionVectors = [
            new Coordinate(1, 0), new Coordinate(-1, 0),
            new Coordinate(0, 1), new Coordinate(0, -1),
            new Coordinate(-1, 1), new Coordinate(1, -1)
        ];
        
        if (this.selectedCoords.length === 1) {
            const fromCoordinate = this.selectedCoords[0];
            const neighbors = this.getNeighbors(fromCoordinate);
            
            neighbors.forEach(neighbor => {
                // Check if the target cell is within the board and empty
                if (!this.board.has(neighbor.toString()) || this.board.get(neighbor.toString()) === null) {
                    directions.push(neighbor.subtract(fromCoordinate));
                }
            });
        } else {
            const coords = this.selectedCoords;
            const currentDirection = coords[1].subtract(coords[0]);
            const oppositeDirection = new Coordinate(-currentDirection.q, -currentDirection.r);

            if (this.isMoveValid(currentDirection, 'in-Line')) directions.push(currentDirection);
            if (this.isMoveValid(oppositeDirection, 'in-Line')) directions.push(oppositeDirection);

            directionVectors.forEach(direction => {
                if (!direction.equals(currentDirection) && !direction.equals(oppositeDirection)) {
                    if (this.isMoveValid(direction, 'broadside')) directions.push(direction);
                }
            });    
        }
        return directions;
    }

    calculateSingleMarbleMove(toCoordinate) {
        const fromCoordinate = this.selectedCoords[0];
        const neighbors = this.getNeighbors(fromCoordinate);
        if (neighbors.some(n => n.equals(toCoordinate))) {
            return [{ from: fromCoordinate, to: toCoordinate, color: this.board.get(fromCoordinate.toString()) }];
        }
        return [];
    }

    calculateInLineMove(toCoordinate) {
        const attackers = this.selectedCoords;
        const directionVector = this.computeVector(toCoordinate);
        if (!directionVector) return [];

        let nextCoordinate = toCoordinate;
        const defenders = [];
        while (this.board.has(nextCoordinate.toString()) && this.board.get(nextCoordinate.toString()) !== null) {
            const marbleColor = this.board.get(nextCoordinate.toString());
            if (marbleColor === this.currentTurn) return []; // Blocked
            defenders.push({ coord: nextCoordinate, color: marbleColor });
            nextCoordinate = nextCoordinate.add(directionVector);
        }

        if (attackers.length > defenders.length) {
            const moves = [];
            defenders.forEach(defender => {
                moves.push({ from: defender.coord, to: defender.coord.add(directionVector), color: defender.color });
            });
            this.selectedCoords.forEach(coord => {
                moves.push({ from: coord, to: coord.add(directionVector), color: this.board.get(coord.toString()) });
            });
            return moves;
        }
        return [];
    }

    calculateBroadsideMove(direction) {
        if (!this.isMoveValid(direction, 'broadside')) return [];

        const moves = [];
        this.selectedCoords.forEach(coord => {
            moves.push({ from: coord, to: coord.add(direction), color: this.board.get(coord.toString()) });
        });
        return moves;
    }

    applyMoves(moves) {
        const newBoard = new Map(this.board);
        moves.forEach(move => newBoard.set(move.from.toString(), null));

        moves.forEach(move => {
            if (this.board.has(move.to.toString())) {
                newBoard.set(move.to.toString(), move.color);
            } else {
                this.updateScore(move.color === 'white' ? 'black' : 'white');
            }
        });
        this.board = newBoard;
        this.switchTurn();
    }

    switchTurn() {
        this.currentTurn = (this.currentTurn === 'white') ? 'black' : 'white';
    }

    updateScore(player) {
        if (player === 'white') {
            this.whiteScore++;
        }
        else {
            this.blackScore++;
        }
        if (this.whiteScore >= 6) {
            this.winner = 'White';
        }
        if (this.blackScore >= 6) {
            this.winner = 'Black';
        }
    }

    playAgain() {
        this.currentTurn = 'white';
        this.whiteScore = 0;
        this.blackScore = 0;
        this.selectedCoords = [];
        this.board = new Map();
        this.winner = null;
        this.message = null;
        this.setupBoard();
    }
}

class GameUI {
    constructor(game, gameBoard, currentTurnSpan, whiteScoreSpan, blackScoreSpan, gameOverScreen, winnerMessage, playAgainBtn, messageBox) {
        this.game = game;
        this.gameBoard = gameBoard;
        this.currentTurnSpan = currentTurnSpan;
        this.whiteScoreSpan = whiteScoreSpan;
        this.blackScoreSpan = blackScoreSpan;
        this.gameOverScreen = gameOverScreen;
        this.winnerMessage = winnerMessage;
        this.playAgainBtn = playAgainBtn;
        this.messageBox = messageBox;
        this.isAnimating = false;
        
        // Physics State
        this.deadMarbles = []; // { angle, velocity, color, element, isDragging }
        this.gutterRadiusX = 290; // Tighter fit
        this.gutterRadiusY = 250; 
        this.dragState = null; // { marbleIndex, startAngle, lastAngle, lastTime }

        // Setup Layers
        this.gameBoard.innerHTML = ''; // Clear anything existing
        this.boardLayer = document.createElement('div');
        this.boardLayer.id = 'board-layer';
        // Position relative so it takes up space in the parent
        this.boardLayer.style.position = 'relative'; 
        this.boardLayer.style.width = '100%';
        this.boardLayer.style.height = '100%';
        this.boardLayer.style.pointerEvents = 'none'; // Allow clicks to pass through if empty
        
        // Restore Hex Layout
        this.boardLayer.style.display = 'flex';
        this.boardLayer.style.flexDirection = 'column';
        this.boardLayer.style.alignItems = 'center';
        this.boardLayer.style.justifyContent = 'center';
        
        this.gutterLayer = document.createElement('div');
        this.gutterLayer.id = 'gutter-layer';
        this.gutterLayer.style.position = 'absolute';
        this.gutterLayer.style.top = '0';
        this.gutterLayer.style.left = '0';
        this.gutterLayer.style.width = '100%';
        this.gutterLayer.style.height = '100%';
        this.gutterLayer.style.pointerEvents = 'none'; // Marbles will be auto

        this.gameBoard.appendChild(this.boardLayer);
        this.gameBoard.appendChild(this.gutterLayer);

        const handleInteraction = (e) => {
            if (this.isAnimating) return;
            
            let target;
            if (e.type === 'touchstart') {
                // e.preventDefault(); // Don't prevent default globally, let specific handlers decide
                const touch = e.touches[0];
                target = document.elementFromPoint(touch.clientX, touch.clientY);
            } else {
                target = e.target;
            }
            
            if (!target) return;

            if (target.classList.contains('marble') && target.closest('#board-layer')) {
                this.handleMarbleClick(target);
            } else if (target.classList.contains('cell')) {
                this.handleCellClick(target);
            }
        };

        // Attach board interactions to the board layer (or keep on gameBoard but filter)
        // Since layers cover everything, we can keep using gameBoard but check target
        this.gameBoard.addEventListener('click', handleInteraction);
        this.gameBoard.addEventListener('touchstart', (e) => {
             // Only prevent default if interacting with board elements to prevent scrolling?
             // For now, loose.
             handleInteraction(e);
        });

        this.startPhysicsLoop();
    }

    startPhysicsLoop() {
        const loop = () => {
            this.updatePhysics();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    getGutterPoint(angle) {
        // Calculate radius for a Pointy-Top Hexagon at this angle
        // Pointy-top has vertices at 30, 90, 150... (PI/6, PI/2...)
        // Flat sides at 0, 60, 120...
        // So at angle 0, r is minimum (apothem). At angle 30, r is maximum (radius).
        
        // Normalize angle to positive 0..2PI
        let theta = angle;
        
        // Apply 30 degree rotation (PI/6) as requested
        theta += Math.PI / 6;
        
        while (theta < 0) theta += 2 * Math.PI;
        while (theta >= 2 * Math.PI) theta -= 2 * Math.PI;

        // Find which 60-degree sector we are in
        // We want to center the calculation around the flat side (0 degrees)
        // The segment goes from -30 to +30 relative to the flat side.
        // Sector index:
        const sector = Math.floor((theta + Math.PI/6) / (Math.PI/3));
        const sectorCenter = sector * (Math.PI/3);
        const diff = theta - sectorCenter; // Range -PI/6 to +PI/6

        // Distance to edge for a unit hexagon (flat-to-flat width 2)
        // r = 1 / cos(diff)
        // This gives r=1 at diff=0 (flat), and r=1.15 at diff=30 (vertex)
        const rScale = 1 / Math.cos(diff);

        // Scale by our gutter radii
        // gutterRadiusX/Y are effectively the "apothem" (distance to flat side)
        return {
            x: this.gutterRadiusX * rScale * Math.cos(angle),
            y: this.gutterRadiusY * rScale * Math.sin(angle)
        };
    }

    updatePhysics() {
        // 1. Apply Physics (Velocity, Friction)
        // 2. Handle Collisions (Simple separation)
        // 3. Update DOM Positions
        
        const friction = 0.95;
        const collisionRadius = 0.15; // Radians buffer between marbles (~size of marble)

        // Update velocities and angles
        this.deadMarbles.forEach(dm => {
            if (!dm.isDragging) {
                dm.angle += dm.velocity;
                dm.velocity *= friction;
                if (Math.abs(dm.velocity) < 0.001) dm.velocity = 0;
            }
        });

        // Simple Collision Detection (Bubble Sort style or pairwise)
        // Sort by angle temporarily to check neighbors? 
        // Since angle wraps -PI to PI, it's a circle.
        // We won't re-order the array constantly, just check constraints.
        // For robust beads-on-wire, we iterate and push apart.
        
        // Naive Push:
        // Check every pair? N^2 is fine for < 30 marbles.
        for (let i = 0; i < this.deadMarbles.length; i++) {
            for (let j = i + 1; j < this.deadMarbles.length; j++) {
                let m1 = this.deadMarbles[i];
                let m2 = this.deadMarbles[j];
                
                let diff = m2.angle - m1.angle;
                // Normalize diff to -PI to PI
                while (diff <= -Math.PI) diff += 2*Math.PI;
                while (diff > Math.PI) diff -= 2*Math.PI;
                
                if (Math.abs(diff) < collisionRadius) {
                    // Collision! Push apart.
                    const push = (collisionRadius - Math.abs(diff)) / 2;
                    if (diff > 0) {
                        if (!m1.isDragging) m1.angle -= push * 0.1; // Soft push
                        if (!m2.isDragging) m2.angle += push * 0.1;
                        // Transfer velocity/bounce?
                        // Simple elastic collision simulation
                        let temp = m1.velocity;
                        m1.velocity = m2.velocity;
                        m2.velocity = temp;
                    } else {
                        if (!m1.isDragging) m1.angle += push * 0.1;
                        if (!m2.isDragging) m2.angle -= push * 0.1;
                        let temp = m1.velocity;
                        m1.velocity = m2.velocity;
                        m2.velocity = temp;
                    }
                }
            }
        }
        
        // Normalize angles 0 to 2PI for cleanliness
        this.deadMarbles.forEach(dm => {
             // Keep in -PI to PI range for atan2 compatibility
             while (dm.angle <= -Math.PI) dm.angle += 2*Math.PI;
             while (dm.angle > Math.PI) dm.angle -= 2*Math.PI;
        });

        // Render positions
        const centerPos = this.getCenterCellPos();
        if (centerPos) {
            this.deadMarbles.forEach(dm => {
                if (dm.element) {
                    // Hexagonal Track
                    const pos = this.getGutterPoint(dm.angle);
                    
                    const cx = centerPos.left + 30;
                    const cy = centerPos.top + 35;

                    dm.element.style.left = `${cx + pos.x - 22.5}px`; // -22.5 to center the 45px marble
                    dm.element.style.top = `${cy + pos.y - 22.5}px`;
                }
            });
        }
    }

    reset() {
        this.deadMarbles = [];
    }

    handleMarbleClick(marble) {
        const q = marble.parentElement.dataset.q;
        const r = marble.parentElement.dataset.r;
        const coord = new Coordinate(q, r);
        this.game.toggleMarbleSelection(coord);
        this.render();
    }

    handleCellClick(cell) {
        if (this.game.selectedCoords.length === 0) return;
        
        const cellCoordinate = new Coordinate(cell.dataset.q, cell.dataset.r);
        let moves = [];

        if (this.game.selectedCoords.length === 1) {
            if (this.game.board.get(cellCoordinate.toString()) === null) {
                moves = this.game.calculateSingleMarbleMove(cellCoordinate);
            }
        } else {
            const availableMarblesCoordinate = this.game.computeNextCoordinates();
            if (availableMarblesCoordinate.some(coordinate => coordinate.equals(cellCoordinate))) {
                moves = this.game.calculateInLineMove(cellCoordinate);
            }
        }
        
        if (moves.length > 0) {
            this.game.clearSelection();
            this.animateMove(moves);
        } else {
            this.clearSelection();
            this.render();
        }
    }

    clearSelection() {
        this.game.clearSelection();
        this.render();
    }

    // Helper to find the visual center of the board (q=0, r=0)
    getCenterCellPos() {
        const centerCell = this.gameBoard.querySelector(`[data-q='0'][data-r='0']`);
        if (!centerCell) return null;
        
        const rect = centerCell.getBoundingClientRect();
        const boardRect = this.gameBoard.getBoundingClientRect();
        
        return {
            left: rect.left - boardRect.left,
            top: rect.top - boardRect.top
        };
    }

    animateMove(moves) {
        this.isAnimating = true;
        this.clearMoveArrows();
        this.gameBoard.classList.add('animating');

        let transitionsCompleted = 0;
        const totalTransitions = moves.length;

        const onTransitionEnd = () => {
            transitionsCompleted++;
            if (transitionsCompleted === totalTransitions) {
                this.game.applyMoves(moves);
                this.isAnimating = false;
                this.gameBoard.classList.remove('animating');
                this.render();
            }
        };

        const centerPos = this.getCenterCellPos();

        moves.forEach(move => {
            const fromCell = this.gameBoard.querySelector(`[data-q='${move.from.q}'][data-r='${move.from.r}']`);
            const marble = fromCell.querySelector('.marble');

            if (!marble) {
                onTransitionEnd();
                return;
            }

            const toCell = this.gameBoard.querySelector(`[data-q='${move.to.q}'][data-r='${move.to.r}']`);

            const fromRect = fromCell.getBoundingClientRect();
            
            marble.style.zIndex = '100';

            const transitionEndHandler = (event) => {
                if (event.target !== marble) return;
                marble.removeEventListener('transitionend', transitionEndHandler);
                
                if (!toCell) {
                    // Create physics marble in gutter layer
                    const exitCoord = move.to;
                    const exitX = (exitCoord.q * 60) + (exitCoord.r * 30);
                    const exitY = -(exitCoord.r * 52); // Inverted Y
                    const angle = Math.atan2(exitY, exitX);

                    const deadMarbleEl = document.createElement('div');
                    deadMarbleEl.classList.add('marble', move.color, 'pushed-off');
                    deadMarbleEl.style.position = 'absolute';
                    deadMarbleEl.style.cursor = 'grab';
                    deadMarbleEl.style.pointerEvents = 'auto'; // Enable clicks
                    
                    // Initial position (will be overwritten by physics loop instantly)
                    // But we want it to transition smoothly? 
                    // The CSS transition on the original marble ends here.
                    // We replace the original marble with this new one.
                    
                    this.gutterLayer.appendChild(deadMarbleEl);
                    
                    const newDeadMarble = {
                        angle: angle,
                        velocity: 0, // Could calculate impact velocity if we want
                        color: move.color,
                        element: deadMarbleEl,
                        isDragging: false
                    };

                    // Add drag listeners to the new element
                    this.setupGutterDrag(deadMarbleEl, newDeadMarble);

                    this.deadMarbles.push(newDeadMarble);
                    
                    // Remove the original animating marble (it was inside the cell)
                    marble.remove(); 
                } else {
                    marble.style.opacity = 0; 
                }

                onTransitionEnd();
            };
            marble.addEventListener('transitionend', transitionEndHandler);

            if (toCell) {
                const toRect = toCell.getBoundingClientRect();
                const dx = toRect.left - fromRect.left;
                const dy = toRect.top - fromRect.top;
                marble.style.transform = `translate(${dx}px, ${dy}px)`;
            } else {
                if (centerPos) {
                    // Animate towards the gutter ring radius (Hexagonal)
                    const exitX = (move.to.q * 60) + (move.to.r * 30);
                    const exitY = -(move.to.r * 52); 
                    const angle = Math.atan2(exitY, exitX);
                    
                    const targetPos = this.getGutterPoint(angle);
                    const targetX = targetPos.x;
                    const targetY = targetPos.y;
                    
                    // Convert to absolute page coords for the transform calculation
                    // centerPos is offset of board (0,0) cell from gameBoard top-left
                    // But wait, render loop uses centerPos + 30...
                    // We need to be consistent.
                    // Let's just use the same relative math as previous steps for now to ensure it clears the board.
                    // 1.5x push logic was working fine for the visual push.
                    // We can just stick to the 1.5x push logic for the transition, 
                    // and then snap to the exact ellipse radius when physics takes over.
                    
                     const absoluteTargetLeft = centerPos.left + targetX;
                     // Note: Y is inverted logic for math, but CSS 'top' is positive down.
                     // If targetY is -200 (Top), we add it to centerPos.top.
                     const absoluteTargetTop = centerPos.top + targetY;
                    
                    const currentLeft = fromRect.left - this.gameBoard.getBoundingClientRect().left;
                    const currentTop = fromRect.top - this.gameBoard.getBoundingClientRect().top;
                    
                    const dx = absoluteTargetLeft - currentLeft;
                    const dy = absoluteTargetTop - currentTop;
                    
                    marble.style.transform = `translate(${dx}px, ${dy}px)`;
                    marble.classList.add('pushed-off');
                }
            }
        });
    }

    setupGutterDrag(marble, marbleObj) {
        const startDrag = (e) => {
            e.stopPropagation();
            e.preventDefault();
            marbleObj.isDragging = true;
            marbleObj.velocity = 0;
            
            this.dragState = {
                marble: marbleObj,
                lastAngle: marbleObj.angle,
                lastTime: Date.now()
            };

            const moveHandler = (moveEvent) => {
                this.handleGutterDrag(moveEvent);
            };
            
            const upHandler = () => {
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
                document.removeEventListener('touchmove', moveHandler);
                document.removeEventListener('touchend', upHandler);
                
                if (this.dragState && this.dragState.marble) {
                    this.dragState.marble.isDragging = false;
                }
                this.dragState = null;
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
            document.addEventListener('touchmove', moveHandler, { passive: false });
            document.addEventListener('touchend', upHandler);
        };

        marble.addEventListener('mousedown', startDrag);
        marble.addEventListener('touchstart', startDrag);
    }

    handleGutterDrag(e) {
        if (!this.dragState || !this.dragState.marble) return;

        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const boardRect = this.gameBoard.getBoundingClientRect();
        const centerX = boardRect.left + boardRect.width / 2;
        const centerY = boardRect.top + boardRect.height / 2;

        const dx = clientX - centerX;
        const dy = clientY - centerY;
        
        let angle = Math.atan2(dy, dx); 
        
        // Update Angle
        const marble = this.dragState.marble;
        
        // Handle wrap-around for velocity calc
        let diff = angle - this.dragState.lastAngle;
        if (diff > Math.PI) diff -= 2 * Math.PI;
        if (diff < -Math.PI) diff += 2 * Math.PI;

        marble.angle = angle;
        
        // Calculate Velocity (Throw)
        const now = Date.now();
        const dt = now - this.dragState.lastTime;
        if (dt > 0) {
            // Simple exponential moving average for smooth velocity
            const instVelocity = diff * (16 / dt); // Normalize to ~60fps
            // marble.velocity = instVelocity; // Too jittery?
            marble.velocity = instVelocity * 0.5 + marble.velocity * 0.5; 
        }
        
        this.dragState.lastAngle = angle;
        this.dragState.lastTime = now;
    }

    render() {
        this.boardLayer.innerHTML = '';
        
        for (let i = 0; i < this.game.boardLayout.length; i++) {
            const row = document.createElement('div');
            row.classList.add('row');
            // Important: Cells need pointer-events auto to be clickable through the overlay
            row.style.pointerEvents = 'none'; 

            for (let j = 0; j < this.game.boardLayout[i]; j++) {
                const axialCoord = this.game.toAxial(i, j);
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.style.pointerEvents = 'auto'; // Make cells clickable
                cell.dataset.q = axialCoord.q;
                cell.dataset.r = axialCoord.r;

                const coordText = document.createElement('span');
                coordText.classList.add('coord-text');
                coordText.textContent = `${axialCoord.q},${axialCoord.r}`;
                cell.appendChild(coordText);

                const marbleColor = this.game.board.get(axialCoord.toString());
                if (marbleColor) {
                    const marble = document.createElement('div');
                    marble.classList.add('marble', marbleColor);
                    cell.appendChild(marble);

                    if (this.game.selectedCoords.some(c => c.equals(axialCoord))) {
                        marble.classList.add('selected');
                    }
                }
                row.appendChild(cell);
            }
            this.boardLayer.appendChild(row);
        }

        // Dead Marbles are now handled by Physics Loop (DOM elements persist in gutterLayer)

        this.currentTurnSpan.textContent = this.game.currentTurn === 'white' ? 'White' : 'Black';
        this.whiteScoreSpan.textContent = this.game.whiteScore;
        this.blackScoreSpan.textContent = this.game.blackScore;

        this.clearMoveArrows();
        if (!this.isAnimating) {
            const validMoves = this.game.computeValidMoveDirections();
            this.drawMoveArrows(validMoves);
        }

        if (this.game.winner) {
            this.winnerMessage.textContent = `${this.game.winner} Wins!`;
            this.gameOverScreen.style.display = 'block';
        } else {
            this.gameOverScreen.style.display = 'none';
        }

        if (this.game.message) {
            this.messageBox.textContent = this.game.message;
            this.messageBox.style.display = 'block';
            setTimeout(() => {
                this.messageBox.style.display = 'none';
                this.game.message = null;
            }, 3000);
        }
    }

    clearMoveArrows() {
        const existingArrows = this.gameBoard.querySelectorAll('.move-arrow');
        existingArrows.forEach(arrow => arrow.remove());
    }

    drawMoveArrows(directions) {
        if (this.game.selectedCoords.length === 0) return;

        const drawArrow = (coord, dir) => {
            const cell = this.gameBoard.querySelector(`[data-q='${coord.q}'][data-r='${coord.r}']`);
            if (!cell) return;

            const cellRect = cell.getBoundingClientRect();
            const boardRect = this.gameBoard.getBoundingClientRect();
            const top = cellRect.top - boardRect.top + (cellRect.height / 2);
            const left = cellRect.left - boardRect.left + (cellRect.width / 2);

            const arrow = document.createElement('div');
            arrow.classList.add('move-arrow');

            let angle = 0;
            if (dir.q === 1 && dir.r === 0) angle = -90;
            else if (dir.q === -1 && dir.r === 0) angle = 90;
            else if (dir.q === 0 && dir.r === 1) angle = -150;
            else if (dir.q === 0 && dir.r === -1) angle = 30;
            else if (dir.q === 1 && dir.r === -1) angle = -30;
            else if (dir.q === -1 && dir.r === 1) angle = 150;

            const distance = 40;
            const rad = (angle + 90) * Math.PI / 180;
            const tx = Math.cos(rad) * distance;
            const ty = Math.sin(rad) * distance;

            arrow.style.position = 'absolute';
            arrow.style.top = `${top - 15 + ty}px`;
            arrow.style.left = `${left - 15 + tx}px`;
            arrow.style.transform = `rotate(${angle + 180}deg)`;

            const handleArrowClick = (e) => {
                e.stopPropagation();
                if (this.isAnimating) return;

                const lineVector = this.game.selectedCoords.length > 1 ? this.game.selectedCoords[1].subtract(this.game.selectedCoords[0]) : null;
                const oppositeLineVector = lineVector ? new Coordinate(-lineVector.q, -lineVector.r) : null;
                const isInline = lineVector && (dir.equals(lineVector) || dir.equals(oppositeLineVector));
                
                let moves = [];
                if (isInline) {
                    const toCoordinate = (dir.equals(lineVector) ? this.game.selectedCoords[this.game.selectedCoords.length - 1] : this.game.selectedCoords[0]).add(dir);
                    moves = this.game.calculateInLineMove(toCoordinate);
                } else {
                    if (this.game.selectedCoords.length === 1) {
                        const toCoordinate = this.game.selectedCoords[0].add(dir);
                        moves = this.game.calculateSingleMarbleMove(toCoordinate);
                    } else {
                        moves = this.game.calculateBroadsideMove(dir);
                    }
                }
                
                if(moves.length > 0){
                    this.game.clearSelection();
                    this.animateMove(moves);
                }
            };
            
            arrow.addEventListener('click', handleArrowClick);
            arrow.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleArrowClick(e);
            });

            this.gameBoard.appendChild(arrow);
        };

        if (this.game.selectedCoords.length === 1) {
            directions.forEach(dir => drawArrow(this.game.selectedCoords[0], dir));
        } else {
            const lineVector = this.game.selectedCoords[1].subtract(this.game.selectedCoords[0]);
            const oppositeLineVector = new Coordinate(-lineVector.q, -lineVector.r);

            directions.forEach(dir => {
                if (dir.equals(lineVector)) {
                    drawArrow(this.game.selectedCoords[this.game.selectedCoords.length - 1], dir);
                } else if (dir.equals(oppositeLineVector)) {
                    drawArrow(this.game.selectedCoords[0], dir);
                } else {
                    this.game.selectedCoords.forEach(coord => {
                        drawArrow(coord, dir);
                    });
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.setupBoard();

    const gameBoard = document.getElementById('game-board');
    const currentTurnSpan = document.getElementById('current-turn');
    const whiteScoreSpan = document.getElementById('white-score');
    const blackScoreSpan = document.getElementById('black-score');
    const gameOverScreen = document.getElementById('game-over');
    const winnerMessage = document.getElementById('winner-message');
    const playAgainBtn = document.getElementById('play-again-btn');
    const messageBox = document.getElementById('message-box');

    const gameUI = new GameUI(game, gameBoard, currentTurnSpan, whiteScoreSpan, blackScoreSpan, gameOverScreen, winnerMessage, playAgainBtn, messageBox);
    gameUI.render();

    playAgainBtn.addEventListener('click', () => {
        game.playAgain();
        gameUI.reset();
        gameUI.render();
    });
});