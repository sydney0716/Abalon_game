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

        const handleInteraction = (e) => {
            if (this.isAnimating) return;
            
            let target;
            if (e.type === 'touchstart') {
                e.preventDefault();
                const touch = e.touches[0];
                target = document.elementFromPoint(touch.clientX, touch.clientY);
            } else {
                target = e.target;
            }

            if (target.classList.contains('marble')) {
                this.handleMarbleClick(target);
            } else if (target.classList.contains('cell')) {
                this.handleCellClick(target);
            }
        };

        this.gameBoard.addEventListener('click', handleInteraction);
        this.gameBoard.addEventListener('touchstart', handleInteraction);
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
                marble.style.opacity = 0; // Hide the marble after animation
                onTransitionEnd();
            };
            marble.addEventListener('transitionend', transitionEndHandler);

            if (toCell) {
                const toRect = toCell.getBoundingClientRect();
                const dx = toRect.left - fromRect.left;
                const dy = toRect.top - fromRect.top;
                marble.style.transform = `translate(${dx}px, ${dy}px)`;
            } else {
                const direction = move.to.subtract(move.from);
                const offBoardDx = direction.q * 100 + (direction.r * 50);
                const offBoardDy = direction.r * 87;
                marble.style.transform = `translate(${offBoardDx}px, ${offBoardDy}px) scale(0)`;
                marble.classList.add('pushed-off');
            }
        });
    }

    render() {
        this.gameBoard.innerHTML = '';
        
        for (let i = 0; i < this.game.boardLayout.length; i++) {
            const row = document.createElement('div');
            row.classList.add('row');

            for (let j = 0; j < this.game.boardLayout[i]; j++) {
                const axialCoord = this.game.toAxial(i, j);
                const cell = document.createElement('div');
                cell.classList.add('cell');
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
            this.gameBoard.appendChild(row);
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

    const gameUI = new GameUI(game, gameBoard, currentTurnSpan, whiteScoreSpan, blackScoreSpan, gameOverScreen, winnerMessage, playAgainBtn, messageBox);
    gameUI.render();

    playAgainBtn.addEventListener('click', () => {
        game.playAgain();
        gameUI.render();
    });
});