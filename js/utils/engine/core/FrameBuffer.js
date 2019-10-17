

class FrameBuffer {

    constructor(width, height, useDepth) {

        this.frameBuffer = gl.createFramebuffer();
        const attachmentPoint = gl.COLOR_ATTACHMENT0;


        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
        this.frameBuffer.width = width;
        this.frameBuffer.height = height;

        gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, tex, 0);

        if(useDepth) {
            let renderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
            if(useStencil) {
                gl.renderbufferStorage( gl.RENDERBUFFER, gl.DEPTH_STENCIL,  width, height);
                gl.framebufferRenderbuffer( gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
            } else {
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
            }
        }

        gl.drawBuffers( this.frameBuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

        let status = gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);
        if (status != gl.FRAMEBUFFER_COMPLETE) {
            console.log('framebufer status: ' + status.toString(16));
            return null;
        }
    }

    _createTexture(){

    }

    begin(){

    }

    end(){

    }

    dispose(){

    }

}

export default FrameBuffer;