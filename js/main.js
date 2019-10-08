import {gl}                     from './utils/webGL2.js';
import * as webGL2              from './utils/webGL2.js';
import {Camera}                 from './utils/camera.js';

import {vsParticles}            from './shaders/utils/vs-renderParticles.js'
import {fsColor}                from './shaders/utils/fs-simpleColor.js';
import {fsTextureColor}         from './shaders/utils/fs-simpleTexture.js';
import {vsQuad}                 from './shaders/utils/vs-quad.js';
import {vsRenderBGSphere}       from './shaders/utils/vs-renderBGSphere.js';

import * as ShapeMatching       from './shapeMatching'


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

const voxelResolution = 100;
const iterations = 3;
const deltaTime = 0.1;


let renderParticlesProgram =                    webGL2.generateProgram(vsParticles, fsColor);
renderParticlesProgram.positionTexture =        gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderParticlesProgram.cameraMatrix =           gl.getUniformLocation(renderParticlesProgram, "uCameraMatrix");
renderParticlesProgram.perspectiveMatrix =      gl.getUniformLocation(renderParticlesProgram, "uPMatrix");
renderParticlesProgram.scale =                  gl.getUniformLocation(renderParticlesProgram, "uScale");


let textureProgram =                            webGL2.generateProgram(vsQuad, fsTextureColor);
textureProgram.texture =                        gl.getUniformLocation(textureProgram, "uTexture");
textureProgram.forceAlpha =                     gl.getUniformLocation(textureProgram, "uForceAlpha");


let renderBGSphereProgram =                     webGL2.generateProgram(vsRenderBGSphere, fsColor);
renderParticlesProgram.positionTexture =        gl.getUniformLocation(renderParticlesProgram, "uTexturePosition");
renderBGSphereProgram.cameraMatrix =            gl.getUniformLocation(renderBGSphereProgram, "uCameraMatrix");
renderBGSphereProgram.perspectiveMatrix =       gl.getUniformLocation(renderBGSphereProgram, "uPMatrix");


//=======================================================================================================
// Initiate the shape matching module
//=======================================================================================================

ShapeMatching.init(voxelResolution);
let borderSphereIndexes = webGL2.createBuffer(ShapeMatching.indexParticles, true);
let totalIndexes = ShapeMatching.indexParticles.length;


let render = () => {

    requestAnimationFrame(render);

    camera.updateCamera(FOV, canvas.width/canvas.height, cameraDistance);

    //Recalculate the attractors positions every n frames
    ShapeMatching.update(deltaTime, iterations, currentFrame % 300 === 0);


    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);


    //Render the container sphere
    gl.useProgram(renderBGSphereProgram);
    webGL2.bindTexture(renderBGSphereProgram.positionTexture, ShapeMatching.positionsTexture, 0);
    gl.uniformMatrix4fv(renderBGSphereProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(renderBGSphereProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, borderSphereIndexes);
    gl.drawElements(gl.TRIANGLES, totalIndexes, gl.UNSIGNED_SHORT, 0);


    //Render the particles from the soft body
    gl.useProgram(renderParticlesProgram);
    webGL2.bindTexture(renderParticlesProgram.positionTexture, ShapeMatching.positionsTexture, 0);
    gl.uniform1f(renderParticlesProgram.scale, voxelResolution);
    gl.uniformMatrix4fv(renderParticlesProgram.cameraMatrix, false, camera.cameraTransformMatrix);
    gl.uniformMatrix4fv(renderParticlesProgram.perspectiveMatrix, false, camera.perspectiveMatrix);
    gl.drawArrays(gl.POINTS, 0, ShapeMatching.totalParticles);
    gl.disable(gl.DEPTH_TEST);


    currentFrame ++;

};

render();






//function generateBox(side, center, stiffness) {
//
//    amountOfShapes ++;
//
//    let partialParticles = 0;
//
//    for(let u = 0; u < 2; u ++) {
//        for (let latNumber = 0; latNumber < latitudeBands; latNumber++) {
//            for (let longNumber = 0; longNumber < longitudeBands; longNumber++) {
//                let first = (latNumber * (longitudeBands + 1)) + longNumber;
//                let second = first + longitudeBands + 1;
//
//                indexParticles.push(first + totalParticles);
//                indexParticles.push(second + totalParticles);
//                indexParticles.push(first + 1 + totalParticles);
//
//                indexParticles.push(second + totalParticles);
//                indexParticles.push(second + 1 + totalParticles);
//                indexParticles.push(first + 1 + totalParticles);
//                totalIndexes += 6;
//            }
//        }
//
//
//        for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
//            let aa = side * latNumber / latitudeBands;
//
//            for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
//                let bb = side * longNumber / longitudeBands;
//
//                let x = aa - 0.5 * side + center.x;
//                let y = bb - 0.5 * side + center.y;
//                let z = 0.5 * side * (-1 + 2 * u) + center.z;
//
//                particlesPosition.push(x, y, z, amountOfShapes);
//                particlesVelocity.push(0, 0, 0, 0);
//                totalParticles++;
//                partialParticles++;
//            }
//        }
//    }
//
//    for(let u = 0; u < 2; u ++) {
//        for (let latNumber = 0; latNumber < latitudeBands; latNumber++) {
//            for (let longNumber = 0; longNumber < longitudeBands; longNumber++) {
//                let first = (latNumber * (longitudeBands + 1)) + longNumber;
//                let second = first + longitudeBands + 1;
//
//                indexParticles.push(first + totalParticles);
//                indexParticles.push(second + totalParticles);
//                indexParticles.push(first + 1 + totalParticles);
//
//                indexParticles.push(second + totalParticles);
//                indexParticles.push(second + 1 + totalParticles);
//                indexParticles.push(first + 1 + totalParticles);
//                totalIndexes += 6;
//            }
//        }
//
//
//        for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
//            let aa = side * latNumber / latitudeBands;
//
//            for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
//                let bb = side * longNumber / longitudeBands;
//
//                let y = aa - 0.5 * side + center.y;
//                let z = bb - 0.5 * side + center.z;
//                let x = 0.5 * side * (-1 + 2 * u) + center.x;
//
//                particlesPosition.push(x, y, z, amountOfShapes);
//                particlesVelocity.push(0, 0, 0, 0);
//                totalParticles++;
//                partialParticles++;
//            }
//        }
//    }
//
//    for(let u = 0; u < 2; u ++) {
//        for (let latNumber = 0; latNumber < latitudeBands; latNumber++) {
//            for (let longNumber = 0; longNumber < longitudeBands; longNumber++) {
//                let first = (latNumber * (longitudeBands + 1)) + longNumber;
//                let second = first + longitudeBands + 1;
//
//                indexParticles.push(first + totalParticles);
//                indexParticles.push(second + totalParticles);
//                indexParticles.push(first + 1 + totalParticles);
//
//                indexParticles.push(second + totalParticles);
//                indexParticles.push(second + 1 + totalParticles);
//                indexParticles.push(first + 1 + totalParticles);
//                totalIndexes += 6;
//            }
//        }
//
//
//        for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
//            let aa = side * latNumber / latitudeBands;
//
//            for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
//                let bb = side * longNumber / longitudeBands;
//
//                let x = aa - 0.5 * side + center.x;
//                let z = bb - 0.5 * side + center.z;
//                let y = 0.5 * side * (-1 + 2 * u) + center.y;
//
//                particlesPosition.push(x, y, z, amountOfShapes);
//                particlesVelocity.push(0, 0, 0, 0);
//                totalParticles++;
//                partialParticles++;
//            }
//        }
//    }
//
//    //This is for the shape information
//    shapeInfo.push(partialParticles, side, stiffness);
//
//}
