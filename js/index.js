import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import {Camera}                 from './utils/camera.js';

import {vsParticles}            from './shaders/utils/vs-renderParticles.js'
import {fsColor}                from './shaders/utils/fs-simpleColor.js';
import {fsTextureColor}         from './shaders/utils/fs-simpleTexture.js';
import {vsQuad}                 from './shaders/utils/vs-quad.js';
import {vsRenderBGSphere}       from './shaders/utils/vs-renderBGSphere.js';

import * as ShapeMatching       from './shapeMatching/index.js'

import eggImage                 from '../textures/eggTexture.png';

//=======================================================================================================
// Variables & Constants
//=======================================================================================================

let canvas = document.querySelector("#canvas3D");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
canvas.style.width = String(canvas.width) + "px";
canvas.style.height = String(canvas.height) + "px";
webGL2.setContext(canvas);

let camera = new Camera(canvas);
let cameraDistance = 2.5;
let FOV = 30;
let currentFrame = 0;

const voxelResolution = 40;
const iterations = 10;
const deltaTime = 0.1;

let renderParticlesProgram =                    webGL2.generateProgram(vsParticles, fsColor);
renderParticlesProgram.positionTexture =        gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderParticlesProgram.cameraMatrix =           gl.getUniformLocation(renderParticlesProgram, "uCameraMatrix");
renderParticlesProgram.perspectiveMatrix =      gl.getUniformLocation(renderParticlesProgram, "uPMatrix");
renderParticlesProgram.scale =                  gl.getUniformLocation(renderParticlesProgram, "uScale");


let textureProgram =                            webGL2.generateProgram(vsQuad, fsTextureColor);
textureProgram.texture =                        gl.getUniformLocation(textureProgram, "uTexture");
textureProgram.forceAlpha =                     gl.getUniformLocation(textureProgram, "uForceAlpha");


let renderBGSphereProgram =                     webGL2.generateProgram(vsRenderBGSphere, fsTextureColor);
renderBGSphereProgram.uv =                      gl.getAttribLocation(renderBGSphereProgram, "aUV");
renderBGSphereProgram.positionTexture =         gl.getUniformLocation(renderBGSphereProgram, "uTexturePosition");
renderBGSphereProgram.cameraMatrix =            gl.getUniformLocation(renderBGSphereProgram, "uCameraMatrix");
renderBGSphereProgram.perspectiveMatrix =       gl.getUniformLocation(renderBGSphereProgram, "uPMatrix");
renderBGSphereProgram.scale =                   gl.getUniformLocation(renderBGSphereProgram, "uScale");
renderBGSphereProgram.texture =                 gl.getUniformLocation(renderBGSphereProgram, "uTexture");


//=======================================================================================================
// Initiate the shape matching module
//=======================================================================================================

ShapeMatching.init(voxelResolution);
// let shapeIndexes = webGL2.createBuffer(ShapeMatching.indexParticles, true);
// let totalIndexes = ShapeMatching.indexParticles.length;
let shapeUV = webGL2.createBuffer(ShapeMatching.uvIndices);
let shapeTexture = null;

const image = new Image();
image.onload = () => {

    shapeTexture = webGL2.createTextureFromImage(image);

}

image.src = eggImage;


camera.updateCamera(FOV, canvas.width/canvas.height, cameraDistance);

let render = () => {

    requestAnimationFrame(render);

    //Recalculate the attractors positions every n frames
    ShapeMatching.update(deltaTime, iterations, currentFrame % 300 === 0, camera.cameraTransformMatrix, camera.perspectiveMatrix);


    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);


    //Render the container sphere

    if(shapeTexture !== null) {
        gl.useProgram(renderBGSphereProgram);
        
        webGL2.bindAttribBuffer(renderBGSphereProgram.uv, shapeUV, 2);

        webGL2.bindTexture(renderBGSphereProgram.positionTexture, ShapeMatching.positionsTexture, 0);
        webGL2.bindTexture(renderBGSphereProgram.texture, shapeTexture, 1);
        gl.uniformMatrix4fv(renderBGSphereProgram.cameraMatrix, false, camera.cameraTransformMatrix);
        gl.uniformMatrix4fv(renderBGSphereProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
        gl.uniform1f(renderBGSphereProgram.scale, voxelResolution);
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shapeIndexes);
        gl.drawArrays(gl.TRIANGLES, 0, ShapeMatching.totalParticles);

        gl.disableVertexAttribArray(renderBGSphereProgram.uv)
    }


    //Render the particles from the soft body
    // gl.useProgram(renderParticlesProgram);
    // webGL2.bindTexture(renderParticlesProgram.positionTexture, ShapeMatching.positionsTexture, 0);
    // gl.uniform1f(renderParticlesProgram.scale, voxelResolution);
    // gl.uniformMatrix4fv(renderParticlesProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    // gl.uniformMatrix4fv(renderParticlesProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    // gl.drawArrays(gl.POINTS, 0, ShapeMatching.totalParticles);
    // gl.disable(gl.DEPTH_TEST);


    currentFrame ++;

};

render();

