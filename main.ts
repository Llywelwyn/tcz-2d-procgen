/**
 * Represents a 2D map of cells with binary living or dead states. i.e. a wall or a floor.
 */
class Map {
    private readonly gridRows: number;
    private readonly gridCols: number;
    private states: boolean[][] = [];

    constructor(cols: number, rows: number) {
        this.gridRows = rows;
        this.gridCols = cols;
        for (let r = 0; r < this.gridRows; r++) {
            const row: boolean[] = [];
            for (let c = 0; c < this.gridCols; c++) {
                row.push(false);
            }
            this.states.push(row);
        }
    }

    public getStates(): boolean[][] { return this.states; }

    public update(transform: (currentStates: boolean[][]) => boolean[][]): void {
        let newStates = transform(this.states);
        if (
            newStates.length == this.gridRows &&
            newStates[0].length === this.gridCols
        ) {
            this.states = newStates;
        } else {
            throw "Transformed Map states don't fit the map grid.";
        }
    }

    // TODO: This should probably be in MapProcGen.
    public randomise(livingChance: number = 0.5): void {
        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                this.states[r][c] = Math.random() < livingChance;
            }
        }
    }

    public toString(): string {
        let result = `[${this.gridRows}, ${this.gridCols}]\nstates:`
        for (let r = 0; r < this.gridRows; r++) {
            let rowString = this.states[r].map(cell => `${+cell}`).join('');
            result += `\n${rowString}`;
        }
        return result;
    }
}

class Rect {
    constructor(
        public x1: number,
        public x2: number,
        public y1: number,
        public y2: number
    ) {}

    public static withSize(x: number, y: number, width: number, height: number): Rect {
        return new Rect(
            x, 
            x + width, 
            y, 
            y + height
        )
    }

    public getWidth(): number { return (Math.abs(this.x1 - this.x2)); }
    public getHeight(): number { return (Math.abs(this.y1 - this.y2)); }
}

/**
 * Static class containing ProcGen logic to be applied to a Map.
 */
class MapBuilder {
    /**
     * Counts the living cell neighbours of a given cell in a 2D array of cell states.
     * 
     * @param {boolean[][]} states - 2D array of cell states.
     * @param {number} row - The row of the cell to be checked.
     * @param {number} col - The column of the cell to be checked.
     * @returns {number} - The number of living (true) neighbours of the cell.
     */
    private static countCellNeighbours(states: boolean[][], row: number, col: number): number {
        let count: number = 0;
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                // Don't count own cell.
                if (i == 0 && j == 0) {
                    continue;
                }
                let neighbourRow = row + i;
                let neighbourCol = col + j;
                // Don't count out-of-bounds cells.
                if (
                    neighbourRow < 0 ||
                    neighbourCol < 0 ||
                    neighbourRow >= states.length ||
                    neighbourCol >= states[0].length
                ) {
                    continue;
                }
                // If cell is alive, increment neighbour count.
                if (states[neighbourRow][neighbourCol]) count++;
            }
        }
        return count;
    }

    /**
     * Takes a single CA step on a map state and returns the evolved state.
     * 
     * @param {boolean[][]} states - 2D array of cell states.
     * @returns {boolean[][]} - 2D array of evolved cell states.
     */
    public static cellularAutomataStep(states: boolean[][]): boolean[][] {
        const gridRows: number = states.length;
        const gridCols: number = states[0].length;
        const newStates: boolean[][] = [];

        for (let r = 0; r < gridRows; r++) {
            newStates[r] = [];
            for (let c = 0; c < gridCols; c++) {
                const livingNeighbours = MapBuilder.countCellNeighbours(states, r, c);
                if (
                    (states[r][c] && livingNeighbours >= 4) ||
                    (!states[r][c] && livingNeighbours >= 5 || livingNeighbours === 0)
                ) {
                    newStates[r][c] = true;
                } else {
                    newStates[r][c] = false;
                }
            }
        }
        return newStates;
    }

    public buildBspRects(states: boolean[][]) {
        const gridRows: number = states.length;
        const gridCols: number = states[0].length;
        const rects: Rect[] = [];
        const rooms: Rect[] = [];

        rects.push(Rect.withSize(2, 2, gridCols - 5, gridRows - 5));
        const first_room = rects[0];
        MapBuilder.addSubrects(rects, first_room);

        let n_rooms: number = 0;
        while (n_rooms < 240) {
            const rect = MapBuilder.getRandomRect(rects);
            const candidate = MapBuilder.getRandomSubRect(rect);
            if (MapBuilder.roomIsPossible(candidate, rooms)) {
                rooms.push(candidate);
                MapBuilder.addSubrects(rects, rect);
            }
            n_rooms += 1;
        }

        // TODO: unstatic this stuff and turn it into a proper Builder so rooms
        //       and rects can be passed around to stuff like a Room or Corridor
        //       drawer.
    }

    private static addSubrects(rects: Rect[], rect: Rect) {
        const width: number = rect.getWidth();
        const height: number = rect.getHeight();
        const halfWidth: number = Math.max(width / 2, 1);
        const halfHeight: number = Math.max(height / 2, 1);

        rects.push(Rect.withSize(rect.x1, rect.y1, halfWidth, halfHeight));
        rects.push(Rect.withSize(rect.x1, rect.y1 + halfHeight, halfWidth, halfHeight));
        rects.push(Rect.withSize(rect.x1 + halfWidth, rect.y1, halfWidth, halfHeight));
        rects.push(Rect.withSize(rect.x1 + halfWidth, rect.y1 + halfHeight, halfWidth, halfHeight));
    }

    private static getRandomRect(rects: Rect[]): Rect {
        if (rects.length == 1) { return rects[0]; }
        return rects[randint(1, rects.length) - 1];
    }

    private static getRandomSubRect(rect: Rect): Rect {
        const result = rect;
        const rectWidth = rect.getWidth();
        const rectHeight = rect.getHeight();
        const randomSizeWithinBounds = (min: number, width: number, max: number) => {
            return Math.max(min, randint(1, Math.min(width, max)) - 1) + 1;
        }

        let w = randomSizeWithinBounds(3, rectWidth, 10);
        let h = randomSizeWithinBounds(3, rectHeight, 10);

        result.x1 += randint(1, 6) - 1;
        result.y1 += randint(1, 6) - 1;
        result.x2 = result.x1 + w;
        result.y2 = result.y1 + h;

        return result;
    }

    private static roomIsPossible(room: Rect, rooms: Rect[]) {
        return;
    }
}

/**
 * Static class containing logic for rendering a Map.
 */
class MapRenderer {
    /**
     * Takes a set of cell states and draws them to an image.
     * 
     * @param {boolean[][]} states - 2D array of cell states.
     * @param {Image} image - The image to draw to.
     * @param {boolean} [scale = true] - If the states should scale to fit the image.
     */
    public static drawToImage(states: boolean[][], image: Image, scale: boolean = true): void {
        const gridRows = states.length;
        const gridCols = states[0].length;
        const scaleX = image.width / gridCols;
        const scaleY = image.height / gridRows;

        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                const col = states[r][c] ? 0 : 1;
                
                if (scale) {
                    for (let dy = 0; dy < scaleY; dy++) {
                        for (let dx = 0; dx < scaleX; dx++) {
                            const imageX = c * scaleX + dx;
                            const imageY = r * scaleY + dy;
                            image.setPixel(imageX, imageY, col);
                        }
                    }
                } else {
                    image.setPixel(r, c, col);
                }
            }
        }
    }
}

let bg = sprites.create(image.create(160, 120));

const renderCellularAutomataSteps = (count: number) => {
    const map: Map = new Map(160, 120);
    map.randomise()
    MapRenderer.drawToImage(map.getStates(), bg.image);
    const drawStep = () => {
        pause(500)
        map.update(states => MapBuilder.cellularAutomataStep(states));
        MapRenderer.drawToImage(map.getStates(), bg.image);
    }
    for (let i = 0; i < count; i++) {
        drawStep();
    }
}

renderCellularAutomataSteps(10);
setInterval(() => {
    renderCellularAutomataSteps(10);
}, 5000)