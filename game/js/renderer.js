// Pixel 3D - WebGL2 Forward Renderer with PCF Shadows, Sky Dome, Wind Sway & Particles
(function (global) {
  'use strict';

  const { Mat4, normalize } = global.Math3D;

  // --- Shaders ---

  const SHADOW_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=3) in float aWind;
  uniform mat4 uLightVP;
  uniform mat4 uModel;
  uniform float uTime;
  void main() {
    vec4 wp = uModel * vec4(aPos, 1.0);
    if (aWind > 0.001) {
      float wave = sin(uTime * 1.9 + wp.x * 0.45 + wp.z * 0.35) * 0.12 * aWind;
      float wave2 = cos(uTime * 2.7 + wp.z * 0.6) * 0.05 * aWind;
      wp.x += wave;
      wp.z += wave2;
    }
    gl_Position = uLightVP * wp;
  }`;

  const SHADOW_FS = `#version 300 es
  precision mediump float;
  void main() {}`;

  const MAIN_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 aPos;
  layout(location=1) in vec3 aNorm;
  layout(location=2) in vec3 aColor;
  layout(location=3) in float aWind;

  uniform mat4 uVP;
  uniform mat4 uModel;
  uniform mat4 uLightVP;
  uniform float uTime;

  out vec3 vWorldPos;
  out vec3 vNormal;
  out vec3 vColor;
  out vec4 vLightSpacePos;

  void main() {
    vec4 wp = uModel * vec4(aPos, 1.0);
    if (aWind > 0.001) {
      float gust = sin(uTime * 1.9 + wp.x * 0.45 + wp.z * 0.35);
      float flutter = cos(uTime * 3.2 + wp.x * 1.1 - wp.z * 0.9);
      wp.x += (gust * 0.11 + flutter * 0.025) * aWind;
      wp.z += (cos(uTime * 1.6 + wp.z * 0.5) * 0.07) * aWind;
    }
    vWorldPos = wp.xyz;
    vNormal = normalize(mat3(uModel) * aNorm);
    vColor = aColor;
    vLightSpacePos = uLightVP * wp;
    gl_Position = uVP * wp;
  }`;

  const MAIN_FS = `#version 300 es
  precision highp float;
  in vec3 vWorldPos;
  in vec3 vNormal;
  in vec3 vColor;
  in vec4 vLightSpacePos;

  uniform sampler2D uShadowMap;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uSkyColor;
  uniform vec3 uGroundColor;
  uniform vec3 uFogColor;
  uniform vec3 uCameraPos;
  uniform float uFogStart;
  uniform float uFogEnd;
  uniform float uShininess;
  uniform float uSpecStrength;
  uniform float uRimStrength;
  uniform vec3 uEmissive;

  out vec4 outColor;

  float calcShadow(vec4 lsPos, vec3 n, vec3 lDir) {
    vec3 proj = lsPos.xyz / lsPos.w;
    proj = proj * 0.5 + 0.5;
    if (proj.z > 1.0 || proj.x < 0.0 || proj.x > 1.0 || proj.y < 0.0 || proj.y > 1.0) {
      return 1.0;
    }
    float bias = max(0.0028 * (1.0 - dot(n, lDir)), 0.0009);
    vec2 texel = 1.0 / vec2(textureSize(uShadowMap, 0));
    float lit = 0.0;
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        float pcfDepth = texture(uShadowMap, proj.xy + vec2(x, y) * texel).r;
        lit += (proj.z - bias <= pcfDepth) ? 1.0 : 0.0;
      }
    }
    lit /= 9.0;
    // Soft fade near shadow box border
    float edge = smoothstep(0.0, 0.08, proj.x) * smoothstep(1.0, 0.92, proj.x)
               * smoothstep(0.0, 0.08, proj.y) * smoothstep(1.0, 0.92, proj.y);
    return mix(1.0, lit, edge);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uSunDir);
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 H = normalize(L + V);

    // Convert sRGB vertex albedo into linear space for rich, true-to-life lighting!
    vec3 albedo = pow(max(vColor, vec3(0.0)), vec3(2.2));

    float ndl = max(dot(N, L), 0.0);
    // Warm wrap diffuse for soft natural fur & foliage shading
    float wrapDiff = clamp((dot(N, L) + 0.25) / 1.25, 0.0, 1.0);
    float shadow = calcShadow(vLightSpacePos, N, L);

    // Hemisphere ambient (sky top + forest floor bounce)
    float hemi = N.y * 0.5 + 0.5;
    vec3 ambient = mix(uGroundColor, uSkyColor, hemi) * 0.42;

    // Direct sun light
    vec3 diffuse = uSunColor * (ndl * 1.15 + wrapDiff * 0.28) * (0.24 + 0.76 * shadow);

    // Specular highlight (gives Pixel's glossy dark brown fur & nose life!)
    float spec = pow(max(dot(N, H), 0.0), uShininess) * uSpecStrength * (0.25 + 0.75 * shadow);
    vec3 specular = uSunColor * spec;

    // Golden-hour rim lighting on silhouette
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.8) * uRimStrength;
    vec3 rimCol = mix(uSkyColor, uSunColor, 0.65) * rim * (0.35 + 0.65 * max(dot(V, -L), 0.0));

    vec3 color = albedo * (ambient + diffuse) + specular + rimCol + uEmissive;

    // Atmospheric distance fog with subtle warm sun scattering
    float dist = length(uCameraPos - vWorldPos);
    float fogT = clamp((dist - uFogStart) / (uFogEnd - uFogStart), 0.0, 1.0);
    fogT = fogT * fogT * (3.0 - 2.0 * fogT);
    float sunGlow = pow(max(dot(-V, L), 0.0), 6.0) * 0.35;
    vec3 fogCol = mix(uFogColor, vec3(1.0, 0.88, 0.62), sunGlow);
    color = mix(color, fogCol, fogT);

    // Filmic ACES tone mapping & sRGB gamma encoding
    color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
    color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));
    outColor = vec4(color, 1.0);
  }`;

  const SKY_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec2 aPos;
  out vec2 vUv;
  void main() {
    vUv = aPos;
    gl_Position = vec4(aPos, 0.9999, 1.0);
  }`;

  const SKY_FS = `#version 300 es
  precision highp float;
  in vec2 vUv;
  uniform mat4 uInvVP;
  uniform vec3 uSunDir;
  out vec4 outColor;
  void main() {
    vec4 nearP = uInvVP * vec4(vUv, -1.0, 1.0);
    vec4 farP  = uInvVP * vec4(vUv,  1.0, 1.0);
    vec3 dir = normalize(farP.xyz / farP.w - nearP.xyz / nearP.w);

    float h = clamp(dir.y, 0.0, 1.0);
    vec3 horizon = vec3(0.56, 0.72, 0.60);
    vec3 midSky  = vec3(0.24, 0.54, 0.84);
    vec3 zenith  = vec3(0.09, 0.30, 0.66);
    vec3 sky = mix(horizon, midSky, pow(h, 0.48));
    sky = mix(sky, zenith, pow(h, 1.35));

    vec3 sunDir = normalize(uSunDir);
    float sunDot = max(dot(dir, sunDir), 0.0);
    float halo = pow(sunDot, 10.0) * 0.42 + pow(sunDot, 80.0) * 0.55;
    float disc = smoothstep(0.9975, 0.9992, sunDot);
    sky += vec3(1.0, 0.90, 0.64) * halo + vec3(1.0, 0.98, 0.88) * disc * 1.5;

    // Gentle sunlit mist near horizon matching linear fog
    float mist = exp(-abs(dir.y) * 9.0);
    sky = mix(sky, vec3(0.56, 0.70, 0.58), mist * 0.55);

    sky = (sky * (2.51 * sky + 0.03)) / (sky * (2.43 * sky + 0.59) + 0.14);
    sky = pow(clamp(sky, 0.0, 1.0), vec3(1.0 / 2.2));
    outColor = vec4(sky, 1.0);
  }`;

  const PARTICLE_VS = `#version 300 es
  precision highp float;
  layout(location=0) in vec2 aCorner;
  layout(location=1) in vec3 aCenter;
  layout(location=2) in float aSize;
  layout(location=3) in vec4 aColor;

  uniform mat4 uVP;
  uniform vec3 uCamRight;
  uniform vec3 uCamUp;

  out vec2 vUv;
  out vec4 vColor;

  void main() {
    vec3 worldPos = aCenter + (uCamRight * aCorner.x + uCamUp * aCorner.y) * aSize;
    vUv = aCorner * 2.0;
    vColor = aColor;
    gl_Position = uVP * vec4(worldPos, 1.0);
  }`;

  const PARTICLE_FS = `#version 300 es
  precision mediump float;
  in vec2 vUv;
  in vec4 vColor;
  out vec4 outColor;
  void main() {
    float r = length(vUv);
    if (r > 1.0) discard;
    float alpha = (1.0 - r * r);
    alpha *= alpha * vColor.a;
    outColor = vec4(vColor.rgb, alpha);
  }`;

  function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile error: ' + gl.getShaderInfoLog(s));
    }
    return s;
  }

  function createProgram(gl, vsSrc, fsSrc) {
    const p = gl.createProgram();
    gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(p));
    }
    return p;
  }

  function invertMat4(out, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return out;
    det = 1.0 / det;

    out[0]  = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1]  = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2]  = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3]  = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4]  = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5]  = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6]  = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7]  = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8]  = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9]  = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }

  class Renderer {
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.isMobile = !!(opts && opts.isMobile);
      const gl = canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
      if (!gl) throw new Error('WebGL2 is not supported on this system.');
      this.gl = gl;

      this.shadowProg = createProgram(gl, SHADOW_VS, SHADOW_FS);
      this.mainProg = createProgram(gl, MAIN_VS, MAIN_FS);
      this.skyProg = createProgram(gl, SKY_VS, SKY_FS);
      this.particleProg = createProgram(gl, PARTICLE_VS, PARTICLE_FS);

      this.shadowLoc = {
        uLightVP: gl.getUniformLocation(this.shadowProg, 'uLightVP'),
        uModel: gl.getUniformLocation(this.shadowProg, 'uModel'),
        uTime: gl.getUniformLocation(this.shadowProg, 'uTime'),
      };

      this.mainLoc = {};
      for (const name of [
        'uVP','uModel','uLightVP','uTime','uShadowMap','uSunDir','uSunColor',
        'uSkyColor','uGroundColor','uFogColor','uCameraPos','uFogStart','uFogEnd',
        'uShininess','uSpecStrength','uRimStrength','uEmissive'
      ]) {
        this.mainLoc[name] = gl.getUniformLocation(this.mainProg, name);
      }

      this.skyLoc = {
        uInvVP: gl.getUniformLocation(this.skyProg, 'uInvVP'),
        uSunDir: gl.getUniformLocation(this.skyProg, 'uSunDir'),
      };

      this.partLoc = {
        uVP: gl.getUniformLocation(this.particleProg, 'uVP'),
        uCamRight: gl.getUniformLocation(this.particleProg, 'uCamRight'),
        uCamUp: gl.getUniformLocation(this.particleProg, 'uCamUp'),
      };

      // Shadow map FBO (1024x1024 on mobile for silky 60fps, 2048x2048 on desktop)
      this.shadowSize = this.isMobile ? 1024 : 2048;
      this.shadowTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.shadowSize, this.shadowSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      this.shadowFBO = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
      gl.drawBuffers([gl.NONE]);
      gl.readBuffer(gl.NONE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      // Fullscreen quad for sky
      this.skyVao = gl.createVertexArray();
      gl.bindVertexArray(this.skyVao);
      const skyBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      // Instanced particle buffer (up to 600 particles)
      this.maxParticles = 600;
      this.particleData = new Float32Array(this.maxParticles * 8); // cx,cy,cz,size,r,g,b,a
      this.particleVao = gl.createVertexArray();
      gl.bindVertexArray(this.particleVao);

      const quadBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5,-0.5, 0.5,-0.5, -0.5,0.5, 0.5,0.5]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      this.particleInstBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.particleInstBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.particleData.byteLength, gl.DYNAMIC_DRAW);

      const stride = 8 * 4;
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 0);
      gl.vertexAttribDivisor(1, 1);

      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 12);
      gl.vertexAttribDivisor(2, 1);

      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 16);
      gl.vertexAttribDivisor(3, 1);
      gl.bindVertexArray(null);

      // Lighting environment (golden sunlit forest afternoon, linear values)
      this.sunDir = normalize([0.52, 0.70, 0.48]);
      this.sunColor = [1.35, 1.15, 0.88];
      this.skyColor = [0.46, 0.72, 0.98];
      this.groundColor = [0.22, 0.30, 0.14];
      this.fogColor = [0.52, 0.68, 0.56];

      this.projMat = Mat4.create();
      this.viewMat = Mat4.create();
      this.vpMat = Mat4.create();
      this.invVpMat = Mat4.create();
      this.lightProj = Mat4.create();
      this.lightView = Mat4.create();
      this.lightVP = Mat4.create();
      this.identityMat = Mat4.create();

      this.resize();
    }

    resize() {
      const maxDpr = this.isMobile ? 1.75 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    }

    uploadMesh(raw) {
      const gl = this.gl;
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      const bindAttr = (loc, data, size) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        return b;
      };

      bindAttr(0, raw.positions, 3);
      bindAttr(1, raw.normals, 3);
      bindAttr(2, raw.colors, 3);
      bindAttr(3, raw.winds, 1);

      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, raw.indices, gl.STATIC_DRAW);

      gl.bindVertexArray(null);

      return {
        vao,
        count: raw.indices.length,
        glIndexType: raw.indexType === 'uint32' ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
      };
    }

    render(drawList, particles, cameraPos, cameraTarget, focusPos, time) {
      const gl = this.gl;
      this.resize();

      const aspect = this.canvas.width / this.canvas.height;
      // Wider vertical FOV in portrait mode so Pixel & Pocky stay comfortably framed on phones!
      const fovDeg = aspect < 0.85 ? 64 : (aspect < 1.0 ? 58 : 52);
      Mat4.perspective(this.projMat, (fovDeg * Math.PI) / 180, aspect, 0.15, 220);
      Mat4.lookAt(this.viewMat, cameraPos, cameraTarget, [0, 1, 0]);
      Mat4.multiply(this.vpMat, this.projMat, this.viewMat);
      invertMat4(this.invVpMat, this.vpMat);

      // Update directional shadow frustum snapped around focusPos
      const boxR = 22;
      const snap = (boxR * 2) / this.shadowSize;
      const fx = Math.round(focusPos[0] / snap) * snap;
      const fy = Math.round(focusPos[1] / snap) * snap;
      const fz = Math.round(focusPos[2] / snap) * snap;
      const sunEye = [fx + this.sunDir[0] * 48, fy + this.sunDir[1] * 48, fz + this.sunDir[2] * 48];
      Mat4.ortho(this.lightProj, -boxR, boxR, -boxR, boxR, 2, 120);
      Mat4.lookAt(this.lightView, sunEye, [fx, fy, fz], [0, 1, 0]);
      Mat4.multiply(this.lightVP, this.lightProj, this.lightView);

      // --- Pass 1: Shadow Map ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFBO);
      gl.viewport(0, 0, this.shadowSize, this.shadowSize);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.clear(gl.DEPTH_BUFFER_BIT);

      gl.useProgram(this.shadowProg);
      gl.uniformMatrix4fv(this.shadowLoc.uLightVP, false, this.lightVP);
      gl.uniform1f(this.shadowLoc.uTime, time);

      for (const item of drawList) {
        if (item.castShadow === false) continue;
        gl.uniformMatrix4fv(this.shadowLoc.uModel, false, item.model || this.identityMat);
        gl.bindVertexArray(item.mesh.vao);
        gl.drawElements(gl.TRIANGLES, item.mesh.count, item.mesh.glIndexType, 0);
      }

      // --- Pass 2: Main Lit Scene ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0.72, 0.84, 0.78, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(this.mainProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
      gl.uniform1i(this.mainLoc.uShadowMap, 0);

      gl.uniformMatrix4fv(this.mainLoc.uVP, false, this.vpMat);
      gl.uniformMatrix4fv(this.mainLoc.uLightVP, false, this.lightVP);
      gl.uniform1f(this.mainLoc.uTime, time);
      gl.uniform3fv(this.mainLoc.uSunDir, this.sunDir);
      gl.uniform3fv(this.mainLoc.uSunColor, this.sunColor);
      gl.uniform3fv(this.mainLoc.uSkyColor, this.skyColor);
      gl.uniform3fv(this.mainLoc.uGroundColor, this.groundColor);
      gl.uniform3fv(this.mainLoc.uFogColor, this.fogColor);
      gl.uniform3fv(this.mainLoc.uCameraPos, cameraPos);
      gl.uniform1f(this.mainLoc.uFogStart, 38.0);
      gl.uniform1f(this.mainLoc.uFogEnd, 132.0);

      for (const item of drawList) {
        if (item.doubleSided) gl.disable(gl.CULL_FACE);
        else gl.enable(gl.CULL_FACE);

        gl.uniformMatrix4fv(this.mainLoc.uModel, false, item.model || this.identityMat);
        gl.uniform1f(this.mainLoc.uShininess, item.shininess ?? 24.0);
        gl.uniform1f(this.mainLoc.uSpecStrength, item.specStrength ?? 0.08);
        gl.uniform1f(this.mainLoc.uRimStrength, item.rimStrength ?? 0.12);
        const em = item.emissive || [0, 0, 0];
        gl.uniform3f(this.mainLoc.uEmissive, em[0], em[1], em[2]);

        gl.bindVertexArray(item.mesh.vao);
        gl.drawElements(gl.TRIANGLES, item.mesh.count, item.mesh.glIndexType, 0);
      }

      // --- Pass 3: Sky Dome (depth test LEQUAL so it fills background cleanly) ---
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
      gl.useProgram(this.skyProg);
      gl.uniformMatrix4fv(this.skyLoc.uInvVP, false, this.invVpMat);
      gl.uniform3fv(this.skyLoc.uSunDir, this.sunDir);
      gl.bindVertexArray(this.skyVao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.depthFunc(gl.LESS);

      // --- Pass 4: Soft Billboard Particles ---
      if (particles && particles.length > 0) {
        const count = Math.min(particles.length, this.maxParticles);
        const data = this.particleData;
        for (let i = 0; i < count; i++) {
          const p = particles[i];
          const o = i * 8;
          data[o] = p.x; data[o + 1] = p.y; data[o + 2] = p.z;
          data[o + 3] = p.size;
          data[o + 4] = p.r; data[o + 5] = p.g; data[o + 6] = p.b; data[o + 7] = p.a;
        }
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(this.particleProg);
        gl.uniformMatrix4fv(this.partLoc.uVP, false, this.vpMat);
        // Extract camera right & up from view matrix rows
        gl.uniform3f(this.partLoc.uCamRight, this.viewMat[0], this.viewMat[4], this.viewMat[8]);
        gl.uniform3f(this.partLoc.uCamUp, this.viewMat[1], this.viewMat[5], this.viewMat[9]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.particleInstBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, count * 8));

        gl.bindVertexArray(this.particleVao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
        gl.disable(gl.BLEND);
      }

      gl.depthMask(true);
      gl.bindVertexArray(null);
    }
  }

  global.Renderer = Renderer;
})(window);

