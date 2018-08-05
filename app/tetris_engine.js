'use strict';
//Tetris game engine

//SETTINGS
const GAMESPEED = 1000;

// DEFINES
//Every blocks are defined by 4 dots, with their coordinates relatives to the center of rotation
//TODO: Square are not supposed to rotate at all
const blocks = [
    [ //Square block
        [0,0],[0,1],[1,0],[1,1]
    ],[//T-block
        [0,0],[0,1],[1,0],[1,1]
    ], [//LINNNNNNEEEEE PIECE! https://www.youtube.com/watch?v=Alw5hs0chj0
        [0,0],[0,1],[0,-1],[0,-2]
    ], [//L block
        [0,0],[1,0],[1,-1],[-1,0]
    ], [//Reverse L block
        [0,0],[1,0],[1,1],[-1,0]
    ], [ //Squiggly
        [0,0],[1,0],[0,-1],[-1,-1]
    ], [ //Reverse squiggly
        [0,0],[-1,0],[0,-1],[-1,1]
    ]
];

// functions
//return a random number (int) between min and max
//used to generate a new block
function getRandomNumber(min,max){
    return Math.floor(min + max * Math.random());
};

//return the new coordinate after a 90° clockwise rotation
function rotate(x,y){
    //clockwise rotation : [0 -1][1 0] matrix transformation
    let x2 = y;
    let y2 = -1 * x;

    return [x2,y2];
};

// block class
class Block {
    //create a new block
    //shapes are defined in the constant blocks
    //centerX and centerY are the actual coordinate of the block center in the grid
    //TODO : use an array for center coordinates instead ? (center = [x,y])
    constructor(shape, x = 5, y = -1){
        this.shape = shape;
        this.centerX = x;
        this.centerY = y;
    };

    //try to move the block
    //return true if the action succeeded (no collision)
    move(grid,mx,my){
        for(let i = 0; i < this.shape.length; i++){
            if(grid.getState(this.shape[i][0] + this.centerX + mx,
                             this.shape[i][1] + this.centerY + my) === 1)
                return false;
        }
        
        this.centerX+=mx;
        this.centerY+=my;
        return true;
    };

    //flip the block, return a boolean
    flip(grid){
        let tmp = this.shape.map(square => rotate(square[0],square[1]));
        console.log(tmp);
        //check if no colide
        for(let i = 0; i < tmp.length; i++)
            if(grid.getState(tmp[i][0] + this.centerX,
                             tmp[i][1] + this.centerY))
                return false;
        //if ok switch
        this.shape = tmp;
        return true;
    }
    
    //return an array with the coordinates for each squares that compose the block
    get state(){
        let squares = new Array(4);
        for(let i = 0; i < this.shape.length; i++){
            squares[i] = [this.centerX + this.shape[i][0],
                          this.centerY + this.shape[i][1]];
        }

        return squares;
    };
}

//grid class
//virtual representation of the actual game, 0 mean empty and 1 occupied
class Grid {
    constructor(width = 10, height = 15){
        this.isGameOver = false;
        this.width = width;
        this.height = height;
        this.grid = new Array(width * height);
        //fill the grid with 0 (empty) state
        for(let i = 0; i < this.grid.length; i++) this.grid[i] = 0;
    };

    //return given coord state
    getState(x,y){
        //we consider all borders except the top one to be solid
        if(x<0 || x >= this.width || y >= this.height) return 1;
        return this.grid[x + this.width*y];
    };

    //update the set of the cell at given coords
    setState(x,y,state){
        if(y<0 && 1 === state) this.isGameOver = true;
        this.grid[x + this.width * y] = state;
    };
    
    //remove a line
    destroyLine(y){
        //we release the line
        for(let x = 0; x < this.width; x++)
            this.grid[x + y * this.width] = 0;

        //we start with the line above y
        while(--y >= 0){
            for(let x = 0; x < this.width; x++){
                if(this.grid[x + y* this.width] === 0) continue;
                this.grid[x + y * this.width] = 0;
                this.grid[x + (y+1) * this.width] = 1;
            }
        }
    }
    
    //stop a block and integrate it in the grid
    collide(block){
        //get squares coords
        let squares = block.state;
        for(let i = 0; i < squares.length; i++){
            this.setState(squares[i][0],squares[i][1],1);
        }
    }
    
    //return actual state of the grid
    get state(){
        let grid = this.grid, width = this.width, height = this.height;
        return {grid,width,height};
    }
}

// Tetris game class
class Tetris {

    //started is a boolean, if false (usually until game start and after gameover) will stop the gameloop
    //score and level stores the actual store
    //grid is an instance of the actual grid
    //active is the currently falling block instance
    //grid and active will be overwritten on game start
    constructor(){
        this.started = false;
        this.score = 0;
        this.level = 1;
        this.grid = new Grid();
        this.active = new Block();
    };

    //Generate a random block and return it
    generateNewBlock(){
        var blockType = getRandomNumber(0,blocks.length - 1);
        var block = new Block(blocks[blockType]);
        //TODO : new block initialized positions
        this.active = block;
        return block;
    };

    //try to move a block laterally
    moveBlock(direction){
        if(!this.started) return false;
        this.active.move(this.grid,direction,0);
        postMessage(this.state);
    };

    //move down is a special case as it can trigger colisions : gameover, line break etc
    moveDown(){
        if(!this.started) return false;
        if(!this.active.move(this.grid,0,1)){
            this.grid.collide(this.active);
            //if collide, build a new block, check for lines and if gameover
            
            //update the score : 5 per block placed, 10 per line destroyed
            //10 bonus if 4 line destroyed in one hit
            this.score += 5;
            let lineDestroyed = this.destroyLines();
            this.score += lineDestroyed * 10;
            if(4 === lineDestroyed) this.score += 10;
            //move to next level every 100 points
            if(this.score > this.level * 100)
                this.level = Math.floor(this.score / 100) + 1;
            //generate a new block if game still running eitherway stop the game
            if(!this.grid.isGameOver)
                this.generateNewBlock();
            else
                this.started = false;
        }
        postMessage(this.state);
    };
    
    //flip the current active block if possible
    flipBlock(){
        if(!this.started) return false;
        if(this.active.flip(this.grid)) postMessage(this.state);
        else console.log("couldn't flip");
    };

    //check for existing filled lines and destroy them
    //return the number of lines destroyed
    destroyLines(){
        let linebreaks = 0;
        for(let y = 0; y < this.grid.height; y++){
            let isFull = true;
            for(let x = 0; x < this.grid.width; x++){
                if(!this.grid.getState(x,y)){
                    isFull = false;
                    continue;
                }
            }
            if(isFull){
                this.grid.destroyLine(y);
                linebreaks++;
            }
        }

        return linebreaks;
    };

    //reset the game
    reset(){
        this.started = false;
        delete this.grid;
        this.grid = new Grid();
    };

    //start the game loop and everything, should be separated in two different functions to allow pause mode etc
    start(){
        if(!this.started){
            this.grid = new Grid();
            this.started = true;
            this.active = this.generateNewBlock();
            this.score = 0;
            this.level = 1;
            return true;
        }
        return false;
    };

    //return current state of the game for display
    // array [ current grid state, current active block]
    get state (){
        let game = this.grid.state;
        let block = this.active.state;

        //merge the two and then return
        return [game,block,this.score,this.level,this.grid.isGameOver];
    };
}

//initialize game instance and starting gameloop
var tetris = new Tetris();
// GAME LOOP
var gameloop = function(){
    if(tetris.started){
        tetris.moveDown();
        setTimeout(gameloop,GAMESPEED / tetris.level);
    }
};

//Worker interface
onmessage = function(e){
    //here is the userinterface vocabulary
    //keycodes : arrow down 40, arrowUp 38, ArrowLeft 37, ArrowRight 39
    // 32: spacebar, (re)start the game
    // 99 : return actual game state, for debugging
    switch(e.data){
    case 32:
        //space to start
        if(tetris.start()) gameloop();
    case 99:
        //request current state log (grid  activeblock)
        //note : this will be only for debug as the engine will send the actual state of the game
        // to the client on each game loop
        let state = tetris.state;
        postMessage(state);
        break;
    case 40:
        tetris.moveDown();
        break;
    case 38:
        tetris.flipBlock();
        break;
    case 39:
        tetris.moveBlock(1);
        break;
    case 37 :
        tetris.moveBlock(-1);
        break;
    }
}
