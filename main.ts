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

/**
 * Static class containing ProcGen logic to be applied to a Map.
 */
class MapProcGen {
    /**
     * Counts the living cell neighbours of a given cell in a 2D array of cell states.
     * 
     * @param {boolean[][]} states - 2D array of cell states.
     * @param {number} row - The row of the cell to be checked.
     * @param {number} col - The column of the cell to be checked.
     * @returns {number} - The number of living (true) neighbours of the cell.
     */
    private static countCellNeighbours(states: boolean[][], row: number, col: number): number {
        let count = 0;
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
        const gridRows = states.length;
        const gridCols = states[0].length;
        const newStates: boolean[][] = [];

        for (let r = 0; r < gridRows; r++) {
            newStates[r] = [];
            for (let c = 0; c < gridCols; c++) {
                const livingNeighbours = MapProcGen.countCellNeighbours(states, r, c);
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
        map.update(states => MapProcGen.cellularAutomataStep(states));
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