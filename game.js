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
        this.history = [];
    }

    
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
        this.gutterMap = new Map(); 
        const tempSlots = [];

        
        for (const [coordStr, _] of this.board) {
            const parts = coordStr.match(/q=(-?\d+), r=(-?\d+)/);
            if (!parts) continue;
            const q = parseInt(parts[1], 10);
            const r = parseInt(parts[2], 10);
            const coord = new Coordinate(q, r);

            const neighbors = this.getNeighbors(coord);
            neighbors.forEach(n => {
                if (!this.board.has(n.toString())) {
                    
                    if (!tempSlots.some(s => s.coord.equals(n))) {
                         
                        
                        
                        
                        const x = n.q + n.r/2;
                        const y = n.r * (Math.sqrt(3)/2); 
                        let angle = Math.atan2(y, x);
                        
                        tempSlots.push({
                            coord: n,
                            angle: angle
                        });
                    }
                }
            });
        }

        
        tempSlots.sort((a, b) => a.angle - b.angle);

        this.orderedGutterSlots = tempSlots.map(s => s.coord);
        
        
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
            
            if (this.selectedCoords.length === 3 && selectedIndex === 1) return;
            this.selectedCoords.splice(selectedIndex, 1);
        } else {
            if (this.selectedCoords.length >= 3) {
                this.message = "Cannot select more than 3 marbles. You greedy!";
                return;
            }
            if (this._isValidNewSelection(coord)) {
                this.selectedCoords.push(coord);
                
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
    
        
        coords.forEach(coord => {
            const dot = coord.q * direction.q + coord.r * direction.r;
            
            if (dot > maxDot) {
                maxDot = dot;
                frontMarbleCoordination = coord;
            }
        });
        
        let nextCoordinate = frontMarbleCoordination.add(direction);
        let defenders = [];
        
        while (true) {
            if (!this.board.has(nextCoordinate.toString())) {
                
                return true;
            }
    
            const marbleColor = this.board.get(nextCoordinate.toString());
            if (marbleColor === null) {
                
                return true;
            }
    
            if (marbleColor === this.currentTurn) {
                
                return false;
            }
    
            defenders.push(marbleColor);
    
            if (defenders.length >= coords.length || defenders.length >= 3) {
                
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
            if (marbleColor === this.currentTurn) return []; 
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
        // Save state for Undo
        this.history.push({
            board: new Map(this.board),
            whiteScore: this.whiteScore,
            blackScore: this.blackScore,
            currentTurn: this.currentTurn
        });

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

    undo() {
        if (this.history.length === 0) return null;

        const prevState = this.history.pop();
        
        // Determine if a dead marble needs to be resurrected
        // If current score > prev score, a marble died.
        let resurrectedColor = null;
        if (this.whiteScore > prevState.whiteScore) {
            resurrectedColor = 'black';
        } else if (this.blackScore > prevState.blackScore) {
            resurrectedColor = 'white';
        }

        this.board = prevState.board;
        this.whiteScore = prevState.whiteScore;
        this.blackScore = prevState.blackScore;
        this.currentTurn = prevState.currentTurn;
        this.winner = null; 

        return { resurrectedColor };
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
        this.history = []; // Clear history
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
        
        this.gutterRadiusX = 275; 
        this.gutterRadiusY = 275; 
        this.dragState = null; 
        this.deadMarbles = []; 

        
        this.moveSound = new Audio('sound_move.wav');
        this.gutterSound = new Audio('sound_move.wav');
        this.clackSound = new Audio('sound_clack.wav');

        
        this.gameBoard.innerHTML = ''; 
        this.boardLayer = document.createElement('div');
        this.boardLayer.id = 'board-layer';
        
        this.boardLayer.style.position = 'relative'; 
        this.boardLayer.style.width = '100%';
        this.boardLayer.style.height = '100%';
        this.boardLayer.style.pointerEvents = 'none'; 
        
        
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
        this.gutterLayer.style.pointerEvents = 'none'; 

        this.gameBoard.appendChild(this.boardLayer);
        this.gameBoard.appendChild(this.gutterLayer);

        const handleInteraction = (e) => {
            if (this.isAnimating) return;
            
            let target;
            if (e.type === 'touchstart') {
                
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

        
        
        this.gameBoard.addEventListener('click', handleInteraction);
        this.gameBoard.addEventListener('touchstart', (e) => {
             
             
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
        
        
        
        
        
        
        let theta = angle;
        
        
        theta += Math.PI / 6;
        
        while (theta < 0) theta += 2 * Math.PI;
        while (theta >= 2 * Math.PI) theta -= 2 * Math.PI;

        
        
        
        
        const sector = Math.floor((theta + Math.PI/6) / (Math.PI/3));
        const sectorCenter = sector * (Math.PI/3);
        const diff = theta - sectorCenter; 

        
        
        
        const rScale = 1 / Math.cos(diff);

        
        
        return {
            x: this.gutterRadiusX * rScale * Math.cos(angle),
            y: this.gutterRadiusY * rScale * Math.sin(angle)
        };
    }

    updatePhysics() {
        
        
        
        
        const friction = 0.95;
        const collisionRadius = 0.15; 

        
        this.deadMarbles.forEach(dm => {
            if (!dm.isDragging) {
                dm.angle += dm.velocity;
                dm.velocity *= friction;
                if (Math.abs(dm.velocity) < 0.001) dm.velocity = 0;
            }
        });

        
        
        
        
        
        
        
        
        for (let i = 0; i < this.deadMarbles.length; i++) {
            for (let j = i + 1; j < this.deadMarbles.length; j++) {
                let m1 = this.deadMarbles[i];
                let m2 = this.deadMarbles[j];
                
                let diff = m2.angle - m1.angle;
                
                while (diff <= -Math.PI) diff += 2*Math.PI;
                while (diff > Math.PI) diff -= 2*Math.PI;
                
                if (Math.abs(diff) < collisionRadius) {
                    
                    
                    
                    const now = Date.now();
                    if (!this.lastClackTime || now - this.lastClackTime > 100) {
                        if (Math.abs(m1.velocity) > 0.005 || Math.abs(m2.velocity) > 0.005) {
                             this.clackSound.currentTime = 0;
                             this.clackSound.play().catch(e => {});
                             this.lastClackTime = now;
                        }
                    }

                    const push = (collisionRadius - Math.abs(diff)) / 2;
                    if (diff > 0) {
                        if (!m1.isDragging) m1.angle -= push * 0.1; 
                        if (!m2.isDragging) m2.angle += push * 0.1;
                        
                        
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
        
        
        this.deadMarbles.forEach(dm => {
             
             while (dm.angle <= -Math.PI) dm.angle += 2*Math.PI;
             while (dm.angle > Math.PI) dm.angle -= 2*Math.PI;
        });

        
        const centerPos = this.getCenterCellPos();
        if (centerPos) {
            const cx = centerPos.left + 30;
            const cy = centerPos.top + 35;

            this.deadMarbles.forEach(dm => {
                if (dm.element) {
                    
                    const pos = this.getGutterPoint(dm.angle);
                    dm.element.style.left = `${cx + pos.x - 22.5}px`; 
                    dm.element.style.top = `${cy + pos.y - 22.5}px`;
                }
            });
        }
    }

    reset() {
        // Remove dead marble elements from the DOM
        this.deadMarbles.forEach(dm => {
            if (dm.element) {
                dm.element.remove();
            }
        });
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
        
        
        if (moves.length > 0) {
            this.moveSound.currentTime = 0;
            this.moveSound.play().catch(e => {}); 
        }

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
                    
                    this.gutterSound.currentTime = 0;
                    this.gutterSound.play().catch(e => {});

                    
                    const exitCoord = move.to;
                    const exitX = (exitCoord.q * 60) + (exitCoord.r * 30);
                    const exitY = -(exitCoord.r * 52); 
                    const angle = Math.atan2(exitY, exitX);

                    const deadMarbleEl = document.createElement('div');
                    deadMarbleEl.classList.add('marble', move.color, 'pushed-off');
                    deadMarbleEl.style.position = 'absolute';
                    deadMarbleEl.style.cursor = 'grab';
                    deadMarbleEl.style.pointerEvents = 'auto'; 
                    
                    
                    
                    
                    
                    
                    this.gutterLayer.appendChild(deadMarbleEl);
                    
                    const newDeadMarble = {
                        angle: angle,
                        velocity: 0, 
                        color: move.color,
                        element: deadMarbleEl,
                        isDragging: false
                    };

                    
                    this.setupGutterDrag(deadMarbleEl, newDeadMarble);

                    this.deadMarbles.push(newDeadMarble);
                    
                    
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
                    
                    const exitX = (move.to.q * 60) + (move.to.r * 30);
                    const exitY = -(move.to.r * 52); 
                    const angle = Math.atan2(exitY, exitX);
                    
                    const targetPos = this.getGutterPoint(angle);
                    const targetX = targetPos.x;
                    const targetY = targetPos.y;
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                     const absoluteTargetLeft = centerPos.left + targetX;
                     
                     
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
        
        
        const marble = this.dragState.marble;
        
        
        let diff = angle - this.dragState.lastAngle;
        if (diff > Math.PI) diff -= 2 * Math.PI;
        if (diff < -Math.PI) diff += 2 * Math.PI;

        marble.angle = angle;
        
        
        const now = Date.now();
        const dt = now - this.dragState.lastTime;
        if (dt > 0) {
            
            const instVelocity = diff * (16 / dt); 
            
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
            
            row.style.pointerEvents = 'none'; 

            for (let j = 0; j < this.game.boardLayout[i]; j++) {
                const axialCoord = this.game.toAxial(i, j);
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.style.pointerEvents = 'auto'; 
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
    const undoBtn = document.getElementById('undo-btn');
    const undoModal = document.getElementById('undo-modal');

    const gameUI = new GameUI(game, gameBoard, currentTurnSpan, whiteScoreSpan, blackScoreSpan, gameOverScreen, winnerMessage, playAgainBtn, messageBox);
    gameUI.render();

    playAgainBtn.addEventListener('click', () => {
        game.playAgain();
        gameUI.reset();
        gameUI.render();
    });

    undoBtn.addEventListener('click', () => {
        if (gameUI.isAnimating) return;
        
        const undoResult = game.undo();
        if (undoResult) {
            // Show Custom Modal
            if (undoModal) {
                undoModal.style.display = 'block';
                undoModal.style.opacity = '1';
                setTimeout(() => {
                    undoModal.style.opacity = '0';
                    setTimeout(() => {
                        undoModal.style.display = 'none';
                    }, 500); 
                }, 1000);
            }

            // If a marble was resurrected (score went down), remove it from deadMarbles
            if (undoResult.resurrectedColor) {
                // Find the LAST added marble of that color
                for (let i = gameUI.deadMarbles.length - 1; i >= 0; i--) {
                    if (gameUI.deadMarbles[i].color === undoResult.resurrectedColor) {
                        const dm = gameUI.deadMarbles[i];
                        if (dm.element) dm.element.remove(); // Remove from DOM
                        gameUI.deadMarbles.splice(i, 1); // Remove from physics array
                        break; // Only remove one
                    }
                }
            }
            gameUI.render();
        }
    });
});