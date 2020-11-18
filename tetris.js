var gl;

function setupWebGL() {

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
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL


function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}


var shaderProgram;

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}


var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}


function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


function degToRad(degrees) {
    return degrees * Math.PI / 180;
}


var currentlyPressedKeys = {};

function handleKeyDown(event) {
    currentlyPressedKeys[event.keyCode] = true;

    if (String.fromCharCode(event.keyCode) == "F") {
        filter += 1;
        if (filter == 3) {
            filter = 0;
        }
    }
}


function handleKeyUp(event) {
    currentlyPressedKeys[event.keyCode] = false;
}


var rotate_clockwise = false;
var rotate_counterclock = false;
var falling = false;
var rotating = false;

function handleKeys() {
    if (currentlyPressedKeys[49] && !rotating) {
        // Number One
        if( currentObject.rotationAllowed() ){
            rotate_counterclock = true;
            rotating = true;
        }
        currentlyPressedKeys[49] = false;
    }
    if (currentlyPressedKeys[51] && !rotating) {
        // Number Three
        if( currentObject.rotationAllowed() ){
            rotate_clockwise = true;
            rotating = true;
        }
        currentlyPressedKeys[51] = false;
    }
    if (currentlyPressedKeys[37] || currentlyPressedKeys[65]) {
        // Left cursor key or a
        currentObject.moveObjectLeft();
        currentlyPressedKeys[37] = false;
        currentlyPressedKeys[65] = false;
    }
    if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
        // Right cursor key or d
        currentObject.moveObjectRight();
        currentlyPressedKeys[39] = false;
        currentlyPressedKeys[68] = false;
    }
    if (currentlyPressedKeys[38] || currentlyPressedKeys[87]) {
        // Up cursor key or w
        switchGravityOff();
        falling = false;
        //positionY_tetrimon += 1;
        currentlyPressedKeys[38] = false;
        currentlyPressedKeys[87] = false;
    }
    if ( ( currentlyPressedKeys[40] && !falling ) || ( currentlyPressedKeys[83] && !falling) ) {
        // Down cursor key or s
        if( !gravityIsOn ){
            switchGravityOn();
            gravitySpeed = 0.0;
        }else{
            currentObject.dropTetrimon();
        }
        //positionY_tetrimon -= 1;
        currentlyPressedKeys[40] = false;
        currentlyPressedKeys[83] = false;
    }
}


var rotationTrace = 0;
var rotationSpeed = 5000;
var rotationFixed = 90;
function rotateObject( timeElapsed ) {
    var change = degToRad( rotationSpeed );
    if ( rotationTrace <= 90 ){
       if ( rotate_clockwise ){
         rotate_tetrimon -= ( change * timeElapsed ) / 1000.0;
         rotationTrace += ( change * timeElapsed ) / 1000.0;
       }
       if ( rotate_counterclock ){
         rotate_tetrimon += ( change * timeElapsed ) / 1000.0;
         rotationTrace += ( change * timeElapsed ) / 1000.0;
       }
    }else{

      /*round
      if( rotate_tetrimon > 80 && rotate_tetrimon < 110 ) rotate_tetrimon = 90;
      if( rotate_tetrimon > 170 && rotate_tetrimon < 190 ) rotate_tetrimon = 180;
      if( rotate_tetrimon > 260 && rotate_tetrimon < 280 ) rotate_tetrimon = 270;
      if( rotate_tetrimon > 350 ) rotate_tetrimon = 0;
      if( rotate_tetrimon < -80 && rotate_tetrimon > -110 ) rotate_tetrimon = -90;
      if( rotate_tetrimon < -170 && rotate_tetrimon > -190 ) rotate_tetrimon = -180;
      if( rotate_tetrimon < -260 && rotate_tetrimon > -280 ) rotate_tetrimon = -270;
      if( rotate_tetrimon < -350 ) rotate_tetrimon = 0;
      if( rotate_tetrimon > -10 && rotate_tetrimon < 10 ) rotate_tetrimon = 0;
      */

      if( rotate_clockwise ){
          if( rotationFixed - 90 == -360 ) rotationFixed = 0;
          else rotationFixed -= 90;
      }
      if( rotate_counterclock ) {
          if( rotationFixed + 90 == 360 ) rotationFixed = 0;
          else rotationFixed += 90;
      }
      //console.log("rotation");
      //console.log( rotationFixed );
      //console.log( rotate_tetrimon );
      rotate_tetrimon = rotationFixed;


      currentObject.posRotateToGrid();
      tetrimon_beforeRotation = rotate_tetrimon;
      rotate_clockwise = false;
      rotate_counterclock = false;
      rotating = false;
      rotationTrace = 0;

      //console.log( "rotation: ", rotate_tetrimon );
    }
}


var gravityIsOn = false;

function switchGravityOn() {
    gravityIsOn = true;
    setGravitySpeed();
    gravityTimeElapsed = ( new Date().getTime() / 1000 );
}

function switchGravityOff() {
    gravityIsOn = false;
}

var gravSpeed = 1.0;
function setGravitySpeed( speed ) {
    if( speed != undefined) gravitySpeed = speed;
    else gravitySpeed = gravSpeed;
}


var score = 0;
var somethingDestroyed;

function checkIfRowFull(){/*
    //get every row that is occupied by the dropped element, but just once
    var posTetrimon = currentObject.getObjectGridPosition();
    var usedRows = [];
    usedRows.push( posTetrimon[0], posTetrimon[2], posTetrimon[4], posTetrimon[6] );
    for( var i = 0; i < usedRows.length; ++i ){
        for( var j = ( i + 1 ); j < usedRows.length; ++j ){
            if( usedRows[ i ] == usedRows[ j ] ){
              ////console.log("splieced ", i, j);
              usedRows.splice( j, 1 );
              j = i;
            }
        }
    }
    //save currentTetrimon to the grid
    currentTetrimonColor = currentObject.getColor();
    currentTetrimonColor = currentTetrimonColor.concat( true );
    for( var i = 0; i < 8; ++i ){
      grid.setBlock( currentObject.getObjectGridPosition()[ i ], currentObject.getObjectGridPosition()[ i + 1 ], currentTetrimonColor );
      ++i;
    }
    //check if these rows are full
    var fullRows = [];
    while( usedRows.length != 0 ){
        var activeRow = usedRows.pop();
        ////console.log("testIfRow " + activeRow + " is full!");
        //var occupied = [];
        var rowIsFull = true;
        for( var i = 0; i < 10 && rowIsFull; ++i ){
            //occupied.push( grid.getBlock( activeRow, i, 4 ) );
            rowIsFull = grid.getBlock( activeRow, i, 4 );
            ////console.log( activeRow, i, rowIsFull );
        }
        if( rowIsFull ){
            ++score;
            document.getElementById("score").innerHTML = "Score: " + score.toString();
            fullRows.push( activeRow );
        }
    }
    //destroy full rows and fill destroyed lines
    amountOfFullRows = fullRows.length;
    if( fullRows.length == 0) somethingDestroyed = false;
    while( fullRows.length != 0 ){
        //console.log("movingArround");
        ////grid.getInfoOccupation();
        somethingDestroyed = true;
        var activeRow = fullRows.pop();
        var content = [ 0.0, 0.0, 0.0, 1.0, false ];
        for( ; activeRow >= 0; --activeRow ){
            if( activeRow == 0 ){
                for( var i = 0; i < 10; ++i ){
                    grid.setBlock( activeRow, i, content );
                }
            }
            else{
                rowAbove = grid.getRow( activeRow - 1 );
                grid.setRow( activeRow, rowAbove );
            }
        }
    }
    if( somethingDestroyed ) initBuffers();
    //console.log("afterRowCheckFull");
    ////grid.getInfoOccupation();
*/
}


var gravitySpeed;
var gravityTimeElapsed = ( new Date().getTime() / 1000 );

function gravity() {
  if( gravityIsOn ){
    var timeNow = ( new Date().getTime() / 1000 );
    gravitySpeed -= ( timeNow - gravityTimeElapsed );
    gravityTimeElapsed = timeNow;
    if ( gravitySpeed <= 0 ){
        if( currentObject.checkIfBottomOccupied() ){
            //console.log("collision");
            checkIfRowFull();
            makeNewTetrimon();
            setGravitySpeed();
        }else{
            currentObject.moveObjectGravity();
            positionY_tetrimon -= 1;
            setGravitySpeed();
            //grid.getInfoOccupation();
        }
    }
  }
}


function gridArray() {
    //create grid array
    this.blocks = new Array(16); //y-axis; last row is bottom and always occupied, but invisible
    for ( var i = 0; i < this.blocks.length; ++i ){
        this.blocks[ i ] = new Array(10);
        for ( var j = 0; j < this.blocks[ i ].length; ++j ){ //x-axis
            this.blocks[ i ][ j ] = [ redGrid, greenGrid, blueGrid, 1.0, false ];
            //this.blocks[ i ][ j ] = false;
            //if( i == 3 && j == 2 ) this.blocks[ i ][ j ] = [ 1.0, 0.0, 0.0, 1.0, true ];
            //if( i == 1 && j == 1 ) this.blocks[ i ][ j ] = [ 0.0, 1.0, 0.0, 1.0, true ];
            //if( i == 7 && j == 4 ) this.blocks[ i ][ j ] = [ 0.0, 0.0, 1.0, 1.0, true ];

        }
    }

    //make all bottom blocks true
    for ( var j = 0; j < this.blocks[ 15 ].length; ++j ){
        this.blocks[ 15 ][ j ] = [ 0.0, 0.0, 1.0, 1.0, true ];
    }

    this.getInfo = function() {
        for ( var i = 0; i < this.blocks.length; ++i ){
            console.log(
              i + ": " +
              "|" +
              this.blocks[ i ][ 0 ].toString() + " | " +
              this.blocks[ i ][ 1 ].toString() + " | " +
              this.blocks[ i ][ 2 ].toString() + " | " +
              this.blocks[ i ][ 3 ].toString() + " | " +
              this.blocks[ i ][ 4 ].toString() + " | " +
              this.blocks[ i ][ 5 ].toString() + " | " +
              this.blocks[ i ][ 6 ].toString() + " | " +
              this.blocks[ i ][ 7 ].toString() + " | " +
              this.blocks[ i ][ 8 ].toString() + " | " +
              this.blocks[ i ][ 9 ].toString() + " | "
            );
        }
        console.log();
    }

    this.getInfoOccupation = function() {
        for ( var i = 0; i < this.blocks.length; ++i ){
            console.log(
              i + ": " +
              "|" +
              this.blocks[ i ][ 0 ][ 4 ].toString() + " | " +
              this.blocks[ i ][ 1 ][ 4 ].toString() + " | " +
              this.blocks[ i ][ 2 ][ 4 ].toString() + " | " +
              this.blocks[ i ][ 3 ][ 4 ].toString() + " | " +
              this.blocks[ i ][ 4 ][ 4 ].toString() + " | " +
              this.blocks[ i ][ 5 ][ 4 ].toString() + " | " +
              this.blocks[ i ][ 6 ][ 4 ].toString() + " | " +
              this.blocks[ i ][ 7 ][ 4 ].toString() + " | " +
              this.blocks[ i ][ 8 ][ 4 ].toString() + " | " +
              this.blocks[ i ][ 9 ][ 4 ].toString() + " | "
            );
        }
        console.log();
    }

    this.setBlock = function( i, j, content ) {
        this.blocks[ i ][ j ] = content;
    }

    this.setBlockOccupied = function( i, j, occupied ){
        this.blocks[ i ][ j ][ 4 ] = occupied;
    }

    this.getBlock = function( x, y, color ){
        return this.blocks[ x ][ y ][ color ];
    }

    this.getRow = function( row ){
        return this.blocks[ row ];
    }

    this.setRow = function( row, content ){
        this.blocks[ row ] = content;
    }
}


var gameOver = false;
function makeNewTetrimon() {
    switchGravityOff();
    rotate_tetrimon = 90;
    rotationFixed = 90;
    tetrimon_beforeRotation = 90;
    falling = false;

    //check if game is over
    for( var i = 3; i < 7 && !gameOver; ++i ){
        gameOver = grid.getBlock( 0, i, 4 );
    }
    ////console.log("gameOver: ", gameOver);

    if( !gameOver ){

        //save arrived tetrimon to grid array
        if( !somethingDestroyed ){
          currentTetrimonColor = currentObject.getColor();
          currentTetrimonColor = currentTetrimonColor.concat( true );
          for( var i = 0; i < 8; ++i ){
            grid.setBlock( currentObject.getObjectGridPosition()[ i ], currentObject.getObjectGridPosition()[ i + 1 ], currentTetrimonColor );
            ++i;
          }
        }
        //////grid.getInfo();

        positionX_tetrimon = 5.0;
        positionY_tetrimon = 6.5;
        positionZ_tetrimon = -20.0;
        typeOfCurrentTetrimon();
        currentObject.initObject();
        initBuffers();

        switchGravityOn();
    }
    ////console.log("newTetrimon");
    ////console.log(currentObject.getObjectGridPosition());
    //////grid.getInfoOccupation();
}


function one_x_four() {
    //startposition in the grid
    //it is implemented horizontal
    this.objectGridPosition = [ //y,x
        0, 3,
        0, 4,
        0, 5,
        0, 6
      ];
    //saves the value of 4 vertices
    this.objectColor = [];

    this.setColor = function( setColor ) {
        this.objectColor = setColor;
    }

    this.getColor = function(){
        return this.objectColor;
    }

    this.getObjectGridPosition = function() {
        return this.objectGridPosition;
    }

    this.initObject = function() {
        ////console.log("before init 1x4");
        ////grid.getInfoOccupation();
        for ( var i = 0; i < 8; ++i ){
            grid.setBlockOccupied( this.objectGridPosition[ i ], this.objectGridPosition[ i + 1 ], true );
            ////console.log("THE init 1x4", i);
            ////grid.getInfoOccupation();
            ++i;
        }
        ////console.log("init 1x4");
        ////grid.getInfoOccupation();
    }

    this.checkIfBottomOccupied = function() {
        var occupied = false;

        //horizontal
        if ( rotate_tetrimon == 90 || rotate_tetrimon == 270 || rotate_tetrimon == -90 || rotate_tetrimon == -270 ){
            for ( var i = 0; i < 8; ++i ){
                occupiedOneBlock = grid.getBlock( ( this.objectGridPosition[ i ] + 1 ), this.objectGridPosition[ i + 1 ], 4 );
                ////console.log( (this.objectGridPosition[ i ] + 1), this.objectGridPosition[ i + 1], "!!!!");
                ++i;
                if( occupiedOneBlock == true ) occupied = true;
            }
        }

        //vertical
        if ( rotate_tetrimon == 0 || rotate_tetrimon == 180 || rotate_tetrimon == -180 ){
          var posDown;
          var minUp = this.objectGridPosition[ 0 ];
          var minDown = this.objectGridPosition[ 6 ];
          if( minUp > minDown ) posDown = this.objectGridPosition[ 0 ];
          if( minDown > minUp ) posDown = this.objectGridPosition[ 6 ];

          if( posDown < 14 && !grid.getBlock( posDown + 1, this.objectGridPosition[ 1 ], 4 ) ){
              return false;
          }else{
              return true;
          }

        }

        return occupied;
    }

    this.moveObjectGravity = function() {
        for ( var i = 0; i < 8; ++i ){
            grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], false );
            ++i;
        }
        for ( var i = 0; i < 8; ++i ){
            oldGridPos = this.objectGridPosition[ i ];
            this.objectGridPosition[ i ] = oldGridPos + 1;
            grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], true );
            ++i;
        }
        //////grid.getInfoOccupation();
    }

    this.checkIfLeftIsOccupied = function() {
        var occupied = null;

        //horizontal
        if ( rotate_tetrimon == 90 || rotate_tetrimon == 270 || rotate_tetrimon == -90 || rotate_tetrimon == -270 ){
            var min, posLeft;
            var minLeft = this.objectGridPosition[ 1 ];
            var minRight = this.objectGridPosition[ 7 ];

            if ( minLeft == 0 || minRight == 0 ) return ( occupied = true );

            if( minLeft < minRight ) posLeft = ( this.objectGridPosition[ 1 ] - 1 );
            if( minRight < minLeft ) posLeft = ( this.objectGridPosition[ 7 ] - 1 );

            if ( posLeft >= 0 ) {
              occupied = grid.getBlock( this.objectGridPosition[ 0 ], posLeft, 4  ); //y,x,occupation
            }
        }

        //vertical
        if ( rotate_tetrimon == 0 || rotate_tetrimon == 180 || rotate_tetrimon == -180 ){
            if( ( this.objectGridPosition[ 1 ] - 1 ) < 0 ) occupied = true;
            else{
                var one = grid.getBlock( this.objectGridPosition[ 0 ], this.objectGridPosition[ 1 ] - 1, 4 );
                var two = grid.getBlock( this.objectGridPosition[ 2 ], this.objectGridPosition[ 1 ] - 1, 4 );
                var three = grid.getBlock( this.objectGridPosition[ 4 ], this.objectGridPosition[ 1 ] - 1, 4 );
                var four = grid.getBlock( this.objectGridPosition[ 6 ], this.objectGridPosition[ 1 ] - 1, 4 );

                if( !one && !two && !three && !four) occupied = false;
                else occupied = true;
            }
        }


        return occupied;
    }

    this.checkIfRightIsOccupied = function() {
        var occupied = null;

        //horizontal
        if ( rotate_tetrimon == 90 || rotate_tetrimon == 270 || rotate_tetrimon == -90 || rotate_tetrimon == -270 ){
            var max, posRight;
            var maxLeft = this.objectGridPosition[ 1 ];
            var maxRight = this.objectGridPosition[ 7 ];

            if ( maxLeft == 9 || maxRight == 9 ) return ( occupied = true );

            if( maxLeft > maxRight ) posRight = ( this.objectGridPosition[ 1 ] + 1 );
            if( maxRight > maxLeft ) posRight = ( this.objectGridPosition[ 7 ] + 1 );

            if ( posRight <= 9 ) {
              occupied = grid.getBlock( this.objectGridPosition[ 0 ], posRight, 4  ); //y,x,occupation
            }
        }

        //vertical
        if ( rotate_tetrimon == 0 || rotate_tetrimon == 180 || rotate_tetrimon == -180 ){
            if( ( this.objectGridPosition[ 1 ] + 1 ) > 9 ) occupied = true;
            else{
                var one = grid.getBlock( this.objectGridPosition[ 0 ], this.objectGridPosition[ 1 ] + 1, 4 );
                var two = grid.getBlock( this.objectGridPosition[ 2 ], this.objectGridPosition[ 1 ] + 1, 4 );
                var three = grid.getBlock( this.objectGridPosition[ 4 ], this.objectGridPosition[ 1 ] + 1, 4 );
                var four = grid.getBlock( this.objectGridPosition[ 6 ], this.objectGridPosition[ 1 ] + 1, 4 );

                if( !one && !two && !three && !four) occupied = false;
                else occupied = true;
            }
        }

        return occupied;
    }

    this.moveObjectLeft = function() {

        if( !this.checkIfLeftIsOccupied() ){
          for ( var i = 0; i < 8; ++i ){
              grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], false );
              ++i;
          }
          for( var i = 0; i < 8; ++i ){
              --this.objectGridPosition[ i + 1];
              grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], true );
              ++i;
          }
          positionX_tetrimon -= 1;
          ////console.log( this.objectGridPosition );
          //////grid.getInfoOccupation();
        }
        ////grid.getInfoOccupation();
    }

    this.moveObjectRight = function() {

        if( !this.checkIfRightIsOccupied() ){
          for ( var i = 0; i < 8; ++i ){
              grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], false );
              ++i;
          }
          for( var i = 0; i < 8; ++i ){
              ++this.objectGridPosition[ i + 1];
              grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], true );
              ++i;
          }
          positionX_tetrimon += 1;
          ////console.log( this.objectGridPosition );
          //////grid.getInfoOccupation();
        }
        ////grid.getInfoOccupation();
    }

    this.dropTetrimon = function() {
        falling = true;

        var dropUntilLine = 0;

        //horizontal
        if ( rotate_tetrimon == 90 || rotate_tetrimon == 270 || rotate_tetrimon == -90 || rotate_tetrimon == -270 ){

            //check rows below
            var occupied = false;
            var row = this.objectGridPosition[ 0 ];
            var fallUntilRow = row;
            var rowsTillBottom = 14 - row;
            for ( var j = 1; rowsTillBottom >= 0 && !occupied; --rowsTillBottom ){
                for ( var i = 0 ; i < 8 && !occupied; ++i ){
                    occupied = grid.getBlock( ( this.objectGridPosition[ i ] + j ), this.objectGridPosition[ i + 1 ], 4 );
                    ////console.log(this.objectGridPosition[ i ] + j, this.objectGridPosition[ i + 1 ], occupied);
                    if( occupied == true ) {
                        fallUntilRow = ( this.objectGridPosition[ i ] + j - 1 );
                    }
                    ++i;
                }
                ++j;
            }

            //dropTetrimon
            var numberOfFallenRows = fallUntilRow - row;
            for ( var i = 0; i < 8; ++i ){
                grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], false );
                oldGridPos = this.objectGridPosition[ i ];
                this.objectGridPosition[ i ] = fallUntilRow;
                grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], true );
                ++i;
            }
            ////console.log(this.objectGridPosition);
            positionY_tetrimon -= numberOfFallenRows;
            ////grid.getInfoOccupation();

        }

        //vertical
        if ( rotate_tetrimon == 0 || rotate_tetrimon == 180 || rotate_tetrimon == -180 ){
            var occupied = false;

            //search block on the bottom of tetrimon
            var posDown;
            var minUp = this.objectGridPosition[ 0 ];
            var minDown = this.objectGridPosition[ 6 ];
            if( minUp > minDown ) posDown = this.objectGridPosition[ 0 ];
            if( minDown > minUp ) posDown = this.objectGridPosition[ 6 ];
            var fallUntilRow = posDown;

            //check till where blocks below are free
            var rowsTillBottom = 14 - posDown;
            for( var i = 1; rowsTillBottom >= 0 && !occupied; --rowsTillBottom ){
                occupied = grid.getBlock( posDown + i, this.objectGridPosition[ 1 ], 4 );
                if( occupied == true ) {
                    fallUntilRow = posDown + i - 1;
                }
                ++i;
            }
            //console.log(fallUntilRow);


            //dropTetrimon
            var numberOfFallenRows = fallUntilRow - posDown;
            for ( var i = 0; i < 8; ++i ){
                grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], false );
                ++i;
            }
            var j = 0;
            for ( var i = 0; i < 8; ++i ){
                oldGridPos = this.objectGridPosition[ i ];
                this.objectGridPosition[ i ] = fallUntilRow - j;
                grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], true );
                ++i;
                ++j;
            }

            positionY_tetrimon -= numberOfFallenRows;
            //console.log("ATER DROP");
            //grid.getInfoOccupation();

        }//end if
    }//end this.dropTetrimon()

    this.rotationAllowed = function() {
        var occupied = false;

        //check if one_x_four is in the first row
        if( tetrimon_beforeRotation == 90 && this.objectGridPosition[ 0 ] == 0
            || tetrimon_beforeRotation == -90 && this.objectGridPosition[ 0 ] == 0
            ){

            return false;

        //check if one_x_four is too close to game border left or right
        }else if( tetrimon_beforeRotation == 0 && this.objectGridPosition[ 1 ] == 0
                  ||tetrimon_beforeRotation == 0 && this.objectGridPosition[ 1 ] == 1
                  ||tetrimon_beforeRotation == 0 && this.objectGridPosition[ 1 ] == 8
                  ||tetrimon_beforeRotation == 0 && this.objectGridPosition[ 1 ] == 9
                  ||tetrimon_beforeRotation == 180 && this.objectGridPosition[ 1 ] == 0
                  ||tetrimon_beforeRotation == 180 && this.objectGridPosition[ 1 ] == 1
                  ||tetrimon_beforeRotation == 180 && this.objectGridPosition[ 1 ] == 8
                  ||tetrimon_beforeRotation == 180 && this.objectGridPosition[ 1 ] == 9
                  ||tetrimon_beforeRotation == -180 && this.objectGridPosition[ 1 ] == 0
                  ||tetrimon_beforeRotation == -180 && this.objectGridPosition[ 1 ] == 1
                  ||tetrimon_beforeRotation == -180 && this.objectGridPosition[ 1 ] == 8
                  ||tetrimon_beforeRotation == -180 && this.objectGridPosition[ 1 ] == 9
                  ){

            return false;

        //check space around tetrimon
        }else{

            //delete tetrimon from grid
            for( var i = 0; i < 8; ++i ){
                grid.setBlockOccupied( this.objectGridPosition[ i ], this.objectGridPosition[ i + 1 ], false);
                ++i;
            }

            //check 4 x 4 field of possible rotations
            if( tetrimon_beforeRotation == 90 || tetrimon_beforeRotation == -90 ){
                occupied = false;
                for( var i = 0; i < 8 && !occupied; ++i ){
                    for( var j = -1; j < 3 && !occupied; ++j ){
                        occupied = grid.getBlock( this.objectGridPosition[ i ] + j, this.objectGridPosition[ i + 1 ], 4  );
                    }
                    ++i;
                }
            }

            //put tetrimon back to grid
            for( var i = 0; i < 8; ++i ){
                grid.setBlockOccupied( this.objectGridPosition[ i ], this.objectGridPosition[ i + 1 ], true);
                ++i;
            }

            return !occupied;

        }
    }

    this.posRotateToGrid = function() {
      var posLeft = null;
      var posUp = null;

      //find the block most left or up
      var minLeft = this.objectGridPosition[ 1 ];
      var minRight = this.objectGridPosition[ 7 ];
      if( minLeft != minRight ){
          if( minLeft < minRight ) posLeft = 1;
          if( minRight < minLeft ) posLeft = 7;
      }else{
          var minUp = this.objectGridPosition[ 0 ];
          var minDown = this.objectGridPosition[ 6 ];
          if( minUp > minDown ) posUp = 0;
          if( minDown > minUp ) posUp = 6;
      }
/*
      ////console.log( posLeft, posUp, tetrimon_beforeRotation );
      //the rotation in the if, is the rotationDegree wicht the tetrimon has AFTER the rotation
      if( rotate_counterclock && ( tetrimon_beforeRotation == 90 || tetrimon_beforeRotation == -90)
          || rotate_clockwise && ( tetrimon_beforeRotation == 270 || tetrimon_beforeRotation == -270)
          || rotate_clockwise && tetrimon_beforeRotation == 0
          || rotate_clockwise && ( tetrimon_beforeRotation == 180 || tetrimon_beforeRotation == -180) ){
            //console.log("ROTATION 1");
            //console.log(tetrimon_beforeRotation);
          //delete tetrimon from grid
          for( var i = 0; i < 8; ++i ){
              grid.setBlockOccupied( this.objectGridPosition[ i ], this.objectGridPosition[ i + 1 ], false);
              ++i;
          }
          this.objectGridPosition = [ //y,x
              2, 3,
              2, 4,
              2, 5,
              2, 6
            ];
          //console.log(this.objectGridPosition);
          //console.log(this.objectGridPosition[ posLeft ]);
          //compute new tetrimonPosition and save it to grid
          //left
          this.objectGridPosition[ posLeft - 1 ] += 2;//two down
          this.objectGridPosition[ posLeft ] += 1; //one right
          //leftmiddle
          this.objectGridPosition[ posLeft + 1 ] += 1;//one down
          this.objectGridPosition[ posLeft + 2 ] += 0;//no x move
          //rightmiddle
          this.objectGridPosition[ posLeft + 3 ] -= 0;//no x move
          this.objectGridPosition[ posLeft + 4 ] -= 1;//one left
          //right
          this.objectGridPosition[ posLeft + 5 ] -= 1;//one up
          this.objectGridPosition[ posLeft + 6 ] -= 2;//two left
          //console.log(this.objectGridPosition);
          for( var i = 0; i < 8; ++i ){
              grid.setBlockOccupied( this.objectGridPosition[ i ], this.objectGridPosition[ i + 1 ], true);
              ++i;
          }
      }*/

      if( rotate_clockwise && ( tetrimon_beforeRotation == 90 || tetrimon_beforeRotation == -90)
          || rotate_clockwise && ( tetrimon_beforeRotation == 270 || tetrimon_beforeRotation == -270)
          || rotate_counterclock && tetrimon_beforeRotation == 0
          || rotate_counterclock && ( tetrimon_beforeRotation == 180 || tetrimon_beforeRotation == -180) ){
          //delete tetrimon from grid
          for( var i = 0; i < 8; ++i ){
              grid.setBlockOccupied( this.objectGridPosition[ i ], this.objectGridPosition[ i + 1 ], false);
              ++i;
          }

          //console.log("ROTATION 2");
          //console.log(tetrimon_beforeRotation);

          ////console.log(this.objectGridPosition);

          //compute new tetrimonPosition and save it to grid
          //left
          this.objectGridPosition[ posLeft ] += 2; //two right
          this.objectGridPosition[ posLeft - 1 ] -= 1;//one up
          //leftmiddle
          this.objectGridPosition[ posLeft + 2 ] += 1;//one right
          //rightmiddle
          this.objectGridPosition[ posLeft + 3 ] += 1;//one down
          //right
          this.objectGridPosition[ posLeft + 5 ] += 2;//two down
          this.objectGridPosition[ posLeft + 6 ] -= 1;//one left

          ////console.log(this.objectGridPosition);

          for( var i = 0; i < 8; ++i ){
              grid.setBlockOccupied( this.objectGridPosition[ i ], this.objectGridPosition[ i + 1 ], true);
              ++i;
          }
      }// end if


      ////console.log("afterRotateToGrid()");
      //grid.getInfoOccupation();


    }

}//end one_x_four


function two_x_two() {
    //startposition in the grid
    this.objectGridPosition = [ //y,x
        0, 4,
        0, 5,
        1, 4,
        1, 5
      ];
    //saves the value of 4 vertices
    this.objectColor = [];

    this.setColor = function( setColor ) {
        this.objectColor = setColor;
    }

    this.getColor = function(){
        return this.objectColor;
    }

    this.getObjectGridPosition = function() {
        return this.objectGridPosition;
    }

    this.initObject = function() {
        for ( var i = 0; i < 8; ++i ){
            grid.setBlockOccupied( this.objectGridPosition[ i ], this.objectGridPosition[ i + 1 ], true );
            ++i;
        }
    }

    this.checkIfBottomOccupied = function() {
        var occupied = false;
        if( grid.getBlock( (this.objectGridPosition[ 4 ] + 1), this.objectGridPosition[ 5 ], 4 ) ){
            occupied = true;
        }
        if( grid.getBlock( (this.objectGridPosition[ 6 ] + 1), this.objectGridPosition[ 7 ], 4 ) ){
            occupied = true;
        }
        return occupied;
    }

    this.moveObjectGravity = function() {
        for ( var i = 0; i < 8; ++i ){
            grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], false );
            ++i;
        }
        for ( var i = 0; i < 8; ++i ){
            oldGridPos = this.objectGridPosition[ i ];
            this.objectGridPosition[ i ] = oldGridPos + 1;
            grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], true );
            ++i;
        }
    }

    this.checkIfLeftIsOccupied = function() {
        var occupied = null;
        var min, posLeft;
        var minLeft = this.objectGridPosition[ 1 ];
        var minRight = this.objectGridPosition[ 7 ];

        if ( minLeft == 0 || minRight == 0 ) return ( occupied = true );

        if( minLeft < minRight ) posLeft = ( this.objectGridPosition[ 1 ] - 1 );
        if( minRight < minLeft ) posLeft = ( this.objectGridPosition[ 7 ] - 1 );

        if ( posLeft >= 0 ) {
          var one = grid.getBlock( this.objectGridPosition[ 0 ], posLeft, 4  ); //y,x,occupation
          var two = grid.getBlock( this.objectGridPosition[ 4 ], posLeft, 4  ); //y,x,occupation
          if( !one && !two ) occupied = false;
          else occupied = true;
        }

        return occupied;
    }

    this.checkIfRightIsOccupied = function() {
        var occupied = null;
        var max, posRight;
        var maxLeft = this.objectGridPosition[ 1 ];
        var maxRight = this.objectGridPosition[ 7 ];

        if ( maxLeft == 9 || maxRight == 9 ) return ( occupied = true );

        if( maxLeft > maxRight ) posRight = ( this.objectGridPosition[ 1 ] + 1 );
        if( maxRight > maxLeft ) posRight = ( this.objectGridPosition[ 7 ] + 1 );

        if ( posRight <= 9 ) {
          var one = grid.getBlock( this.objectGridPosition[ 0 ], posRight, 4  ); //y,x,occupation
          var two = grid.getBlock( this.objectGridPosition[ 4 ], posRight, 4  ); //y,x,occupation
          if( !one && !two ) occupied = false;
          else occupied = true;
        }

        return occupied;
    }

    this.moveObjectLeft = function() {

        if( !this.checkIfLeftIsOccupied() ){
          for ( var i = 0; i < 8; ++i ){
              grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], false );
              ++i;
          }
          for( var i = 0; i < 8; ++i ){
              --this.objectGridPosition[ i + 1];
              grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], true );
              ++i;
          }
          positionX_tetrimon -= 1;
          ////console.log( this.objectGridPosition );
          //////grid.getInfoOccupation();
        }
    }

    this.moveObjectRight = function() {

        if( !this.checkIfRightIsOccupied() ){
          for ( var i = 0; i < 8; ++i ){
              grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], false );
              ++i;
          }
          for( var i = 0; i < 8; ++i ){
              ++this.objectGridPosition[ i + 1];
              grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], true );
              ++i;
          }
          positionX_tetrimon += 1;
          ////console.log( this.objectGridPosition );
          //////grid.getInfoOccupation();
        }
    }

    this.dropTetrimon = function() {
        falling = true;

        var dropUntilLine = 0;

        //check rows below
        var occupied = false;
        var row = this.objectGridPosition[ 4 ];
        var fallUntilRow = row;
        var rowsTillBottom = 14 - row;
        for ( var j = 1; rowsTillBottom >= 0 && !occupied; --rowsTillBottom ){
            occupied = grid.getBlock( ( this.objectGridPosition[ 4 ] + j ), this.objectGridPosition[ 5 ], 4 );
            ////console.log(this.objectGridPosition[ 4 ] + j, this.objectGridPosition[ 5 ], occupied);
            if( occupied == true ) {
                fallUntilRow = ( this.objectGridPosition[ 4 ] + j - 1 );
            }else{
              occupied = grid.getBlock( ( this.objectGridPosition[ 6 ] + j ), this.objectGridPosition[ 7 ], 4 );
              if( occupied == true ) {
                  fallUntilRow = ( this.objectGridPosition[ 4 ] + j - 1 );
              }
            }
            ++j;
        }

        //dropTetrimon
        var numberOfFallenRows = fallUntilRow - row;
        for ( var i = 0; i < 8; ++i ){
            grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], false );
            ++i;
        }
        this.objectGridPosition[ 0 ] = fallUntilRow - 1;
        this.objectGridPosition[ 2 ] = fallUntilRow - 1;
        this.objectGridPosition[ 4 ] = fallUntilRow;
        this.objectGridPosition[ 6 ] = fallUntilRow;
        for ( var i = 0; i < 8; ++i ){
            grid.setBlockOccupied( ( this.objectGridPosition[ i ] ), this.objectGridPosition[ i + 1 ], true );
            ++i;
        }
        ////console.log(this.objectGridPosition);
        positionY_tetrimon -= numberOfFallenRows;
        //////grid.getInfoOccupation();


        falling = false;
    }

    this.rotationAllowed = function() {
        return true;
    }

    this.posRotateToGrid = function() {
        //do nothing here, cause nothing changes :)
    }

}//end two_x_two


var one_x_fourVertexPositionBuffer;
var one_x_fourVertexColorBuffer;
var two_x_twoPositionBuffer;
var two_x_twoColorBuffer;

var redBg;
var greenBg;
var blueBg;
var redGrid;
var greenGrid;
var blueGrid;

function initBuffers() {

    //ONE X FOUR OBJECT
    if( tetrimonType == "one_x_four" ){
      one_x_fourVertexPositionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, one_x_fourVertexPositionBuffer);
      var vertices = [
          0.0, -2.0,  0.0,
          1.0, -2.0,  0.0,
          0.0,  2.0,  0.0,
          1.0,  2.0,  0.0
      ];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      one_x_fourVertexPositionBuffer.itemSize = 3;
      one_x_fourVertexPositionBuffer.numItems = 4;

      one_x_fourVertexColorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, one_x_fourVertexColorBuffer);
      var red = Math.random();
      var green = Math.random();
      var blue = Math.random();
      currentObject.setColor([red, green, blue, 1.0]);
      colors = []
      for (var i=0; i < 4; i++) {
          colors = colors.concat([red, green, blue, 1.0]);
      }
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
      one_x_fourVertexColorBuffer.itemSize = 4;
      one_x_fourVertexColorBuffer.numItems = 4;
    }


    //TWO X TWO OBJECT
    if ( tetrimonType == "two_x_two" ){
      two_x_twoPositionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, two_x_twoPositionBuffer);
      vertices = [
           1.0,  1.0,  0.0,
          -1.0,  1.0,  0.0,
           1.0, -1.0,  0.0,
          -1.0, -1.0,  0.0
          ];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      two_x_twoPositionBuffer.itemSize = 3;
      two_x_twoPositionBuffer.numItems = 4;

      two_x_twoColorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, two_x_twoColorBuffer);
      red = Math.random();
      green = Math.random();
      blue = Math.random();
      currentObject.setColor([red, green, blue, 1.0]);
      colors = []
      for (var i=0; i < 4; i++) {
          colors = colors.concat([red, green, blue, 1.0]);
      }
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
      two_x_twoColorBuffer.itemSize = 4;
      two_x_twoColorBuffer.numItems = 4;
    }


    //BACKGROUND
    bgPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bgPositionBuffer);
    vertices = [
         100.0,  100.0,  0.0,
        -100.0,  100.0,  0.0,
         100.0, -100.0,  0.0,
        -100.0, -100.0,  0.0
        ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    bgPositionBuffer.itemSize = 3;
    bgPositionBuffer.numItems = 4;

    bgColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bgColorBuffer);
    colors = []
    for (var i = 0; i < 4; ++i) {
        colors = colors.concat([redBg, greenBg, blueBg, 1.0]);
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    bgColorBuffer.itemSize = 4;
    bgColorBuffer.numItems = 4;


    //GRID BLOCKS
    gridBlocksOnePositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBlocksOnePositionBuffer);
    vertices = []
      for( var y = 0.0; y > -15; --y ){
        var z = 0.0;
        for( var x = 0.0; x < 10; ++x ){
            vertices = vertices.concat([
              x,        y,        z,
              x,        (y + 1),  z,
              (x + 1),  y,        z,
              (x + 1),  (y + 1),  z,
            ]);
            //the next if-statement prevents drawing a triangle from the end of the row
            //to the beginning of the next row by drawing it behind the current row
            if( x == 9 ) vertices = vertices.concat([ x - 9, y + 1, z - 0.5,]);
          }
        }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gridBlocksOnePositionBuffer.itemSize = 3;
    gridBlocksOnePositionBuffer.numItems = 614; //plus one for every new row, for triangle hiding

    gridBlocksOneColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBlocksOneColorBuffer);
    colors = []
    for( var y = 0; y < 15; ++y ){
      for( var x = 0; x < 10; ++x ){
        for( var fourVertices = 0; fourVertices < 4; ++fourVertices){
          colors = colors.concat([
          grid.getBlock(y,x,0),
          grid.getBlock(y,x,1),
          grid.getBlock(y,x,2),
          grid.getBlock(y,x,3),
          ]);
        }
        //the next if-statement prevents drawing a triangle from the end of the row
        //to the beginning of the next row by drawing it behind the current row
        if( x == 9 ) {
          colors = colors.concat([
          grid.getBlock(y,x,0),
          grid.getBlock(y,x,1),
          grid.getBlock(y,x,2),
          grid.getBlock(y,x,3),
          ]);
        }
      }
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gridBlocksOneColorBuffer.itemSize = 4;
    gridBlocksOneColorBuffer.numItems = 120;
}


var rotate_tetrimon = 90;
var tetrimon_beforeRotation = rotate_tetrimon;
var positionX_tetrimon = 5.0;
var positionY_tetrimon = 6.5;
var positionZ_tetrimon = -20.0;
var gameSize = 45;

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(gameSize, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    mat4.identity(mvMatrix);


    //DRAW ONE X FOUR
    if ( tetrimonType == "one_x_four"){
        mvPushMatrix();

        mat4.translate(mvMatrix, [positionX_tetrimon, positionY_tetrimon, positionZ_tetrimon]);

        mat4.rotate(mvMatrix, degToRad(rotate_tetrimon), [0, 0, 1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, one_x_fourVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, one_x_fourVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, one_x_fourVertexColorBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, one_x_fourVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

        setMatrixUniforms();
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, one_x_fourVertexPositionBuffer.numItems);

        mvPopMatrix();
    }


    //DRAW TWO X TWO
    if ( tetrimonType == "two_x_two"){
        mvPushMatrix();

        mat4.translate(mvMatrix, [positionX_tetrimon, positionY_tetrimon, positionZ_tetrimon]);

        mat4.rotate(mvMatrix, degToRad(rotate_tetrimon), [0, 0, 1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, two_x_twoPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, two_x_twoPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, two_x_twoColorBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, two_x_twoColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

        setMatrixUniforms();
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, two_x_twoPositionBuffer.numItems);

        mvPopMatrix();
    }


    //DRAW BACKGROUND
    mvPushMatrix();

    mat4.translate(mvMatrix, [0, 0, -30.1]);

    gl.bindBuffer(gl.ARRAY_BUFFER, bgPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, bgPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, bgColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, bgColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, bgPositionBuffer.numItems);

    mvPopMatrix();


    //DRAW GRID ARRAY
    mvPushMatrix();

    mat4.translate(mvMatrix, [ 0.0, 6.5, -20.01]);

    gl.bindBuffer(gl.ARRAY_BUFFER, gridBlocksOnePositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, gridBlocksOnePositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, gridBlocksOneColorBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, gridBlocksOneColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, gridBlocksOnePositionBuffer.numItems);

    mvPopMatrix();

}


function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function makeGameSmaller() {
    gameSize += 10;
}


function makeGameBigger() {
    gameSize -= 10;
}


var level = 5;
function makeGameSlower() {
    if( level > 0 ){
        gravSpeed += 0.2;
        --level;
        document.getElementById("level").innerHTML = "Level: " + level.toString() + " " +
        "<button type=\"button\" onclick=\"makeGameSlower()\"> - </button>" + " " +
        "<button type=\"button\" onclick=\"makeGameFaster()\"> + </button>";
    }
}


function makeGameFaster() {
        gravSpeed -= 0.2;
        ++level;
        document.getElementById("level").innerHTML = "Level: " + level.toString() + " " +
        "<button type=\"button\" onclick=\"makeGameSlower()\"> - </button>" + " " +
        "<button type=\"button\" onclick=\"makeGameFaster()\"> + </button>";
}


var tetrimonType;
//var tetrimonType = "one_x_four";
function typeOfCurrentTetrimon() {
    type = getRandomNumber(0,1);

    if( type == 0){
    currentObject = new two_x_two();
    tetrimonType = "two_x_two";
    }

    if( type == 1){
    currentObject = new one_x_four();
    tetrimonType = "one_x_four";
    }
}


function initGame() {
    redBg = Math.random();
    greenBg = Math.random();
    blueBg = Math.random();
    redGrid = redBg + 0.4;
    greenGrid = greenBg + 0.4;
    blueGrid = blueBg + 0.4;

    setGravitySpeed();
    grid = new gridArray();

    typeOfCurrentTetrimon();
    //currentObject = new one_x_four();
    currentObject.initObject();

    //////grid.getInfoOccupation();
}



var lastTime = 0;
function animate() {

  gravity();

  var timeNow = new Date().getTime();
  if (lastTime != 0) {
    var elapsed = timeNow - lastTime;

    rotateObject( elapsed );

  }
  lastTime = timeNow;

}


function tick() {
    if( !gameOver ){
        requestAnimFrame(tick);
        handleKeys();
        drawScene();
        animate();
    }else{
        window.alert("Game Over!");
    }
}


function main() {
    
    setupWebGL();
    initShaders();
    initGame();
    initBuffers();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    tick();
}