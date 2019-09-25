const fsCollisions = `#version 300 es
    precision highp float;

    in vec4 colorData1;
    in vec4 colorData2;

    layout(location = 0) out vec4 data1;
    layout(location = 1) out vec4 data2;

    void main() {
        data1 = colorData1;
        data2 = colorData2;
    }
`;

export {fsCollisions};