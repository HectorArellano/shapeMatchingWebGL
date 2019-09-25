const fsGenerateMatrix = `#version 300 es

    precision highp float;
    precision highp sampler2D;

    uniform sampler2D uPositionsP;
    uniform sampler2D uPositionsQ;
    in vec2 uv;

    layout(location = 0) out vec4 data1;
    layout(location = 1) out vec4 data2;
    layout(location = 2) out vec4 data3;

    void main() {

        vec4 p = texture(uPositionsP, uv);
        vec4 q = texture(uPositionsQ, uv);

        //The alpha value makes reference to the shape ID
        data1 = vec4(q.x * p.xyz, p.a);
        data2 = vec4(q.y * p.xyz, p.a);
        data3 = vec4(q.z * p.xyz, p.a);
    }

`;

export {fsGenerateMatrix}