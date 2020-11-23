var WIDTH = 10;
var HEIGTH = 20;
var offset_x
var offset_y;
var maps;
var TilesArray;
var current;
var program;

var colors;
var color_index;
var Buffer, ColorId;
var vPosition, vColor;
var cur_offset_x, cur_offset_y;
var mode;
var numOfTile = 7;
var x1, x2, y1, y2;
var scores;
var dropSpeed = setInterval(softDrop, 200);
var freshRate = setInterval(render, 30);
var gridsToDraw;
var gl = null;


function setupWebGL() {

    // document.onkeydown = handleKey();

    document.onkeydown = keyDown;

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas");
    gl = canvas.getContext("webgl"); // get a webgl object from it
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    try {
        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {
            gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
            gl.clearDepth(1.0); // use max when we clear the depth buffer
            gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
        }
    } // end try

    catch (e) {
        console.log(e);
    } // end catch

} // end setupWebGL

// Check tile's surrounding and detect whether the current block can move to the desired place
function canmove(down, right, change_mode) {
    let newmode = (mode + change_mode) % TilesArray[current].length;

    for (let i = 0; i < 4; i++) {
        cur_offset_x = TilesArray[current][newmode][i] % 4;
        cur_offset_y = Math.floor(TilesArray[current][newmode][i] / 4);
        if (cur_offset_x + offset_x + right < 0 ||
            cur_offset_x + offset_x + right >= WIDTH ||
            cur_offset_y + offset_y + down >= HEIGTH ||
            cur_offset_y + offset_y + down < 0 ||
            maps[cur_offset_x + offset_x + right][cur_offset_y + offset_y + down] != -1) {

            return false;
        }
    }
    return true;
}

//  create the new block
function generateNewTile() {
    current = Math.floor(Math.random() * (numOfTile - 1));
    offset_x = Math.floor(WIDTH / 2) - 1;
    offset_y = 0;
    mode = -1;
    if (canmove(0, 0, 1)) {
        mode++;
    } else{
        render();
        alert("lose the game");
        clearInterval(dropSpeed);
        clearInterval(freshRate);
    }


}

// Soft drop the tile
function softDrop() {
    if (canmove(1, 0, 0)) {
        offset_y++;
    } else {
        //   the current block is fixed in the maps
        for (let i = 0; i < 4; i++) {
            cur_offset_x = TilesArray[current][mode][i] % 4;
            cur_offset_y = Math.floor(TilesArray[current][mode][i] / 4);
            maps[offset_x + cur_offset_x][offset_y + cur_offset_y] = current;
        }
        clearLine(); //The function will detect whether need to clear the line
        generateNewTile();
    }
}

function moveleft() {
    if (canmove(0, -1, 0)) {
        offset_x--;
    }
}

function moveright() {
    if (canmove(0, 1, 0)) {
        offset_x++;
    }
}

/**
 * Rotate the tile
 * @param rotation Direction 1 clockwise, -1 counter clockwise
 */
function rotate(rotation = 1) {

    if (canmove(0, 0, 1)) {
        mode = (mode + 1 * rotation) % TilesArray[current].length;
    }


}


//Draw the game screen
function render() {
    //  draw the maps
    gl.clear(gl.COLOR_BUFFER_BIT);
    let Positions = [];
    let Colors = [];
    for (let i = 0; i < WIDTH; i++)
        for (let j = 0; j < HEIGTH; j++)
            if (maps[i][j] != -1) {
                color_index = maps[i][j];

                Positions.push(-1 + (i / WIDTH) * 2, 1 - (j / HEIGTH) * 2,
                    -1 + ((i + 1) / WIDTH) * 2, 1 - (j / HEIGTH) * 2,
                    -1 + (i / WIDTH) * 2, 1 - ((j + 1) / HEIGTH) * 2,
                    -1 + ((i + 1) / WIDTH) * 2,
                    1 - (j / HEIGTH) * 2,
                    -1 + (i / WIDTH) * 2, 1 - ((j + 1) / HEIGTH) * 2,
                    -1 + ((i + 1) / WIDTH) * 2, 1 - ((j + 1) / HEIGTH) * 2);
                for (let t = 0; t < 6; t++) {
                    Colors.push(colors[color_index]);
                }
            }
    enableArray(Positions, Colors);
    gl.drawArrays(gl.TRIANGLES, 0, Positions.length / 2);

    // Empty buffer and draw the current tile
    let draw_current = [];
    Colors = [];

    for (let i = 0; i < 4; i++) {
        cur_offset_x = TilesArray[current][mode][i] % 4;
        cur_offset_y = Math.floor(TilesArray[current][mode][i] / 4);


        draw_current.push(-1 + (((offset_x + cur_offset_x) / WIDTH)) * 2,
            1 - (((offset_y + cur_offset_y) / HEIGTH)) * 2, -1 + (((offset_x + cur_offset_x + 1) / WIDTH)) * 2,
            1 - (((offset_y + cur_offset_y) / HEIGTH)) * 2, -1 + (((offset_x + cur_offset_x) / WIDTH)) * 2,
            1 - (((offset_y + cur_offset_y + 1) / HEIGTH)) * 2, -1 + (((offset_x + cur_offset_x + 1) / WIDTH)) * 2,
            1 - (((offset_y + cur_offset_y) / HEIGTH)) * 2,
            -1 + (((offset_x + cur_offset_x) / WIDTH)) * 2,
            1 - (((offset_y + cur_offset_y + 1) / HEIGTH)) * 2,
            -1 + (((offset_x + cur_offset_x + 1) / WIDTH)) * 2,
            1 - (((offset_y + cur_offset_y + 1) / HEIGTH)) * 2);
        for (let j = 0; j < 6; j++)
            Colors.push(colors[current]);
    }
    enableArray(draw_current, Colors);
    gl.drawArrays(gl.TRIANGLES, 0, draw_current.length / 2);
    //  show the scores
    let showscores = document.getElementById("scores").innerHTML = scores;

    //draw the background grid
    gridsToDraw = [];
    Colors = [];

    for (let i = 0; i < HEIGTH; i++) {

        gridsToDraw.push(-1, 1 - ((i / HEIGTH)) * 2, 1, 1 - ((i / HEIGTH)) * 2);
        // for (let t = 0; t < 4; t++) Colors.push([0.82, 0.82, 0.82, 1]);
        Colors.fill([0.82, 0.82, 0.82, 1], 0, 4);
    }
    for (let j = 0; j < WIDTH; j++) {
        gridsToDraw.push(-1 + ((j / WIDTH)) * 2, 1, -1 + ((j / WIDTH)) * 2, -1);
        // for (let t = 0; t < 4; t++) Colors.push([0.82, 0.82, 0.82, 1]);
        Colors.fill([0.82, 0.82, 0.82, 1], 0, 4);
    }
    enableArray(gridsToDraw, Colors);
    gl.drawArrays(gl.LINES, 0, gridsToDraw.length / 2);


}

/**
 *
 * @param positionArray Position Array
 * @param colorArray Color Array
 */
function enableArray(positionArray, colorArray) {

    gl.bindBuffer(gl.ARRAY_BUFFER, Buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, ColorId);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray.flat(2)), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

}


//  Initialize the game
function initi() {
    for (let i = 0; i < WIDTH; i++)
        maps[i] = new Array(HEIGTH).fill(-1);

    current = 1;
    offset_y = 0;
    offset_x = 5;
    scores = 0;
    mode = 0;

}

function clearLine() {
    let clear;
    let j;
    //Bottom up checking
    for (j = HEIGTH - 1; j >= 0; j--) {
        clear = true;
        for (let i = 0; i < WIDTH; i++) {
            if (maps[i][j] == -1)
                clear = false;
        }
        if (clear) break;
    }
    if (clear) {
        for (let t = j; t > 0; t--)
            for (let i = 0; i < WIDTH; i++) {
                if(t == 0){
                    maps[i][t] = -1;
                }
                maps[i][t] = maps[i][t - 1];
            }
        scores += 100;
    }
}

//start the game
function startgame() {
    initi();
}


var vertexShader = `
    attribute vec4 vPosition;
    attribute vec4 vColor;
    varying vec4 Color;


    void  main()
    {
        Color=vColor;
        gl_Position = vPosition;
    }
`


var fragmentShader = `
    precision mediump float;
    varying  vec4 Color;
    void
    main()
    {
        gl_FragColor = Color;
    }`

function initShaders(gl, vertexShader, fragmentShader) {
    let fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
    gl.shaderSource(fShader, fragmentShader); // attach code to shader
    gl.compileShader(fShader); // compile the code for gpu execution

    let vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
    gl.shaderSource(vShader, vertexShader); // attach code to shader
    gl.compileShader(vShader); // compile the code for gpu execution

    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
        throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
        gl.deleteShader(fShader);
    } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
        throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
        gl.deleteShader(vShader);
    }

    let program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        let msg = "Shader program failed to link.  The error log is:"
            + "<pre>" + gl.getProgramInfoLog(program) + "</pre>";
        alert(msg);
        return -1;
    }

    return program;
}

function keyDown(event) {
    switch (event.code) {
        case "ArrowDown": // Soft drop
            softDrop();
            break;
        case "ArrowUp": // Rotate right
            rotate(1);
            break;

        case "ArrowLeft" || event.repeat: // Move left
            moveleft();
            break;
        case "ArrowRight" || event.repeat: // Move right
            moveright();
            break;

        case "KeyZ": //Rotate left
            rotate(-1);
            break;
        case "KeyC": //Hold

            break;
        case"Escape": //Pause the game

            break;
        case"Space": //Pause the game

            break;
    }
}


window.onload = function init() {
    setupWebGL();

    if (!gl) {
        alert("WebGL isn't available");
    }

    program = initShaders(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    Buffer = gl.createBuffer();


    vPosition = gl.getAttribLocation(program, "vPosition");
    ColorId = gl.createBuffer()
    vColor = gl.getAttribLocation(program, "vColor");

    maps = new Array(WIDTH);

    for (let i = 0; i < WIDTH; i++) {
        maps[i] = new Array(HEIGTH);
        maps[i].fill(-1, 0, HEIGTH)
    }
    //colors[] use to storage the blocks color
    colors = [[1, 0, 0, 1], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 1], [0, 1, 1, 1], [0, 0, 1, 1], [1, 1, 1, 1]];

    //translate  use to storage  the different blocks (7)  in 4*4board,
    //O Tile
    TilesArray = new Array(numOfTile);
    TilesArray[0] = new Array(1);
    TilesArray[0][0] = new Array(0, 1, 4, 5);

    //I Tile
    TilesArray[1] = new Array(2);
    TilesArray[1][0] = new Array(0, 1, 2, 3);
    TilesArray[1][1] = new Array(0, 4, 8, 12);


    //T Tile
    TilesArray[2] = new Array(4);
    TilesArray[2][0] = new Array(0, 1, 2, 5);
    TilesArray[2][1] = new Array(1, 4, 5, 9);
    TilesArray[2][2] = new Array(1, 4, 5, 6);
    TilesArray[2][3] = new Array(1, 5, 6, 9);

    //J Tile
    TilesArray[3] = new Array(4);
    TilesArray[3][0] = new Array(1, 5, 8, 9);
    TilesArray[3][1] = new Array(0, 4, 5, 6);
    TilesArray[3][2] = new Array(1, 2, 5, 9);
    TilesArray[3][3] = new Array(0, 1, 2, 6);


    //L Tile
    TilesArray[4] = new Array(4);
    TilesArray[4][0] = new Array(0, 4, 8, 9);
    TilesArray[4][1] = new Array(0, 4, 1, 2);
    TilesArray[4][2] = new Array(0, 1, 5, 9);
    TilesArray[4][3] = new Array(2, 4, 5, 6);

    //S Tile
    TilesArray[5] = new Array(2);
    TilesArray[5][0] = new Array(1, 2, 4, 5);
    TilesArray[5][1] = new Array(0, 4, 5, 9);

    //Z Tile
    TilesArray[6] = new Array(2);
    TilesArray[6][0] = new Array(0, 1, 5, 6);
    TilesArray[6][1] = new Array(1, 4, 5, 8);

    dropSpeed = null;
    freshRate = null;
};







