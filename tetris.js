var gl = null;
var current;
var tetri;
var tetriType;
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

var clockwise = false;
var counterclock = false;
var rotating = false;
var falling = false;

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

function shaders()
{
	// define vertex shader in essl using es6 template strings
    var vShaderCode = `
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
        gl.shaderSource(fShader,fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for gpu execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader,vShaderCode); // attach code to shader
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
	}
	catch(e){
		console.log(e);
	}
	
}

function gameGrid()
{
	this.game = new Array(16);
	for(var i = 0; i < this.game.length; i++)
	{
		this.game[i] = new Array(10);
		for(var j = 0; j < this.game[i].length; j++)
		{
			this.game[i][j] = [r2, g2, b2, 1.0, false];
		}
	}
	this.set = function(i, j, block)
	{
		this.game[i][j] = block;
	}
	
	this.setPlace = function(i, j, taken)
	{
		this.game[i][j][4] = taken;
	}
	
	this.get = function(i, j, blocks)
	{
		return this.game[x][y][blocks];
	}
}

function twoByTwo()
{
	this.pos = [0 ,4, 0, 5, 1, 4, 1, 5];
	
	this.color = [];
	
	this.setColor = function(color)
	{
		this.color = color;
	}
	
	this.object = function()
	{
		for(var i = 0; i < 8; i++)
		{
			grid.setPlace(this.pos[i], this.pos[i + 1], true);
			i++;
		}
	}
	
	this.checkBottom = function()
	{
		var taken = false;
		if( grid.get((this.pos[4] + 1), this.pos[5], 4) || grid.get((this.pos[6] + 1), this.pos[7], 4))
		{
			taken = true;
		}
		return taken;
		
	}
	
	this.objectGravity = function()
	{
		for(var i = 0; i < 8; i++)
		{
			grid.setPlace(this.pos[i], this.pos[i + 1], false);
			i++;
		}
		
		for(var i = 0; i < 8; i++)
		{
			oldPlace = this.pos[i];
			this.pos[i] = oldPlace + 1;
			grid.setPlace(this.pos[i], this.pos[i + 1], true);
			i++;
		}
	}
	
	this.checkLeft = function()
	{
		var taken = null;
		var position;
		var left = this.pos[1];
		var right = this.pos[7];
		
		if(left == 0 || right == 0)
		{
			taken = true;
			return taken;
		}
		
		if(left < right)
		{
			position = this.pos[1] - 1;
		}
		if(right < left)
		{
			position = this.pos[7] - 1;
		}
		
		if(position >= 0)
		{
			var a = grid.get(this.pos[0], position, 4);
			var b = grid.get(this.pos[4], position, 4);
			if(!a && !b)
			{
				taken = false;
				
			}
			else 
			{
				taken = true;
			}
		}
		return taken;
	}
	
	this.checkRight = function()
	{
		var taken = null;
		var position;
		var left = this.pos[1];
		var right = this.pos[7];
		
		if(left == 9 || right == 9)
		{
			taken = true;
			return taken;
		}
		
		if(left > right)
		{
			position = this.pos[1] + 1;
		}
		if(right > left)
		{
			position = this.pos[7] + 1;
		}
		
		if(position <= 9)
		{
			var a = grid.get(this.pos[0], position, 4);
			var b = grid.get(this.pos[4], position, 4);
			if(!a && !b)
			{
				taken = false;
				
			}
			else 
			{
				taken = true;
			}
		}
		return taken;
	}
	
	this.moveLeft = function()
	{
		if(!this.checkLeft())
		{
			for(var i = 0; i < 8; i++)
			{
				grid.setPlace(this.pos[i], this.pos[i + 1], false);
				i++;
			}
			for(var i = 0; i < 8; i++)
			{
				--this.pos[i + 1];
				grid.setPlace(this.pos[i], this.pos[i + 1], true);
				i++;
			}
			posX -= 1;
		}
	}
	
	this.moveRight = function()
	{
		if(!this.checkRight())
		{
			for(var i = 0; i < 8; i++)
			{
				grid.setPlace(this.pos[i], this.pos[i + 1], false);
				i++;
			}
			for(var i = 0; i < 8; i++)
			{
				++this.pos[i + 1];
				grid.setPlace(this.pos[i], this.pos[i + 1], true);
				i++;
			}
			posX += 1;
		}
	}
	
	this.drop = function()
	{
		falling = true;
		
		var taken = false;
		var row = this.pos[4];
		var stop = row;
		var rowsLeft = 14 - row;
		for(var i = 1; rowsLeft >= 0 && !taken; --rowsLeft)
		{
			taken = grid.get((this.pos[4] + i), this.pos[5], 4);
			if(taken)
			{
				stop = this.pos[4] + i - 1;
			} else
			{
				taken = grid.get((this.pos[6] + i), this.pos[7], 4);
				if(taken)
				{
					stop = this.pos[4] + i - 1;
				}
			}
			i++;
		}
		
		var rowsFallen = stop - row;
		for(var i = 0; i < 8; i++)
		{
			grid.setPlace(this.pos[i], this.pos[i + 1], false);
			i++;
		}
		
		this.pos[0] = stop - 1;
		this.pos[2] = stop - 1;
		this.pos[4] = stop;
		this.pos[6] = stop;
		
		for(var i = 0; i < 8; i++)
		{
			grid.setPlace(this.pos[i], this.pos[i + 1], true);
			i++;
		}
		posY -= rowsFallen;
		falling = false;
	}
}

function oneByFour()
{
	this.pos = [0 ,3, 0, 4, 0, 5, 0, 6];
	
	this.color = [];
	
	this.setColor = function(color)
	{
		this.color = color;
	}
	
	this.object = function()
	{
		for(var i = 0; i < 8; i++)
		{
			grid.setPlace(this.pos[i], this.pos[i + 1], true);
			i++;
		}
	}
	
	this.checkBottom = function()
	{
		var taken = false;
		if(rotateAngle == 90 || rotateAngle == -90 || rotateAngle == 270 || rotateAngle == -270)
		{
			check = grid.get((this.pos[i] + 1), this.pos[i + 1], 4);
			i++;
			if(check == true)
			{
				taken = true;
			}
		}
		if(rotateAngle == 0 || rotateAngle == -180 || rotateAngle == 180)
		{
			var p;
			var up = this.pos[0];
			var down = this.pos[6];
			if(up > down)
			{
				p = up;
			}
			if(down > up) 
			{
				p = down;
			}
			
			if(p < 14 && !grid.get(down + 1, this.pos[1], 4))
			{
				return false;
			}
			else 
			{
				return true;
			}
			
		}
		return taken;
	}
	
	this.objectGravity = function()
	{
		for(var i = 0; i < 8; i++)
		{
			grid.setPlace(this.pos[i], this.pos[i + 1], false);
			i++;
		}
		
		for(var i = 0; i < 8; i++)
		{
			oldPlace = this.pos[i];
			this.pos[i] = oldPlace + 1;
			grid.setPlace(this.pos[i], this.pos[i + 1], true);
			i++;
		}
	}
	
	this.checkLeft = function()
	{
		if(rotateAngle == 90 || rotateAngle == -90 || rotateAngle == 270 || rotateAngle == -270)
		{
			var position;
			var left = this.pos[1];
			var right = this.pos[7];
			
			if(left == 0 || right == 0)
			{
				taken = true;
				return taken;
			}
			if(left < right)
			{
				position = this.pos[1] - 1;
			}	
			if(right < left)
			{
				position = this.pos[7] - 1;
			}
			
			if(position >= 0)
			{
				taken = grid.get(this.pos[0], position, 4);
			}
		}
		if(rotateAngle == 0 || rotateAngle == -180 || rotateAngle == 180)
		{
			if((this.pos[1] - 1) < 0)
			{
				taken = true;
			}
			else
			{
				var m = grid.get(this.pos[0], this.pos[1] - 1, 4);
				var j = grid.get(this.pos[2], this.pos[1] - 1, 4);
				var u = grid.get(this.pos[4], this.pos[1] - 1, 4);
				var t = grid.get(this.pos[6], this.pos[1] - 1, 4);
				
				if(!m && !j && !u && !t)
				{
					taken = false;
				}
				else
				{
					taken = true;
				}
			}
		}		
		return taken;
	}
	
	this.checkRight = function()
	{
		if(rotateAngle == 90 || rotateAngle == -90 || rotateAngle == 270 || rotateAngle == -270)
		{
			var position;
			var left = this.pos[1];
			var right = this.pos[7];
			
			if(left == 9 || right == 9)
			{
				taken = true;
				return taken;
			}
			if(left > right)
			{
				position = this.pos[1] + 1;
			}	
			if(right > left)
			{
				position = this.pos[7] + 1;
			}
			
			if(position <= 9)
			{
				taken = grid.get(this.pos[0], position, 4);
			}
		}
		if(rotateAngle == 0 || rotateAngle == -180 || rotateAngle == 180)
		{
			if((this.pos[1] - 1) < 0)
			{
				taken = true;
			}
			else
			{
				var m = grid.get(this.pos[0], this.pos[1] - 1, 4);
				var j = grid.get(this.pos[2], this.pos[1] - 1, 4);
				var u = grid.get(this.pos[4], this.pos[1] - 1, 4);
				var t = grid.get(this.pos[6], this.pos[1] - 1, 4);
				
				if(!m && !j && !u && !t)
				{
					taken = false;
				}
				else
				{
					taken = true;
				}
			}
		}		
		return taken;
	}
	
	this.moveLeft = function()
	{
		if(!this.checkLeft())
		{
			for(var i = 0; i < 8; i++)
			{
				grid.setPlace(this.pos[i], this.pos[i + 1], false);
				i++;
			}
			for(var i = 0; i < 8; i++)
			{
				--this.pos[i + 1];
				grid.setPlace(this.pos[i], this.pos[i + 1], true);
				i++;
			}
			posX -= 1;
		}
	}
	
	this.moveRight = function()
	{
		if(!this.checkRight())
		{
			for(var i = 0; i < 8; i++)
			{
				grid.setPlace(this.pos[i], this.pos[i + 1], false);
				i++;
			}
			for(var i = 0; i < 8; i++)
			{
				++this.pos[i + 1];
				grid.setPlace(this.pos[i], this.pos[i + 1], true);
				i++;
			}
			posX += 1;
		}
	}
	
	this.drop = function()
	{
		falling = true;
		
		if(rotateAngle == 90 || rotateAngle == -90 || rotateAngle == 270 || rotateAngle == -270)
		{
			var taken = false;
			var row = this.pos[0];
			var stop = row;
			var rowsLeft = 14 - row;
			
			for(var i = 1; rowsLeft >= 0 && !taken; --rowsLeft)
			{
				for(var j = 0; j < 8 && !taken; j++)
				{
					taken = grid.get((this.pos[j] + i), this.pos[j + 1], 4);
					if(taken == true)
					{
						stop = (this.pos[j] + i - 1);
					}
					j++;
				}
				i++;
			}
			var rowsFallen = stop - row;
			for(var i = 0; i < 8; i++)
			{
				grid.setPlace(this.pos[i], this.pos[i + 1], false);
				oldPlace = this.pos[i];
				this.pos[i] = stop;
				grid.setPlace(this.pos[i], this.pos[i+1], true);
				i++;
			}
			posY -= rowsFallen;
		}
		
		if(rotateAngle == 0 || rotateAngle == -180 || rotateAngle == 180)
		{
			var taken = false;
			var position;
			var up = this.pos[0];
			var down = this.pos[6];
			if(up > down)
			{
				position = up;
			}
			if(down > up)
			{
				position = down;
			}
			var stopAt = position;
			
			var rowsLeft = 14 - position;
			for(var i = 1; rowsLeft >= 0 && !taken; --rowsLeft)
			{
				taken = grid.get(position + i, this.pos[1], 4);
				if(taken)
				{
					stopAt = position + i - 1;
				}
				i++;
			}
			var rowsFallen = stopAt - position;
			for(var i = 0; i < 8; i++)
			{
				grid.setPlace(this.pos[i]. this.pos[i+1], false);
				i++;
			}
			var count = 0;
			for(var i = 0; i < 8; i++)
			{
				oldPlace = this.pos[i];
				this.pos[i] = stopAt - count;
				grid.setPlace(this.pos[i], this.pos[i+1], true);
				i++;
				count++;
			}
			posY -= rowsFallen;
		}
	}
	
	this.rotate = function()
	{
		var taken = false;
		if(beforeRotate == 90 && this.pos[0] == 0 || beforeRotate == -90 && this.pos[0] == 0)
		{
			return false;
		}
		else if(beforeRotate == 0 && this.pos[1] == 0 || beforeRotate == 0 && this.pos[1] == 1 || beforeRotate == 0 && this.pos[1] == 8 || beforeRotate == 0 && this.pos[1] == 9 || beforeRotate == 180 && this.pos[1] == 0 || beforeRotate == 180 && this.pos[1] == 1 || beforeRotate == 180 && this.pos[1] == 8 || beforeRotate == 180 && this.pos[1] == 9 || beforeRotate == -180 && this.pos[1] == 0 ||	beforeRotate == -180 && this.pos[1] == 1 ||	beforeRotate == -180 && this.pos[1] == 8 || beforeRotate == -180 && this.pos[1] == 9)
		{
			return false;
		}
		else
		{
			for(var i = 0; i < 8; i++)
			{
				grid.setPlace(this.pos[i]. this.pos[i+1], false);
				i++;
			}
			
			if(beforeRotate == 90 || beforeRotate == -90)
			{
				taken = false;
				for(var i =0; i< 8 && !taken; i++)
				{
					for(var j = -1; j < 3 && !taken; j++)
					{
						taken = grid.get(this.pos[i] + j, this.pos[i+1], 4);
						
					}
					i++;
				}
			}
			for(var i = 0; i < 8; i++)
			{
				grid.setPlace(this.pos[i]. this.pos[i+1], true);
				i++;
			}
			return !taken;
		}
	}
	
	this.positonRotate = funtion()
	{
		var position1 = null;
		var position2 = null;
		
		var left = this.pos[1];
		var right = this.pos[7];
		
		if(left != right)
		{
			if(left < right)
			{
				position1 = 1;
			}
			if(right < left)
			{
				position1 = 7;
			}
		} 
		else
		{
			var up = this.pos[0];
			var down = this.pos[6];
			
			if(up > down)
			{
				position2 = 0;
			}
			if(down > up)
			{
				position2 = 6;
			}
		}
		if(clockwise &&(beforeRotate == 90 || beforeRotate == -90) || clockwise &&(beforeRotate == 270 || beforeRotate == -270) || counterclock && beforeRotate == 0 || counterclock && (beforeRotate == 180 || beforeRotate == -180))
		{
			for(var i = 0; i < 8; i++)
			{
				grid.setPlace(this.pos[i]. this.pos[i+1], false);
				i++;
			}
			
			this.pos[position1] += 2;
			this.pos[position1 - 1] -= 1;
			this.pos[position1 + 2] += 1;
			this.pos[position1 + 3] += 1;
			this.pos[position1 + 5] += 2;
			this.pos[position1 + 6] -= 1;
			
			for(var i = 0; i < 8; i++)
			{
				grid.setPlace(this.pos[i]. this.pos[i+1], true);
				i++;
			}
			
		}
		
	}
}

function tetrimon()
{
	var tetri = Math.floor(Math.random() * Math.floor(2));
	
	if(tetri == 0)
	{
		current = new twoByTwo();
		tetriType = "twoByTwo";
	}
	else{
		current = new oneByFour();
		tetriType = "oneByFour";
	}
}

function game()
{
	r = Math.random();
	g = Math.random();
	b = Math.random();
	
	r2 = r + .4;
	g2 = g + .4;
	b2 = b + .4;
	
	grid = new gameGrid();
	
	tetrimon();
	
	current.object();
}

function main() {
  
  setupWebGL(); // set up the webGL environment
  shaders(); //sets up shaders
  game();
  
}