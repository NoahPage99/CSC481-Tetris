var gl = null;
var current;
var tetri = null;
var tetriType;
var GameGrid = null;
var r;
var b;
var g;
var r2;
var b2;
var g2;
var grid;
var oldPlace;
var posX = 5.0;
var posY = 6.5;
var posZ = -20.0;
var falling;
var rotateAngle = 90;
var check;
var beforeRotate = rotateAngle;
var id;
var clockwise = false;
var counterclock = false;
var rotating = false;
var falling = false;
var mainBuffer;
var mainBuffer2;

//Enumerate
const TileType = {NONE: -1, I: 0, J: 1, L: 2, O: 3, S: 4, T: 5, Z: 6, GARBAGE: 7};
const TileColor = {NONE: -1, CYAN: 0, BLUE: 1, ORANGE: 2, YELLOW: 3, GREEN: 4, PURPLE: 5, RED: 6};
const Rotation = {NONE: -1, CLOCKWISE: 90, COUNTERCLOCKWISE: -90};
const Motion = {NONE: -1, LEFT: 0, RIGHT: 1};
const GameState = {Start: 1, Run: 2, Paused: 3, End: 4};
const KeyAction = {PRESS: 0, RELEASE: 1};
let CurGameState = GameState.Start;
const NumStates = 4;
const NumPieces = 7;

let softDrop = false;
let moveRight = false;
let moveLeft = false;
let startLevel = 1;

const TileSize = 32;
const GridNumRows = 20;
const GridNumCols = 10;
const GridWidth = GridNumCols * TileSize;
const GridHeight = GridNumRows * TileSize;
const Margin = 10;
const HudWidth = 160;
const Width = 3 * Margin + GridWidth + HudWidth;
const Height = 2 * Margin + GridHeight;
const HudX = Margin;
const HudY = Margin;
const BoardX = 2 * Margin + HudWidth;
const BoardY = Margin;
const HudPieceBoxHeight = 2.5 * TileSize;
const FontSize = 18;

let lockedTextures = [];
let ghostTextures = [];
let normalTextures = [];

const GameTimePrecision = 0.005;
const Fps = 30;
const SecondsPerFrame = 1.0 / Fps;


function setupWebGL() {

    // document.onkeydown = handleKey();

    document.addEventListener('keydown', handleKey(event, KeyAction.PRESS));
    document.addEventListener('keyup', handleKey(event, KeyAction.RELEASE));

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
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

function shader(sourceVertex, sourceFragment) {
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, 1, sourceVertex, null);
    gl.compileShader(vertexShader);

    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, 1, sourceFragment, null);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) { // bad frag shader compile
        throw "error during fragment shader compile: " + gl.getShaderInfoLog(fragmentShader);
        gl.deleteShader(fragmentShader);
    } else if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
        throw "error during vertex shader compile: " + gl.getShaderInfoLog(vertexShader);
        gl.deleteShader(vertexShader);
    } else {
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
            throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
        } else {
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);

            id = shaderProgram;
        }
    }

}

function textureBind() {
    gl.bindTexture(gl.TEXTURE_2D, id);
}

function shaderSetFloat(name, value) {
    gl.uniform1f(gl.getUniformLocation(id, name), value);
}

function shaderSetMat4(name, matrix) {
    gl.uniformMatrix4fv(gl.getUniformLocation(id, name), 1, gl.FALSE, matrix);
}

function shaderSetVec3(name, vec) {
    gl.uniform3f(gl.getUniformLocation(id, name), vec.x, vec.y, vec.z);
}

function setVec2(name, vec) {
    gl.uniform2f(gl.getUniformLocation(id, name), vec.x, vec.y);
}

function use() {
    gl.useProgram(id);
}

function loadRGBTex(path) {

}

function textures(format, width, height, imag) {
    gl.genTextures(1, id);
    gl.bindTexture(gl.TEXTURE_2D, id);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.UNSIGNED_BYTE, imag);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

//function shaders() {
    // define vertex shader in essl using es6 template strings

    var colorPrimVertexShader = `
		layout (location = 0) in vec2 position;
		uniform mat4 projection
		
		void main()
		{
			gl_Position = projection * vec4(position, 0, 1);
		}	
	`

    var colorPrimFragmentShader = `
		uniform vec3 inColor;
		out vec4 color;
		
		void main()
		{
			color = vec4(inColor, 1);
		}
	
	`

    var tileVertexShader = `
		layout (location = 0) in vec2 position;
		layout (location = 1) in vec2 texCoord;
		out vec2 texCoordFragment;
		
		uniform vec2 shift;
		uniform vec2 scale = vec2(1,1);
		uniform mat4 projection;
		
		void main()
		{
			gl_Position = projection * vec4(scale * position + shift, 0, 1);
			texCoordFragment = texCoord;
		}
	`

    var tileFragmentShader = `
		in vec2 texCoordFragment;
		out vec4 color;
		
		uniform sampler2D sampler;
		uniform vec3 mixture;
		uniform float mixC = 0;
		uniform float alpha = 1;
		
		void main()
		{
			color = mix(texture(sampler, texCoordFragment), vec4(mixture, 1), mixC);
			color.a *= alpha;
		}
	
	`

    var GlyphVertexShader = `
		layout (location = 0) in vec2 position;
		layout (location = 1) in vec2 texCoord;
		out vec2 texCoordFragment;
		
		
		uniform mat4 projection;
		
		void main()
		{
			gl_Position = projection * vec4(position, 0, 1);
			texCoordFragment = texCoord;
		}
	`

    var GlyphFragmentShader = `
		in vec2 texCoordFragment;
		out vec4 color;
		
		uniform vec3 text;
		uniform sampler2D glyph;
		
		void main()
		{
			float alpha = texture(glyph, texCoordFragment).r;
			color = vec4(text, alpha);
		}
	
	`

    var white = [1, 1, 1];
    var black = [0, 0, 0];

    function spriteRenderer(projection) {
        var vertices = [0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0];

        var buffer;

        gl.genBuffer(1, buffer);
        gl.genVertexArrays(1, mainBuffer);
        gl.bindVertexArray(mainBuffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, gl.FALSE, 0, 0);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, gl.FALSE, 0, 0);
        gl.enableVertexAttribArray(1);
        gl.bindVertexArray(0);

        use();
        shaderSetMat4("projection", projection);

    }

    function spriteRender(texture, x, y, width, height, mixC, mixColor, alphaMultiplier) {
        textureBind();
        use();

        var v = vec2.fromValues(x, y);
        var v1 = vec2.fromValues(width, height);

        setVec2("shift", v);
        setVec2("scale", v1);

        shaderSetFloat("mixC", mixC);
        shaderSetVec3("mixColor", mixColor);
        shaderSetFloat("alphaMultiplier", alphaMultiplier);
        gl.bindVertexArray(mainBuffer);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    }

    function PieceRenderShape(piece, x, y, mixC, mixColor, alphaMultiplier, startRow) {

        //unsure on piece.

        if (piece.kind() == NONE) {
            return;
        }
        var texture = piece.color();

        var i = startRow * piece.boxSide();
        var shape = piece.shape();
        for (var row = startRow; row < piece.boxSide(); row++) {
            for (var col = 0; col < piece.boxSide(); col++) {
                if (shape[i] != empty) {
                    spriteRender(texture, x + col * tileSize, y + row * tileSize, tileSize, tileSize, mixC, mixColor, alphaMultiplier);
                    i++;
                }
            }
        }
    }

    function pieceRenderInitialShape(piece, x, y) {

        //unsure on piece.

        if (piece.kind() == NONE) {
            return;
        }
        var texture = piece.color();

        var i = 0;
        var shape = piece.initialShape();
        for (var row = 0; row < piece.nRow(); row++) {
            for (var col = 0; col < piece.nCols(); col++) {
                if (shape[i] != empty) {
                    spriteRender(texture, x + col * tileSize, y + row * tileSize, tileSize, tileSize);
                    i++;
                }
            }
        }
    }

    function renderShapedCentered(piece, x, y, width, height) {
        var pieceWidth = tileSize * piece.nCols();
        var pieceHeight = tileSize * piece.nRow();
        var xShift = .5 * (width - pieceWidth);
        var yShift = .5 * (height - pieceHeight);

        pieceRenderInitialShape(piece, x + xShift, y + yShift);
    }

    var background = vec3.fromValues(.05, .05, .05);
    var gridColor = vec3.fromValues(.2, .2, .2);

    function boardRender(projection, tileSize, x, y, rows, cols, tileTexture, spriteRender, pieceRender, render) {
        use();
        shaderSetMat4("projection", projection);

        var width = rows * tileSize;
        var height = cols * tileSize;

        var vertBack = [x, y, x, y + height, x + width, y, x + width, y + height];

        var yGrid = y;

        for (var row = 0; row < rows + 1; ++row) {
            vertBack.push(x);
            vertBack.push(yGrid);
            vertBack.push(x + width);
            vertBack.push(yGrid);
            yGrid += tileSize;
        }

        var xGrid = x;

        for (var col = 0; col < cols + 1; ++col) {
            vertBack.push(xGrid);
            vertBack.push(y);
            vertBack.push(xGrid);
            vertBack.push(y + height);
            xGrid += tileSize;
        }

        var buffer;
        gl.genBuffer(1, buffer);
        gl.genVertexArrays(1, mainBuffer2);
        gl.bindVertexArray(mainBuffer2);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertBack.length * gl.FLOAT, vertback, gl.STATIC_DRAW);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, gl.FALSE, gl.FLOAT * 2, 0);
        gl.enableVertexAttribArray(0);
        gl.bindVertexArray(0);
    }

    function renderBackground() {
        use();
        gl.bindVertexArray(mainBuffer2);
        shaderSetVec3("inColor", backgroundColor);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        shaderSetVec3("inColor", gridColor);
        gl.drawArrays(gl.LINES, 4, 2 * (nRows_ + nCols_ + 2));
    }

    function renderTiles(board, alphaMultiplier) {
        var row;
        var col;
        var x;
        var y;
        var yy = y_;
        var xx = x_;

        for (var row = 0, y = yy; row < board.nRow; row++, y += tileSize) {
            for (var col = 0, x = xx; col < board.nCols; col++, x += tileSize) {
                var tile = board.tileAt(row, col);
                if (tile == empty) {
                    continue;
                }
                spriteRender(tile, x, y, tileSize, tileSize, 0, 0, alphaMultiplier);
            }
        }

    }

    function renderPiece(piece, row, col, lock, alphaMultiplier) {
        var startRow = Math.max(0, -row);
        var mixC = .5 * Math.sin((Math.PI / 2) * lock);
        PieceRenderShape(piece, x_ + col * tileSize, y_ + row * tileSize, mixC, black, alphaMultiplier, startRow);
    }

    /**function renderGhost(piece, gRow, col)
     {
		var startRow = Math.max(0, -gRow);
		
	}*/

    function clearLinesAnimation(board, percent) {
        var t = .3;
        var mixColor;
        var mixC;

        if (percent < t) {
            var sin = Math.sin(Math.PI * percent / t);
            mixColor = white;
            mixC = .8 * sin;
        } else {
            mixColor = black;
            mixC = (percent - t) / (1 - t);
        }
        for (var row: board.linesToClear_()
    )
        {
            for (var col = 0; col < nCols_; col++) {
                var x = x_ + col * tileSize;
                var y = y_ + row * tileSize;
                spriteRender(board.tileAt(row, col), x, y, tileSize, tileSize, mixC, mixColor, 1);
            }
        }

    }
	
	


    /**  var vShaderCode = `
     attribute vec3 aVertexPosition; // vertex position
     attribute vec3 aVertexNormal; // vertex normal
     attribute vec3 aVertexColor;
     uniform mat4 umMatrix; // the model matrix
     uniform mat4 upvmMatrix; // the project view model matrix
     varying vec3 vWorldPos; // interpolated world position of vertex
     varying vec3 vVertexNormal; // interpolated normal for frag shader
     void main(void) {
            
            // vertex position
            vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
            vWorldPos = vec3(vWorldPos4.x,vWorldPos4.y,vWorldPos4.z);
            gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);
            // vertex normal (assume no non-uniform scale)
            vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
            vVertexNormal = normalize(vec3(vWorldNormal4.x,vWorldNormal4.y,vWorldNormal4.z)); 
        }
     `;
     // define fragment shader in essl using es6 template strings
     var fShaderCode = `
     precision mediump float; // set float to medium precision
     // eye location
     uniform vec3 uEyePosition; // the eye's position in world
     // light properties
     uniform vec3 uLightAmbient; // the light's ambient color
     uniform vec3 uLightDiffuse; // the light's diffuse color
     uniform vec3 uLightSpecular; // the light's specular color
     uniform vec3 uLightPosition; // the light's position
     // material properties
     uniform vec3 uAmbient; // the ambient reflectivity
     uniform vec3 uDiffuse; // the diffuse reflectivity
     uniform vec3 uSpecular; // the specular reflectivity
     uniform float uShininess; // the specular exponent
     // geometry properties
     varying vec3 vWorldPos; // world xyz of fragment
     varying vec3 vVertexNormal; // normal of fragment
     void main(void) {
        
            // ambient term
            vec3 ambient = uAmbient*uLightAmbient; 
            
            // diffuse term
            vec3 normal = normalize(vVertexNormal); 
            vec3 light = normalize(uLightPosition - vWorldPos);
            float lambert = max(0.0,dot(normal,light));
            vec3 diffuse = uDiffuse*uLightDiffuse*lambert; // diffuse term
            
            // specular term
            vec3 eye = normalize(uEyePosition - vWorldPos);
            vec3 halfVec = normalize(light+eye);
            float highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
            vec3 specular = uSpecular*uLightSpecular*highlight; // specular term
            
            // combine to output color
            vec3 colorOut = ambient + diffuse + specular; // no specular yet
            gl_FragColor = vec4(colorOut, 1.0); 
        }
     `;
     try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader, fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution
        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader, vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for gpu execution
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context
            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram);
                shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
                gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
                //shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
                //gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
                shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
                shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
            }
        }
    } catch (e) {
        console.log(e);
    }*/

//}

// get the JSON file from the passed URL
function getJSONFile(url, descr) {
    try {
        if ((typeof (url) !== "string") || (typeof (descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET", url, false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now() - startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open " + descr + " file!";
            else
                return JSON.parse(httpReq.response);
        } // end if good params
    } // end try

    catch (e) {
        console.log(e);
        return (String.null);
    }
} // end get input json file

// From https://gist.github.com/guilhermepontes/17ae0cc71fa2b13ea8c20c94c5c35dc4
const shuffleArray = arr => arr
    .map(a => [Math.random(), a])
    .sort((a, b) => a[0] - b[0])
    .map(a => a[1]);


class gameGrid {

    #tiles_ = [];
    #linesToClear_ = [];
    #tilesAfterClear_ = [];
    #tile_;
    #nRows_;
    #nCols_;
    //Store current row and col states
    #row_;
    #col_;
    #ghostRow_; //Ghost is a predictor on how tile will be looks like
    rowsAbove_ = 2;

    constructor(row, col) {
        this.#nRows_ = row;
        this.#nCols_ = col;
        this.#tiles_ = new Array((row + this.rowsAbove_) * col);
        this.#tile_ = NaN;
    }

    /**
     * Clear the Game Board
     */
    clear() {
        this.#tiles_.fill(TileColor.NONE, 0, this.#tiles_.length);
    }

    // TileColor tileAt(int row, int col) const { return tiles_[(row + kRowsAbove_) * nCols + col]; };
    /**
     * Return tile at specific location
     * @param row
     * @param col
     * @returns {*}
     */
    tileAt = (row, col) => this.#tiles_[(row + this.rowsAbove_) * this.#nCols_ + col];


    checkGridOverflow() {
        let shape = this.#tile_.tileType();
        let belowTopGrid = false;
        let index = 0;
        for (let row = this.#row_; row < this.#row_ + this.#tile_.bBoxSide(); row++) {
            for (let col = this.#col_; col < this.#col_ + this.#tile_.bBoxSide(); ++col) {
                if (shape[index] != TileColor.NONE) {
                    if (row >= 0)
                        belowTopGrid = true;

                    this.setTile(row, col, shape[index]);
                }
                ++index;
            }
        }
        this.findLinesToClear();
        this.#tile_ = new Tile(TileType.NONE);
        return belowTopGrid;
    }

    /**
     *
     * @param typeOfTile
     * @returns {boolean}
     */
    generateTile(typeOfTile) {
        this.#tile_ = new Tile(typeOfTile);
        this.#row_ = -2;
        this.#col = (this.#nCols_ - this.#tile_.bBoxSide()) / 2;

        if (!this.checkPosition(this.#row_, this.#col_, this.#tile_))
            return false;

        let maxMoveDown = typeOfTile == TileType.I ? 1 : 2;
        for (let i = 0; i < maxMoveDown; ++i) {
            if (!this.checkPosition(this.#row_ + 1, this.#col_, this.#tile_))
                break;
            this.#row_++;
        }
        this.updateGhostRow();
        return true;

    }


    /**
     *
     * @param col
     * @returns {boolean}
     */
    moveHorizontal(col) {
        if (this.checkPosition(this.#row_, this.#col_ + col, this.#tile_)) {
            this.#col_ += col;
            this.updateGhostRow();
            return true;
        }

        return false;
    }

    /**
     *
     * @param row
     * @returns {boolean}
     */
    moveVertical(row) {
        if (this.checkPosition(this.#row_, this.#col_ + col, this.#tile_)) {
            this.#row_ += row;
            return true;
        }

        return false;
    }

    /**
     *
     * @param rotation Rotation degree default is 90
     * @param direct Clockwise > 0, CounterClockwise < 0
     * @returns {boolean}
     */
    rotate(rotation) {
        if (this.#tile_.tileType == TileType.O || this.#tile_.tileType == TileType.NONE)
            return false;

        let testPiece = new Tile(this.#tile_);
        testPiece.rotate(rotation);

        for (let kick in this.#tile_.kicks(rotation)) {
            // Potential flaw
            let row = kick[0];
            let col = kick[1]
            if (this.checkPosition(this.#row_ + row, this.#col_ + col, testPiece)) {
                this.#tile__ = testPiece;
                this.#row_ += row;
                this.#col_ += col;
                this.updateGhostRow();
                return true;
            }

        }

        return false;
    }

    /**
     *
     * @returns {number}
     */
    hardDrop() {
        let rowsPassed = this.#ghostRow_ - this.#row_;
        this.#row_ = this.#ghostRow_;
        return rowsPassed;
    }

    /**
     *
     */
    isOnGround() {
        return this.checkPosition(this.#row_ + 1, this.#col_, this.#tile_);
    }

    /**
     *
     * @returns {((chunk: any) => 1) | number | ((chunk: ArrayBufferView) => number) | GLint | string | QueuingStrategySizeCallback<T>}
     */
    numLinesToClear = () => this.#linesToClear_.size;

    /**
     *
     */
    clearLines() {
        if (!this.#linesToClear_) {
            this.#linesToClear_.length = 0;
            this.#tiles_ = this.#tilesAfterClear_;
        }
    }

    /**
     *
     * @returns {{}}
     */

    LinesToClear = () => this.#linesToClear_;

    /**
     *
     * @returns {*}
     */
    Tile = () => this.#tile_;

    /**
     *
     * @returns {*}
     */

    tileCol = () => this.#nCols_;

    /**
     *
     * @returns {*}
     */
    ghostRow = () => this.#ghostRow_;

//Private method
    /**
     *
     * @param row
     * @param col
     * @param tileColor
     */
    setTileOnBoard(row, col, tileColor) {
        this.#tiles_[(row + this.rowsAbove_) * this.#nCols_ + col] = tileColor;
    }

    /**
     *
     * @param row
     * @param col
     */
    isTileFilled(row, col) {
        if (col < 0 || col >= this.#nCols_ || row < -this.rowsAbove_ || row >= this.#nRows_)
            return true;

        return this.tileAt(row, col) != TileColor.NONE;
    }

    /**
     *
     * @param row
     * @param col
     * @param tile
     * @returns {boolean}
     */
    checkPosition(row, col, tile) {
        if (tile.tileType == TileType.NONE)
            return false;

        let shape = tile.shape();
        let index = 0;
        for (let i = 0; i < piece.bBoxSide(); i++) {
            for (let j = 0; j < piece.bBoxSide(); j++) {
                if (shape[index] != TileColor.NONE && this.isTileFilled(row + i, col + j))
                    return false;

                index++;
            }
        }

        return true;
    }

    /**
     *
     */
    updateGhostRow() {
        this.#ghostRow_ = this.#row_;
        while (this.checkPosition(this.#ghostRow_ + 1, this.#col_, this.#tile_))
            this.#ghostRow_++;
    }

    /**
     *
     */
    findLinesToClear() {
        this.#linesToClear_.length = 0;
        this.#tilesAfterClear_ = this.#tiles_;

        let linesCleared = 0;
        let index = this.#tiles_.length - 1;
        for (let i = this.#nRows_ - 1; i >= -this.rowsAbove_; i--) {
            let fullRow = true;
            for (let j = 0; j < this.#nCols_; ++j) {
                if (!this.isTileFilled(i, j)) {
                    fullRow = false;
                    break;
                }
            }

            if (fullRow) {
                this.#linesToClear_.push(i);
                linesCleared++;
                index -= this.#nCols_;
            } else if (linesCleared > 0) {
                let indexShift = linesCleared * this.#nCols_;
                for (let col = 0; col < this.#nCols_; ++col) {
                    this.#tilesAfterClear_[index + indexShift] = this.#tiles_[index];
                    index--;
                }
            } else {
                index -= this.#nCols_;
            }
        }

        this.#tilesAfterClear_.fill(TileColor.NONE, 0, this.#linesToClear_ * this.#nCols_);

    }

    setTile(row, col, color) {
        this.#tiles_[(row + this.rowsAbove_) * this.#nCols_s + col] = color;
    }
}

class Tetris {
    #linesToClearPerLevel_ = 10;
    #maxLevel_ = 15;
    #moveDelay_ = 0.05;
    #moveRepeatDelay_ = 0.15;
    #softDropSpeedFactor_ = 20;
    #lockDownTimeLimit_ = 0.4;
    #lockDownMovesLimit_ = 15;
    #pauseAfterLineClear_ = 0.3;


    #gameGrid_;

    //Flag for GG
    #gameOver_;

    #timePrecision_;

    #bag_;
    #nextTile_;
    #tileOnHold_;
    #canHold_;

    #level_;
    #linesCleared_;
    #score_;

    #secondsPerLine_;
    #moveDownTimer_;

    #motion_;
    #moveLeftPrev_;
    #moveRightPrev_;
    #moveRepeatDelayTimer_;
    #moveRepeatTimer_;

    #isOnGround_;
    #lockingTimer_;
    #nMovesWhileLocking_; //Number for locking tiles for moving

    #pausedForLinesClear_;
    #linesClearTimer_;

    constructor(gameGrid, timePrecision) {
        this.#gameGrid = gameGrid;
        this.#timePrecision_ = timePrecision;
        this.#bag_ = new Array(2 * NumPieces);
        this.#nextTile_ = new Tile(TileType.NONE);
        this.#tileOnHold_ = new Tile(TileType.NONE);

        for (let i = 0; i < 2; i++) {
            for (let type in TileType) {
                if (type == TileType.NONE) {
                    continue;
                }
                this.#bag_.push(type);
            }
        }


    }

    //Private methods
    checkLock() {
        if (!this.#gameGrid_.isOnGround()) {
            this.#isOnGround_ = false;
            return;
        }

        this.#isOnGround_ = true;

        if (this.#lockingTimer_ >= this.#lockDownTimeLimit_ || this.#nMovesWhileLocking_ >= this.#lockDownMovesLimit_)
            this.lock();
    }

    lock() {
        this.#lockingTimer_ = 0;
        this.#isOnGround_ = false;
        this.#canHold_ = true;

        if (!this.#gameGrid_.checkGridOverflow()) {
            this.#gameOver_ = true;
            return;
        }

        if (this.#gameGrid_.numLinesToClear() == 0) {
            this.spawnPiece();
            return;
        }

        this.#pausedForLinesClear_ = true;
        this.#linesClearTimer_ = 0;
    }

    spawnPiece() {
        this.#gameOver_ = !board_.spawnPiece(this.#bag_[this.#nextTile_]);
        this.#nextTile_++;
        if (this.#nextTile_ == NumPieces) {

            let tmp = this.#bag_.slice(NumPieces, this.#bag_.length);
            this.#bag_.splice(0, tmp.length, ...tmp);
            this.#bag = shuffleArray(this.#bag);


            this.#nextTile_ = 0;
        }
        this.#nMovesWhileLocking_ = 0;
    }

    updateScore(linesCleared) {
        let deltaScore = 0;
        switch (linesCleared) {
            case 1:
                deltaScore = 100;
                break;
            case 2:
                deltaScore = 300;
                break;
            case 3:
                deltaScore = 400;
                break;
            case 4:
                deltaScore = 800;
                break;
            default:
                assert(false);
        }
        this.#linesCleared_ += linesCleared;
        this.#score_ += deltaScore * level_;
        if (this.#level_ < this.#maxLevel_ && this.#linesCleared_ >= this.#linesToClearPerLevel_ * this.#level_) {
            this.#level_++;
            this.#secondsPerLine_ = this.secondsPerLineForLevel(this.#level_);
        }
    }

    secondsPerLineForLevel = (level) => Math.pow(0.8 - (level - 1) * 0.007, level - 1);

    //Public methods

    restart(level) {
        this.#gameGrid_.clear();
        this.#gameOver_ = false;
        this.#level_ = level;
        this.#secondsPerLine_ = this.secondsPerLineForLevel(level);
        this.#linesCleared_ = 0;
        this.#score_ = 0;
        this.#canHold_ = true;
        this.#motion_ = Motion.NONE;
        this.#moveLeftPrev_ = false;
        this.#moveRightPrev_ = false;
        this.#moveDownTimer_ = 0;
        this.#moveRepeatTimer_ = 0;
        this.#moveRepeatDelayTimer_ = 0;
        this.#isOnGround_ = false;
        this.#lockingTimer_ = 0;
        this.#pausedForLinesClear_ = false;
        this.#linesClearTimer_ = 0;

        //Shuffle array half and half
        let tmp;
        tmp = shuffleArray(this.#bag_.slice(0, NumPieces));
        this.#bag_.splice(0, tmp.length, ...tmp);
        tmp = shuffleArray(this.#bag_.slice(NumPieces, this.#bag_.length));
        this.#bag_.splice(NumPieces, tmp.length, ...tmp);

        let randomRange = NumPieces - 0;
        this.#tileOnHold_ = this.#bag_[Math.round(Math.random() * randomRange)];

        this.spawnPiece();
    };

    isGameOver = () => this.#gameOver_;

    /**
     * Pass the flags and do corresponding actions
     * @param softDrop Boolean
     * @param moveRight Boolean
     * @param moveLeft Boolean
     */
    update(softDrop, moveRight, moveLeft) {
        if (this.#pausedForLinesClear_) {
            this.#linesClearTimer_ += this.#timePrecision_;

            if (this.#linesClearTimer_ < this.#pauseAfterLineClear_)
                return;

            this.updateScore(this.#gameGrid_.numLinesToClear());
            this.#gameGrid_.clearLines();
            this.spawnPiece();
            this.#pausedForLinesClear_ = false;
        }

        this.#moveDownTimer_ += this.#timePrecision_;
        this.#moveRepeatTimer_ += this.#timePrecision_;
        this.#moveRepeatDelayTimer_ += this.#timePrecision_;

        if (this.#isOnGround_)
            this.#lockingTimer_ += this.#timePrecision_;
        else
            this.#lockingTimer_ = 0;

        let moveLeftInput = moveLeft;
        let moveRightInput = moveRight;

        if (moveLeft && moveRight) {
            if (!this.#moveRightPrev_)
                moveLeft = false;
            else if (!this.#moveLeftPrev_)
                moveRight = false;
            else if (this.#motion_ == Motion.LEFT)
                moveRight = false;
            else
                moveLeft = false;
        }

        if (moveRight) {
            if (this.#motion_ != Motion.RIGHT) {
                this.#moveRepeatDelayTimer_ = 0;
                this.#moveRepeatTimer_ = 0;
                this.moveHorizontal(1);
            } else if (this.#moveRepeatDelayTimer_ >= this.#moveRepeatDelay_ && this.#moveRepeatTimer_ >= this.#moveDelay_) {
                this.#moveRepeatTimer_ = 0;
                this.moveHorizontal(1);
            }
            this.#motion_ = Motion.RIGHT;
        } else if (moveLeft) {
            if (this.#motion_ != Motion.LEFT) {
                this.#moveRepeatDelayTimer_ = 0;
                this.#moveRepeatTimer_ = 0;
                this.moveHorizontal(-1);
            } else if (this.#moveRepeatDelayTimer_ >= this.#moveRepeatDelay_ && this.#moveRepeatTimer_ >= this.#moveDelay_) {
                this.#moveRepeatTimer_ = 0;
                this.moveHorizontal(-1);
            }
            this.#motion_ = Motion.LEFT;
        } else {
            this.#motion_ = Motion.NONE;
        }

        this.#moveLeftPrev_ = moveLeftInput;
        this.#moveRightPrev_ = moveRightInput;

        let speedFactor = softDrop ? this.#softDropSpeedFactor_ : 1;
        if (this.#moveDownTimer_ >= this.#secondsPerLine_ / speedFactor) {
            if (this.#gameGrid_.moveVertical(1) && softDrop)
                this.#score_ += this.#level_;
            this.#moveDownTimer_ = 0;
        }

        this.checkLock();
    }

    moveHorizontal(dCol) {
        if (this.#gameGrid_.moveHorizontal(dCol) && this.#isOnGround_) {
            this.#lockingTimer_ = 0;
            this.#nMovesWhileLocking_ += 1;
        }
    }


    rotate(rotation) {

        if (this.#gameGrid_.rotate(rotation) && this.#isOnGround_) {
            this.#lockingTimer_ = 0;
            this.#nMovesWhileLocking_++;
        }

        this.checkLock();

    }

    hardDrop() {
        if (this.#gameGrid_.tileType() == TileType.NONE)
            return;
        this.#score_ += 2 * this.#level_ * this.#gameGrid_.hardDrop();
        this.lock();
    }

    hold() {
        if (!this.#canHold_ || this.#pausedForLinesClear_)
            return;

        let curTile = this.#gameGrid_.tileType()   //tile().kind();
        this.#gameGrid_.spawnPiece(this.#tileOnHold_);
        this.#heldPiece_ = curTile;

        this.#canHold_ = false;
    }


    lockPercent = () => this.#lockingTimer_ / this.#lockDownTimeLimit_;


    isPausedForLinesClear = () => this.#pausedForLinesClear_;


    linesClearPausePercent = () => this.#linesClearTimer_ / this.#pauseAfterLineClear_;


    level = () => this.#level_;

    score = () => this.#score_;

    linesCleared = () => this.#linesCleared_;

    nextPiece = () => new Tile(this.#bag_[this.#nextTile_]);


    heldPiece = () => new Tile(this.#tileOnHold_);


}

//Block of a Tetris
class Tile {

    #tileType_; //Use defined enumerate Plz
    #tileColor_;
    #nStates_;
    #state_;
    #nRows_;
    #nCols_;
    #initialShape_ = []; //type: Color
    #shape_ = []; //type: Color
    #bBoxSide_;

    #kicksLeft_;
    #kicksRight_;

    const
    kicksIRight_ = [
        [[0, 0], [0, -2], [0, 1], [1, -2], [-2, 1]],
        [[0, 0], [0, -1], [0, 2], [-2, -1], [1, 2]],
        [[0, 0], [0, 2], [0, -1], [-1, 2], [2, -1]],
        [[0, 0], [0, 1], [0, -2], [2, 1], [-1, -2]]
    ];
    const
    kicksILeft_ = [
        [[0, 0], [0, -1], [0, 2], [-2, -1], [1, 2]],
        [[0, 0], [0, 2], [0, -1], [-1, 2], [2, -1]],
        [[0, 0], [0, 1], [0, -2], [2, 1], [-1, -2]],
        [[0, 0], [0, -2], [0, 1], [1, -2], [-2, 1]]
    ];
    const
    kicksOtherRight_ = [
        [[0, 0], [0, 1], [-1, -1], [2, 0], [2, -1]],
        [[0, 0], [0, 1], [1, 1], [-2, 0], [-2, 1]],
        [[0, 0], [0, 1], [-1, 1], [2, 0], [2, 1]],
        [[0, 0], [0, -1], [1, -1], [-2, 0], [-2, -1]]
    ];
    const
    kicksOtherLeft_ = [
        [[0, 0], [0, 1], [-1, 1], [2, 0], [2, 1]],
        [[0, 0], [0, -1], [1, 1], [-2, 0], [-2, 1]],
        [[0, 0], [0, -1], [-1, -1], [2, 0], [2, -1]],
        [[0, 0], [0, -1], [1, -1], [-2, 0], [-2, -1]]
    ];


    constructor(type) {
        this.#tileType_ = type;
        this.#tileColor_ = NaN;
        this.#kicksLeft_ = [];
        this.#kicksRight_ = [];
    }

    const
    tileType = () => this.#tileType_;
    const
    tileColor = () => this.#tileColor_;
    const
    nRow = () => this.#nRows_;
    const
    nCOl = () => this.#nCols_;
    const
    bBoxSide = () => this.#bBoxSide_;
    const
    initialShape = () => this.#initialShape_;
    const
    shape = () => this.#shape_;

    rotate(rotation) {
        if (this.#tileType_ == TileType.O)
            return;

        let newShape = new Array(this.#shape_.length);
        let index = 0;
        switch (rotation) {
            case Rotation.RIGHT:
                this.#state_ += 1;
                for (let col = this.#bBoxSide_ - 1; col >= 0; --col) {
                    for (let row = 0; row < this.#bBoxSide_; ++row) {
                        newShape[row * this.#bBoxSide_ + col] = this.#shape_[index];
                        ++index;
                    }
                }
                break;
            case Rotation.COUNTERCLOCKWISE:
                this.#state_ -= 1;
                for (let col = 0; col < this.#bBoxSide_; ++col) {
                    for (let i = this.#bBoxSide_ - 1; i >= 0; --i) {
                        newShape[i * this.#bBoxSide_ + col] = this.#shape_[index];
                        ++index;
                    }
                }
        }
        this.#shape_ = newShape;

        if (this.#state_ == -1)
            this.#state_ = NumStates_ - 1;
        else if (this.#state_ == NumStates_)
            this.#state_ = 0;

    }

    kicks(rotation) {
        switch (rotation) {
            case Rotation.CLOCKWISE:
                return this.#kicksRight_[this.#state_];
            case Rotation.COUNTERCLOCKWISE:
                return this.#kicksLeft_[this.#state_];
        }
    }

}

function twoByTwo() {
    this.pos = [0, 4, 0, 5, 1, 4, 1, 5];

    this.color = [];

    this.setColor = function (color) {
        this.color = color;
    }

    this.object = function () {
        for (var i = 0; i < 8; i++) {
            grid.setPlace(this.pos[i], this.pos[i + 1], true);
            i++;
        }
    }

    this.checkBottom = function () {
        var taken = false;
        if (grid.get((this.pos[4] + 1), this.pos[5], 4) || grid.get((this.pos[6] + 1), this.pos[7], 4)) {
            taken = true;
        }
        return taken;

    }

    this.objectGravity = function () {
        for (var i = 0; i < 8; i++) {
            grid.setPlace(this.pos[i], this.pos[i + 1], false);
            i++;
        }

        for (var i = 0; i < 8; i++) {
            oldPlace = this.pos[i];
            this.pos[i] = oldPlace + 1;
            grid.setPlace(this.pos[i], this.pos[i + 1], true);
            i++;
        }
    }

    this.checkLeft = function () {
        var taken = null;
        var position;
        var left = this.pos[1];
        var right = this.pos[7];

        if (left == 0 || right == 0) {
            taken = true;
            return taken;
        }

        if (left < right) {
            position = this.pos[1] - 1;
        }
        if (right < left) {
            position = this.pos[7] - 1;
        }

        if (position >= 0) {
            var a = grid.get(this.pos[0], position, 4);
            var b = grid.get(this.pos[4], position, 4);
            if (!a && !b) {
                taken = false;

            } else {
                taken = true;
            }
        }
        return taken;
    }

    this.checkRight = function () {
        var taken = null;
        var position;
        var left = this.pos[1];
        var right = this.pos[7];

        if (left == 9 || right == 9) {
            taken = true;
            return taken;
        }

        if (left > right) {
            position = this.pos[1] + 1;
        }
        if (right > left) {
            position = this.pos[7] + 1;
        }

        if (position <= 9) {
            var a = grid.get(this.pos[0], position, 4);
            var b = grid.get(this.pos[4], position, 4);
            if (!a && !b) {
                taken = false;

            } else {
                taken = true;
            }
        }
        return taken;
    }

    this.moveLeft = function () {
        if (!this.checkLeft()) {
            for (var i = 0; i < 8; i++) {
                grid.setPlace(this.pos[i], this.pos[i + 1], false);
                i++;
            }
            for (var i = 0; i < 8; i++) {
                --this.pos[i + 1];
                grid.setPlace(this.pos[i], this.pos[i + 1], true);
                i++;
            }
            posX -= 1;
        }
    }

    this.moveRight = function () {
        if (!this.checkRight()) {
            for (var i = 0; i < 8; i++) {
                grid.setPlace(this.pos[i], this.pos[i + 1], false);
                i++;
            }
            for (var i = 0; i < 8; i++) {
                ++this.pos[i + 1];
                grid.setPlace(this.pos[i], this.pos[i + 1], true);
                i++;
            }
            posX += 1;
        }
    }

    this.drop = function () {
        falling = true;

        var taken = false;
        var row = this.pos[4];
        var stop = row;
        var rowsLeft = 14 - row;
        for (var i = 1; rowsLeft >= 0 && !taken; --rowsLeft) {
            taken = grid.get((this.pos[4] + i), this.pos[5], 4);
            if (taken) {
                stop = this.pos[4] + i - 1;
            } else {
                taken = grid.get((this.pos[6] + i), this.pos[7], 4);
                if (taken) {
                    stop = this.pos[4] + i - 1;
                }
            }
            i++;
        }

        var rowsFallen = stop - row;
        for (var i = 0; i < 8; i++) {
            grid.setPlace(this.pos[i], this.pos[i + 1], false);
            i++;
        }

        this.pos[0] = stop - 1;
        this.pos[2] = stop - 1;
        this.pos[4] = stop;
        this.pos[6] = stop;

        for (var i = 0; i < 8; i++) {
            grid.setPlace(this.pos[i], this.pos[i + 1], true);
            i++;
        }
        posY -= rowsFallen;
        falling = false;
    }
}

function oneByFour() {
    this.pos = [0, 3, 0, 4, 0, 5, 0, 6];

    this.color = [];

    this.setColor = function (color) {
        this.color = color;
    }

    this.object = function () {
        for (var i = 0; i < 8; i++) {
            grid.setPlace(this.pos[i], this.pos[i + 1], true);
            i++;
        }
    }

    this.checkBottom = function () {
        var taken = false;
        if (rotateAngle == 90 || rotateAngle == -90 || rotateAngle == 270 || rotateAngle == -270) {
            check = grid.get((this.pos[i] + 1), this.pos[i + 1], 4);
            i++;
            if (check == true) {
                taken = true;
            }
        }
        if (rotateAngle == 0 || rotateAngle == -180 || rotateAngle == 180) {
            var p;
            var up = this.pos[0];
            var down = this.pos[6];
            if (up > down) {
                p = up;
            }
            if (down > up) {
                p = down;
            }

            if (p < 14 && !grid.get(down + 1, this.pos[1], 4)) {
                return false;
            } else {
                return true;
            }

        }
        return taken;
    }

    this.objectGravity = function () {
        for (var i = 0; i < 8; i++) {
            grid.setPlace(this.pos[i], this.pos[i + 1], false);
            i++;
        }

        for (var i = 0; i < 8; i++) {
            oldPlace = this.pos[i];
            this.pos[i] = oldPlace + 1;
            grid.setPlace(this.pos[i], this.pos[i + 1], true);
            i++;
        }
    }

    this.checkLeft = function () {
        if (rotateAngle == 90 || rotateAngle == -90 || rotateAngle == 270 || rotateAngle == -270) {
            var position;
            var left = this.pos[1];
            var right = this.pos[7];

            if (left == 0 || right == 0) {
                taken = true;
                return taken;
            }
            if (left < right) {
                position = this.pos[1] - 1;
            }
            if (right < left) {
                position = this.pos[7] - 1;
            }

            if (position >= 0) {
                taken = grid.get(this.pos[0], position, 4);
            }
        }
        if (rotateAngle == 0 || rotateAngle == -180 || rotateAngle == 180) {
            if ((this.pos[1] - 1) < 0) {
                taken = true;
            } else {
                var m = grid.get(this.pos[0], this.pos[1] - 1, 4);
                var j = grid.get(this.pos[2], this.pos[1] - 1, 4);
                var u = grid.get(this.pos[4], this.pos[1] - 1, 4);
                var t = grid.get(this.pos[6], this.pos[1] - 1, 4);

                if (!m && !j && !u && !t) {
                    taken = false;
                } else {
                    taken = true;
                }
            }
        }
        return taken;
    }

    this.checkRight = function () {
        if (rotateAngle == 90 || rotateAngle == -90 || rotateAngle == 270 || rotateAngle == -270) {
            var position;
            var left = this.pos[1];
            var right = this.pos[7];

            if (left == 9 || right == 9) {
                taken = true;
                return taken;
            }
            if (left > right) {
                position = this.pos[1] + 1;
            }
            if (right > left) {
                position = this.pos[7] + 1;
            }

            if (position <= 9) {
                taken = grid.get(this.pos[0], position, 4);
            }
        }
        if (rotateAngle == 0 || rotateAngle == -180 || rotateAngle == 180) {
            if ((this.pos[1] - 1) < 0) {
                taken = true;
            } else {
                var m = grid.get(this.pos[0], this.pos[1] - 1, 4);
                var j = grid.get(this.pos[2], this.pos[1] - 1, 4);
                var u = grid.get(this.pos[4], this.pos[1] - 1, 4);
                var t = grid.get(this.pos[6], this.pos[1] - 1, 4);

                if (!m && !j && !u && !t) {
                    taken = false;
                } else {
                    taken = true;
                }
            }
        }
        return taken;
    }

    this.moveLeft = function () {
        if (!this.checkLeft()) {
            for (var i = 0; i < 8; i++) {
                grid.setPlace(this.pos[i], this.pos[i + 1], false);
                i++;
            }
            for (var i = 0; i < 8; i++) {
                --this.pos[i + 1];
                grid.setPlace(this.pos[i], this.pos[i + 1], true);
                i++;
            }
            posX -= 1;
        }
    }

    this.moveRight = function () {
        if (!this.checkRight()) {
            for (var i = 0; i < 8; i++) {
                grid.setPlace(this.pos[i], this.pos[i + 1], false);
                i++;
            }
            for (var i = 0; i < 8; i++) {
                ++this.pos[i + 1];
                grid.setPlace(this.pos[i], this.pos[i + 1], true);
                i++;
            }
            posX += 1;
        }
    }

    this.drop = function () {
        falling = true;

        if (rotateAngle == 90 || rotateAngle == -90 || rotateAngle == 270 || rotateAngle == -270) {
            var taken = false;
            var row = this.pos[0];
            var stop = row;
            var rowsLeft = 14 - row;

            for (var i = 1; rowsLeft >= 0 && !taken; --rowsLeft) {
                for (var j = 0; j < 8 && !taken; j++) {
                    taken = grid.get((this.pos[j] + i), this.pos[j + 1], 4);
                    if (taken == true) {
                        stop = (this.pos[j] + i - 1);
                    }
                    j++;
                }
                i++;
            }
            var rowsFallen = stop - row;
            for (var i = 0; i < 8; i++) {
                grid.setPlace(this.pos[i], this.pos[i + 1], false);
                oldPlace = this.pos[i];
                this.pos[i] = stop;
                grid.setPlace(this.pos[i], this.pos[i + 1], true);
                i++;
            }
            posY -= rowsFallen;
        }

        if (rotateAngle == 0 || rotateAngle == -180 || rotateAngle == 180) {
            var taken = false;
            var position;
            var up = this.pos[0];
            var down = this.pos[6];
            if (up > down) {
                position = up;
            }
            if (down > up) {
                position = down;
            }
            var stopAt = position;

            var rowsLeft = 14 - position;
            for (var i = 1; rowsLeft >= 0 && !taken; --rowsLeft) {
                taken = grid.get(position + i, this.pos[1], 4);
                if (taken) {
                    stopAt = position + i - 1;
                }
                i++;
            }
            var rowsFallen = stopAt - position;
            for (var i = 0; i < 8; i++) {
                grid.setPlace(this.pos[i].this.pos[i + 1], false);
                i++;
            }
            var count = 0;
            for (var i = 0; i < 8; i++) {
                oldPlace = this.pos[i];
                this.pos[i] = stopAt - count;
                grid.setPlace(this.pos[i], this.pos[i + 1], true);
                i++;
                count++;
            }
            posY -= rowsFallen;
        }
    }

    this.rotate = function () {
        var taken = false;
        if (beforeRotate == 90 && this.pos[0] == 0 || beforeRotate == -90 && this.pos[0] == 0) {
            return false;
        } else if (beforeRotate == 0 && this.pos[1] == 0 || beforeRotate == 0 && this.pos[1] == 1 || beforeRotate == 0 && this.pos[1] == 8 || beforeRotate == 0 && this.pos[1] == 9 || beforeRotate == 180 && this.pos[1] == 0 || beforeRotate == 180 && this.pos[1] == 1 || beforeRotate == 180 && this.pos[1] == 8 || beforeRotate == 180 && this.pos[1] == 9 || beforeRotate == -180 && this.pos[1] == 0 || beforeRotate == -180 && this.pos[1] == 1 || beforeRotate == -180 && this.pos[1] == 8 || beforeRotate == -180 && this.pos[1] == 9) {
            return false;
        } else {
            for (var i = 0; i < 8; i++) {
                grid.setPlace(this.pos[i].this.pos[i + 1], false);
                i++;
            }

            if (beforeRotate == 90 || beforeRotate == -90) {
                taken = false;
                for (var i = 0; i < 8 && !taken; i++) {
                    for (var j = -1; j < 3 && !taken; j++) {
                        taken = grid.get(this.pos[i] + j, this.pos[i + 1], 4);

                    }
                    i++;
                }
            }
            for (var i = 0; i < 8; i++) {
                grid.setPlace(this.pos[i].this.pos[i + 1], true);
                i++;
            }
            return !taken;
        }
    }

    this.positonRotate = function () {
        var position1 = null;
        var position2 = null;

        var left = this.pos[1];
        var right = this.pos[7];

        if (left != right) {
            if (left < right) {
                position1 = 1;
            }
            if (right < left) {
                position1 = 7;
            }
        } else {
            var up = this.pos[0];
            var down = this.pos[6];

            if (up > down) {
                position2 = 0;
            }
            if (down > up) {
                position2 = 6;
            }
        }
        if (clockwise && (beforeRotate == 90 || beforeRotate == -90) || clockwise && (beforeRotate == 270 || beforeRotate == -270) || counterclock && beforeRotate == 0 || counterclock && (beforeRotate == 180 || beforeRotate == -180)) {
            for (var i = 0; i < 8; i++) {
                grid.setPlace(this.pos[i].this.pos[i + 1], false);
                i++;
            }

            this.pos[position1] += 2;
            this.pos[position1 - 1] -= 1;
            this.pos[position1 + 2] += 1;
            this.pos[position1 + 3] += 1;
            this.pos[position1 + 5] += 2;
            this.pos[position1 + 6] -= 1;

            for (var i = 0; i < 8; i++) {
                grid.setPlace(this.pos[i].this.pos[i + 1], true);
                i++;
            }

        }

    }
}

function tetrimon() {
    var tetri = Math.floor(Math.random() * Math.floor(2));

    if (tetri == 0) {
        current = new twoByTwo();
        tetriType = "twoByTwo";
    } else {
        current = new oneByFour();
        tetriType = "oneByFour";
    }
}

// Reference https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
function loadTexture(img_url) {
    var img_path = img_url;
    var Texture = gl.createTexture();
    Texture.image = new Image();
    Texture.image.onload = function () {
        const level = 0;
        const internalFormat = gl.RGBA;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        gl.bindTexture(gl.TEXTURE_2D, Texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, Texture.image);
        if (isPowerOf2(Texture.image.width) && isPowerOf2(Texture.image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    Texture.image.crossOrigin = "Anonymous";
    Texture.image.src = img_path;
    return Texture;
}


function game() {
    r = Math.random();
    g = Math.random();
    b = Math.random();

    r2 = r + .4;
    g2 = g + .4;
    b2 = b + .4;

    tetrimon();

    current.object();

}

function initialGame(){
    let sauce = getJSONFile(" https://github.ncsu.edu/ncpage/CSC481-Tetris/blob/master/resource/officialTexture.json", officialTextureSource);

    for (let key in TileType) {
        if (TileType[key] == -1)
            continue;
        lockedTextures[TileType[key]] = loadTexture(sauce.locked[TileType[key]]);
        ghostTextures[TileType[key]] = loadTexture(sauce.ghost[TileType[key]]);
        normalTextures[TileType[key]]= loadTexture(sauce.normal[TileType[key]]);
    }

    grid = new gameGrid(GridNumRows, GridNumCols);
    tetri = new Tetris(grid, GameTimePrecision)
}

function render(){

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.enable(gl.BLEND);

    let projection = mat4.create();
	
	switch(curGameState)
	{
		//const GameState = {Start: 1, Run: 2, Paused: 3, End: 4};
		case GameState.Run:
			renderTiles(board);
			if(isPausedForLinesClear())
			{
				clearLinesAnimation(board, linesClearPausePercent());
			}
			else 
			{
				renderGhost(piece(), ghostRow(), col_);
				renderPiece(piece(), ghostRow(), col_, lockPercent());
			}
			break;
		case GameState.Paused:
		{
			renderTiles(board, .4);
			renderPiece(piece(), row_, col_, 0, .4);
			var y = BoardY + .38 * GridHeight;
			
			renderCentered("PAUSED", BoardX, y, GridWidth, white);
			
			y = BoardY + .5 * GridHeight;
			
			var xName = BoardX +.1 * GridWidth;
			//var xIcon = BoardX +.9 * GridWidth;
			
			//var Align = .5 * (Arr
			textRender("Press Escape To Unpause", xName, y, white);
			
			y += 5.5 * letterHeight;
			
			textRender("Press Enter To Go To The Start Screen", xName, y, white);
			
			break;
		case GameState.start:
		{
			var y = BoardY + .05 + GridHeight;
			
			renderCentered("Press Enter To Start", BoardX, y, GridWidth, white);
			break;
			
		}
		case GameState.End:
		{
			renderTiles(board, .4);
			
			var y = BoardY + .05 + GridHeight;
			
			renderCentered("Press Enter To Continue", BoardX, y, GridWidth, white);
									
		}
			
			
		}
	}


}


function handleKey(event, action) {
// The key are same as official Tetris'
    if (CurGameState == GameState.Run) {
        if (action == KeyAction.PRESS) {

            switch (event.code) {
                case "Space": //Hard drop
                    tetri.hardDrop();
                    break;
                case "ArrowRight": // Move right
                    moveRight = true;
                    break;
                case "ArrowLeft": // Move left
                    moveLeft = true;
                    break;
                case "ArrowUp": // Rotate right
                    tetri.rotate(Rotation.CLOCKWISE);
                    break;
                case "ArrowDown": // Soft drop
                    softDrop = true;
                    break;
                case "KeyZ": //Rotate left
                    tetri.rotate(Rotation.COUNTERCLOCKWISE);
                case "KeyC": //Hold
                    tetri.hold();
                    break;
                case"Escape": //Pause the game
                    CurGameState = GameState.Paused;
                    break;
            }

        } else if (action == KeyAction.RELEASE) {
            switch (event.code) {
                case "ArrowRight": // Move right
                    moveRight = false;
                    break;
                case "ArrowLeft": // Move left
                    moveLeft = false;
                    break;
                case "ArrowDown": // Soft drop
                    softDrop = false;
                    break;
            }
        } else if (CurGameState == GameState.Paused) {
            if (event.code == "Escape" && action == KeyAction.PRESS)
                CurGameState = GameState.Run;
            else if (event.code == "Enter" && action == KeyAction.PRESS)
                CurGameState = GameState.Start;
        } else if (CurGameState == GameState.Start) {
            if (event.code == "Enter" && action == KeyAction.PRESS) {
                moveRight = false;
                moveLeft = false;
                softDrop = false;
                tetri.restart(startLevel);
                CurGameState = GameState.Run;
            } else if (event.code == "ArrowUp" && action == KeyAction.PRESS) {
                startLevel = Math.min(15, startLevel + 1);
            } else if (event.code == "ArrowDown" && action == KeyAction.PRESS) {
                startLevel = Math.max(1, startLevel - 1);
            }
        } else if (CurGameState == GameState.End) {
            if (event.code == "Enter" && action == KeyAction.PRESS)
                CurGameState = GameState.Start;
        }
    }
}


function main() {

    initialGame();
    setupWebGL(); // set up the webGL environment
    shaders(); //sets up shaders
    shader();
    render();

}