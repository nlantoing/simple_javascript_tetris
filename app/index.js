'use strict';

const KONAMICODE = [38, 38, 40, 40, 37, 39, 37, 39, 65, 66];
var konamilastKey = null;
var konamiseq = 0;

//canvas variables
var canvas, canvas_ctx;

//bind keyboard events to a worker action
function keybinding(worker){
    document.addEventListener('keydown', (event) => {
        const keyName = event.key;

        //a bit ugly, we should check if the keycode is one of the accepted ones here before propagating
        worker.postMessage(event.keyCode);

        if(event.keyCode === KONAMICODE[konamiseq]){
            konamiseq++;
            if(konamiseq == KONAMICODE.length){
                //congratz!
                console.log("You won a music!");
                document.getElementById("konamimusic").play();
            }
        } else konamiseq = 0;
    });
};

//ensure the full document is loaded before doing anything
window.addEventListener("load", function(e) {
    console.log("Sup!");
    //DOM binding
    canvas = document.getElementById('tetris_canvas');
    canvas_ctx = canvas.getContext('2d');
    var dom_score = document.getElementsByClassName("score")[0];
    var dom_level = document.getElementsByClassName("level")[0];
    
    //worker init
    var game = new Worker('app/tetris_engine.js');
    keybinding(game);
    //handshake
    game.postMessage('Hi!');
    //worker interface
    //TODO: add a message code prefix from the workers
    game.onmessage = function(e) {
        let [grid,block,score,level,isGameOver] = e.data;

        //TODO: REMOVEME : should be using messages codes instead (see worker part)
        if(block.map && grid){
            //redraw
            let color = "blue";
            let blockCoords = block.map( coord => {
                return coord[0] + coord[1] * grid.width;
            });

            //Game over
            if(isGameOver){
                color = "red";
            }
            
            //update score and level
            dom_score.textContent = "score "+score;
            dom_level.textContent = "level "+level;
            
            //redraw action
            for(let y = 0, i = 0; y < grid.height; y++){
                let line = new Array();
                for(let x = 0; x < grid.width; x++, i++){
                    let cell;
                    line[x] = cell = grid.grid[i];

                    //uh ugly, TODO: refactorme
                    //check if current coords is in the active block position
                    for(let j = 0; j < blockCoords.length; j++){
                        if(i === blockCoords[j])
                            line[x] = cell = 2;
                    }

                    //draw the block if exist
                    let x1 = x * 10, y1 = y*10;
                    if(cell){
                        canvas_ctx.fillStyle = (!isGameOver && 2 === cell) ? "green" : color;
                        canvas_ctx.fillRect(x1, y1, 10, 10);
                        canvas_ctx.strokeRect(x1, y1, 10, 10);
                    } else {
                        canvas_ctx.clearRect(x1, y1, 10, 10);
                    }
                }
                //console.log(line);
            }
        }
    };
});
