/*
GLGE WebGL Graphics Engine
Copyright (c) 2010, Paul Brunt
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of GLGE nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL PAUL BRUNT BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/**
 * @fileOverview
 * @name glge_filter2d.js
 * @author me@paulbrunt.co.uk
 */
 
 if(!window["GLGE"]){
	window["GLGE"]={};
}

(function(GLGE){

GLGE.Filter2d=function(){
	
}
GLGE.Filter2d.prototype.renderDepth=true;
GLGE.Filter2d.prototype.renderNormal=true;
GLGE.Filter2d.prototype.passes=null;
GLGE.Filter2d.prototype.textures=null;
GLGE.Filter2d.prototype.uniforms=null;
GLGE.Filter2d.prototype.buffers=null;
GLGE.Filter2d.prototype.depthBufferWidth=null;
GLGE.Filter2d.prototype.depthBufferHeight=null;
GLGE.Filter2d.prototype.normalBufferWidth=null;
GLGE.Filter2d.prototype.normalBufferHeight=null;

GLGE.Filter2d.prototype.addTexture=function(texture){
	if(!this.textures) this.textures=[];
	this.textures.push(texture);
}
GLGE.Filter2d.prototype.removeTexture=function(texture){
	var idx=this.textures.indexOf(texture);
	if(idx>-1) this.textures.splice(idx,1);
}

GLGE.Filter2d.prototype.createBuffer=function(gl,width,height){
	if(!width) width=gl.canvas.width;
	if(!height) height=gl.canvas.height;
	var frameBuffer = gl.createFramebuffer();
	var renderBuffer = gl.createRenderbuffer();
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	var tex = new Uint8Array(width*height*4);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return [frameBuffer,renderBuffer,texture];
}

GLGE.Filter2d.prototype.getFrameBuffer=function(gl){
	if(!this.passes) return null;
	
	if(!this.gl) this.gl=gl;
	if(!this.buffers){
		this.buffers=this.createBuffer(gl);
	}
	return this.buffers[0];
}

GLGE.Filter2d.prototype.getDepthBuffer=function(gl){
	if(!this.passes) return null;
	
	if(!this.gl) this.gl=gl;
	if(!this.depthBuffers){
		this.depthBuffers=this.createBuffer(gl,this.setDepthBufferWidth(),this.setDepthBufferHeight());
	}
	return this.depthBuffers[0];
}

GLGE.Filter2d.prototype.setDepthBufferWidth=function(value){
	this.depthBufferWidth=value;
	this.depthBuffers=null;
}
GLGE.Filter2d.prototype.getDepthBufferWidth=function(){
	return (this.depthBufferWidth ? this.depthBufferWidth : this.gl.canvas.width);
}

GLGE.Filter2d.prototype.setDepthBufferHeight=function(value){
	this.depthBufferHeight=value;
	this.depthBuffers=null;
}
GLGE.Filter2d.prototype.getDepthBufferHeight=function(){
	return (this.depthBufferHeight ? this.depthBufferHeight : this.gl.canvas.height);
}

GLGE.Filter2d.prototype.setNormalBufferWidth=function(value){
	this.normalBufferWidth=value;
	this.normalBuffers=null;
}
GLGE.Filter2d.prototype.getNormalBufferWidth=function(){
	return (this.normalBufferWidth ? this.normalBufferWidth : this.gl.canvas.width);
}

GLGE.Filter2d.prototype.setNormalBufferHeight=function(value){
	this.normalBufferHeight=value;
	this.normalBuffers=null;
}
GLGE.Filter2d.prototype.getNormalBufferHeight=function(){
	return (this.normalBufferHeight ? this.normalBufferHeight : this.gl.canvas.height);
}

GLGE.Filter2d.prototype.getNormalBuffer=function(gl){
	if(!this.passes) return null;
	
	if(!this.gl) this.gl=gl;
	if(!this.normalBuffers){
		this.normalBuffers=this.createBuffer(gl,this.getNormalBufferWidth(),this.getNormalBufferHeight());
	}
	return this.normalBuffers[0];
}

GLGE.Filter2d.prototype.setUniform=function(type,name,value){
	if(!this.uniforms) this.uniforms={};
	this.uniforms[name]={type:type,value:value};
}
GLGE.Filter2d.prototype.getUniform=function(name){
	if(!this.uniforms) this.uniforms={};
	return this.uniforms[name].value
}
GLGE.Filter2d.prototype.getUniformType=function(name){
	if(!this.uniforms) this.uniforms={};
	return this.uniforms[name].type;
}

GLGE.Filter2d.prototype.addPassFile=function(url){
	var req = new XMLHttpRequest();
	if(req) {
		req.open("GET", url, false);
		req.send("");
		filter.addPass(req.responseText);
	}	
}

GLGE.Filter2d.prototype.addPass=function(GLSL,width,height){
	if(!this.passes) this.passes=[];
	this.passes.push({GLSL:GLSL,height:height,width:width});
}

//does all passes and renders result to screen
GLGE.Filter2d.prototype.GLRender=function(gl,buffer){
	if(!buffer) buffer=null;
	if(this.passes){
		for(var i=0;i<this.passes.length;i++){
			//set the frame buffer here
			if(this.passes.length-1==i){
				gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
			}else{
				if(!this.passes[i].buffer) this.passes[i].buffer=this.createBuffer(gl,this.passes[i].width,this.passes[i].height);
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.passes[i].buffer[0]);
			}
			var width=(this.passes[i].width ? this.passes[i].width : gl.canvas.width);
			var height=(this.passes[i].height ? this.passes[i].height : gl.canvas.height);
			gl.viewport(0,0,width,height);
			gl.clearDepth(1.0);
			gl.depthFunc(gl.LEQUAL);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.DEPTH_BUFFER_BIT);
			
			if(!this.passes[i].program){
				this.passes[i].program=this.GLCreateShader(gl,this.passes[i].GLSL);
			}
			gl.useProgram(this.passes[i].program);
			
			for(var j=0; j<8; j++) gl.disableVertexAttribArray(j);
			attribslot=GLGE.getAttribLocation(gl,this.passes[i].program, "position");
			if(!this.posBuffer) this.createPlane(gl);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
			gl.enableVertexAttribArray(attribslot);
			gl.vertexAttribPointer(attribslot, this.posBuffer.itemSize, gl.FLOAT, false, 0, 0);
			this.GLSetUniforms(gl,i);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.GLfaces);
			gl.drawElements(gl.TRIANGLES, this.GLfaces.numItems, gl.UNSIGNED_SHORT, 0);
		}
	}
}

GLGE.Filter2d.prototype.GLSetUniforms=function(gl,pass){
	for(key in this.uniforms){
		var uniform=this.uniforms[key];
		if(uniform.type=="Matrix4fv"){
			gl["uniform"+uniform.type](GLGE.getUniformLocation(gl,this.passes[pass].program, key),false,uniform.value);
		}else{
			gl["uniform"+uniform.type](GLGE.getUniformLocation(gl,this.passes[pass].program, key),uniform.value);
		}
	}

	var tidx=1;
	gl.activeTexture(gl["TEXTURE0"]);
	gl.bindTexture(gl.TEXTURE_2D, this.buffers[2]);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.uniform1i(GLGE.getUniformLocation(gl,this.passes[pass].program, "GLGE_RENDER"), 0);
	
	if(this.renderDepth){
		gl.activeTexture(gl["TEXTURE"+tidx]);
		gl.bindTexture(gl.TEXTURE_2D, this.depthBuffers[2]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.uniform1i(GLGE.getUniformLocation(gl,this.passes[pass].program, "GLGE_DEPTH"), tidx);
		tidx++;
	}
	
	if(this.renderNormal){
		gl.activeTexture(gl["TEXTURE"+tidx]);
		gl.bindTexture(gl.TEXTURE_2D, this.normalBuffers[2]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.uniform1i(GLGE.getUniformLocation(gl,this.passes[pass].program, "GLGE_NORMAL"), tidx);
		tidx++;
	}
	
	for(var i=0;i<pass;i++){
		gl.activeTexture(gl["TEXTURE"+tidx]);
		gl.bindTexture(gl.TEXTURE_2D, this.passes[i].buffer[2]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.uniform1i(GLGE.getUniformLocation(gl,this.passes[pass].program, "GLGE_PASS"+i), tidx);
		tidx++;
	}
	
	if(!this.textures) this.textures=[];
	for(var i=0; i<this.textures.length;i++){
		gl.activeTexture(gl["TEXTURE"+(i+tidx)]);
		this.textures[i].doTexture(gl,null);
		gl.uniform1i(GLGE.getUniformLocation(gl,this.passes[pass].program, "TEXTURE"+i), i+tidx);
	}
}

/**
* creates the screen aligned plane mesh
* @private
*/
GLGE.Filter2d.prototype.createPlane=function(gl){
	//create the vertex positions
	if(!this.posBuffer) this.posBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1,1,0.5,-1,1,0.5,-1,-1,0.5,1,-1,0.5]), gl.STATIC_DRAW);
	this.posBuffer.itemSize = 3;
	this.posBuffer.numItems = 4;
	//create the faces
	if(!this.GLfaces) this.GLfaces = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.GLfaces);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,2,3,0]), gl.STATIC_DRAW);
	this.GLfaces.itemSize = 1;
	this.GLfaces.numItems = 6;
}

/**
* Creates a shader program
* @private
*/
GLGE.Filter2d.prototype.GLCreateShader=function(gl,fragStr){
	//Vertex Shader
	var vertexStr=[];
	vertexStr.push("attribute vec3 position;\n");
	vertexStr.push("varying vec2 texCoord;\n");
	
	vertexStr.push("void main(void){\n");
	vertexStr.push("texCoord=(position.xy+vec2(1.0,1.0))/2.0;\n");    
	vertexStr.push("gl_Position = vec4(position.xyz,1.0);\n");
	vertexStr.push("}\n");
	
	var GLVertexShader=GLGE.getGLShader(gl,gl.VERTEX_SHADER,vertexStr.join(""));
	var GLFragmentShader=GLGE.getGLShader(gl,gl.FRAGMENT_SHADER,fragStr);

	return GLGE.getGLProgram(gl,GLVertexShader,GLFragmentShader);
}

})(GLGE);
