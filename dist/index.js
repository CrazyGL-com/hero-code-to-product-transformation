import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import CrazyGLWrapper, { useContent, useHeroAnimationFrame, useHeroReady, createDeterministicRandom, } from '@crazygl/core';
import metadata from './metadata.json';
import './style.css';
// Keyword sets per language family.
const KW = {
    tsjs: new Set([
        'import', 'from', 'export', 'default', 'const', 'let', 'var', 'function',
        'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
        'continue', 'class', 'extends', 'new', 'this', 'super', 'async', 'await',
        'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in', 'of',
        'true', 'false', 'null', 'undefined', 'void', 'interface', 'type',
        'enum', 'as', 'is', 'declare', 'readonly', 'public', 'private',
        'protected', 'static', 'override', 'yield',
    ]),
    python: new Set([
        'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break',
        'continue', 'pass', 'import', 'from', 'as', 'with', 'try', 'except',
        'finally', 'raise', 'in', 'is', 'not', 'and', 'or', 'lambda', 'global',
        'nonlocal', 'yield', 'async', 'await', 'True', 'False', 'None', 'self',
        'cls', 'print',
    ]),
    go: new Set([
        'package', 'import', 'func', 'return', 'if', 'else', 'for', 'range',
        'switch', 'case', 'default', 'break', 'continue', 'var', 'const', 'type',
        'struct', 'interface', 'map', 'chan', 'go', 'defer', 'select', 'fallthrough',
        'true', 'false', 'nil', 'string', 'int', 'int32', 'int64', 'float32',
        'float64', 'bool', 'byte', 'rune', 'error',
    ]),
    rust: new Set([
        'fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'trait', 'impl',
        'use', 'pub', 'mod', 'return', 'if', 'else', 'for', 'while', 'loop',
        'match', 'break', 'continue', 'as', 'in', 'ref', 'self', 'Self', 'super',
        'crate', 'where', 'async', 'await', 'move', 'dyn', 'box', 'unsafe',
        'true', 'false', 'Some', 'None', 'Ok', 'Err', 'String', 'Vec', 'Option',
        'Result', 'i32', 'i64', 'u32', 'u64', 'f32', 'f64', 'bool', 'usize', 'isize',
    ]),
    bash: new Set([
        'if', 'then', 'else', 'elif', 'fi', 'for', 'do', 'done', 'while', 'until',
        'case', 'esac', 'function', 'return', 'in', 'echo', 'export', 'local',
        'declare', 'readonly', 'unset', 'source', 'exit', 'true', 'false', 'set',
        'shift',
    ]),
};
function tokenizeGeneric(line, keywords, commentToken) {
    const tokens = [];
    let i = 0;
    const len = line.length;
    while (i < len) {
        const ch = line[i];
        // Line comment
        if (commentToken && line.startsWith(commentToken, i)) {
            tokens.push({ text: line.slice(i), cls: 'tk-comment' });
            break;
        }
        // String literal
        if (ch === '"' || ch === "'" || ch === '`') {
            const q = ch;
            let j = i + 1;
            while (j < len && line[j] !== q) {
                if (line[j] === '\\' && j + 1 < len)
                    j += 2;
                else
                    j += 1;
            }
            j = Math.min(j + 1, len);
            tokens.push({ text: line.slice(i, j), cls: 'tk-string' });
            i = j;
            continue;
        }
        // Number
        if (/[0-9]/.test(ch)) {
            let j = i + 1;
            while (j < len && /[0-9._a-fA-FxX]/.test(line[j]))
                j++;
            tokens.push({ text: line.slice(i, j), cls: 'tk-number' });
            i = j;
            continue;
        }
        // Identifier
        if (/[A-Za-z_$]/.test(ch)) {
            let j = i + 1;
            while (j < len && /[A-Za-z0-9_$]/.test(line[j]))
                j++;
            const word = line.slice(i, j);
            let cls = 'tk-ident';
            if (keywords.has(word))
                cls = 'tk-keyword';
            else if (/^[A-Z]/.test(word))
                cls = 'tk-jsx';
            tokens.push({ text: word, cls });
            i = j;
            continue;
        }
        // Punctuation
        if (/[<>/{}()\[\],;.:=+\-*%!?&|^@~]/.test(ch)) {
            tokens.push({ text: ch, cls: 'tk-punct' });
            i += 1;
            continue;
        }
        // Whitespace / fallback
        let j = i + 1;
        while (j < len && /\s/.test(line[j]))
            j++;
        tokens.push({ text: line.slice(i, j), cls: 'tk-ident' });
        i = j;
    }
    return tokens;
}
function tokenizeHTML(line) {
    const tokens = [];
    // Comment line
    if (/<!--/.test(line)) {
        return [{ text: line, cls: 'tk-comment' }];
    }
    const re = /(<\/?[A-Za-z][\w-]*)|(["'][^"']*["'])|(=)|(>|\/>)|([A-Za-z_][\w-]*)|([^\s<>="']+)|(\s+)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        if (m[1])
            tokens.push({ text: m[1], cls: 'tk-jsx' });
        else if (m[2])
            tokens.push({ text: m[2], cls: 'tk-string' });
        else if (m[3])
            tokens.push({ text: m[3], cls: 'tk-punct' });
        else if (m[4])
            tokens.push({ text: m[4], cls: 'tk-punct' });
        else if (m[5])
            tokens.push({ text: m[5], cls: 'tk-attr' });
        else if (m[6])
            tokens.push({ text: m[6], cls: 'tk-ident' });
        else if (m[7])
            tokens.push({ text: m[7], cls: 'tk-ident' });
    }
    return tokens.length > 0 ? tokens : [{ text: line, cls: 'tk-ident' }];
}
function tokenizeCSS(line) {
    const tokens = [];
    // Full-line comment shortcut
    if (line.trimStart().startsWith('/*') || line.trimStart().startsWith('*')) {
        return [{ text: line, cls: 'tk-comment' }];
    }
    const re = /(\/\*.*?\*\/)|("[^"]*"|'[^']*')|(#[0-9a-fA-F]{3,8})|(-?\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|deg)?)|(\.[\w-]+|#[\w-]+|&)|([\w-]+)(?=\s*:)|([{}();:,])|(\s+)|([^\s{}();:,]+)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        if (m[1])
            tokens.push({ text: m[1], cls: 'tk-comment' });
        else if (m[2])
            tokens.push({ text: m[2], cls: 'tk-string' });
        else if (m[3])
            tokens.push({ text: m[3], cls: 'tk-number' });
        else if (m[4])
            tokens.push({ text: m[4], cls: 'tk-number' });
        else if (m[5])
            tokens.push({ text: m[5], cls: 'tk-jsx' });
        else if (m[6])
            tokens.push({ text: m[6], cls: 'tk-attr' });
        else if (m[7])
            tokens.push({ text: m[7], cls: 'tk-punct' });
        else if (m[8])
            tokens.push({ text: m[8], cls: 'tk-ident' });
        else if (m[9])
            tokens.push({ text: m[9], cls: 'tk-ident' });
    }
    return tokens.length > 0 ? tokens : [{ text: line, cls: 'tk-ident' }];
}
function tokenizeJSON(line) {
    const tokens = [];
    const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],:])|(\s+)|([^\s{},:\[\]"]+)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        if (m[1]) {
            // Key vs value distinguished by trailing colon (m[2])
            tokens.push({ text: m[1], cls: m[2] ? 'tk-attr' : 'tk-string' });
            if (m[2])
                tokens.push({ text: m[2], cls: 'tk-punct' });
        }
        else if (m[3])
            tokens.push({ text: m[3], cls: 'tk-keyword' });
        else if (m[4])
            tokens.push({ text: m[4], cls: 'tk-number' });
        else if (m[5])
            tokens.push({ text: m[5], cls: 'tk-punct' });
        else if (m[6])
            tokens.push({ text: m[6], cls: 'tk-ident' });
        else if (m[7])
            tokens.push({ text: m[7], cls: 'tk-ident' });
    }
    return tokens.length > 0 ? tokens : [{ text: line, cls: 'tk-ident' }];
}
function highlightLine(line, lang) {
    const l = (lang || 'plain').toLowerCase();
    if (l === 'plain')
        return [{ text: line, cls: 'tk-ident' }];
    if (l === 'tsx' || l === 'jsx' || l === 'typescript' || l === 'ts' || l === 'javascript' || l === 'js') {
        return tokenizeGeneric(line, KW.tsjs, '//');
    }
    if (l === 'python' || l === 'py')
        return tokenizeGeneric(line, KW.python, '#');
    if (l === 'go')
        return tokenizeGeneric(line, KW.go, '//');
    if (l === 'rust' || l === 'rs')
        return tokenizeGeneric(line, KW.rust, '//');
    if (l === 'bash' || l === 'sh' || l === 'shell')
        return tokenizeGeneric(line, KW.bash, '#');
    if (l === 'html' || l === 'xml')
        return tokenizeHTML(line);
    if (l === 'css' || l === 'scss')
        return tokenizeCSS(line);
    if (l === 'json')
        return tokenizeJSON(line);
    return [{ text: line, cls: 'tk-ident' }];
}
const THEMES = {
    midnight: {
        accentPrimary: '#7ee5ff',
        accentSecondary: '#a995ff',
        accentTertiary: '#ffb478',
        codePanelBg: '#0d1226',
        codeText: '#d9e1ff',
        codeMuted: 'rgba(217, 225, 255, 0.55)',
        productBg: 'rgba(20, 28, 56, 0.55)',
        bgGradient: 'radial-gradient(120% 80% at 30% 25%, rgba(72, 86, 168, 0.45) 0%, rgba(7, 9, 24, 0) 60%), ' +
            'radial-gradient(120% 80% at 78% 65%, rgba(126, 229, 255, 0.22) 0%, rgba(7, 9, 24, 0) 60%), ' +
            'linear-gradient(180deg, #070918 0%, #050616 100%)',
        panelEdge: 'rgba(255, 255, 255, 0.08)',
        heroText: '#f5f8ff',
        heroTextMuted: 'rgba(245, 248, 255, 0.78)',
        onPrimary: '#0b1024',
    },
    daylight: {
        accentPrimary: '#3a6dff',
        accentSecondary: '#ff6b9b',
        accentTertiary: '#f5a623',
        codePanelBg: '#101a36',
        codeText: '#dbe3ff',
        codeMuted: 'rgba(219, 227, 255, 0.6)',
        productBg: 'rgba(255, 255, 255, 0.7)',
        bgGradient: 'radial-gradient(120% 80% at 25% 15%, rgba(184, 207, 255, 0.65) 0%, rgba(241, 246, 255, 0) 65%), ' +
            'radial-gradient(120% 80% at 80% 75%, rgba(255, 200, 215, 0.5) 0%, rgba(241, 246, 255, 0) 60%), ' +
            'linear-gradient(180deg, #f1f6ff 0%, #e3eafb 100%)',
        panelEdge: 'rgba(20, 28, 56, 0.08)',
        heroText: '#0d152e',
        heroTextMuted: 'rgba(13, 21, 46, 0.7)',
        onPrimary: '#ffffff',
    },
    aurora: {
        accentPrimary: '#5ef0c4',
        accentSecondary: '#9d6bff',
        accentTertiary: '#ff7eb6',
        codePanelBg: '#0a0f1e',
        codeText: '#d6f3ff',
        codeMuted: 'rgba(214, 243, 255, 0.55)',
        productBg: 'rgba(14, 24, 44, 0.6)',
        bgGradient: 'radial-gradient(120% 80% at 20% 30%, rgba(94, 240, 196, 0.28) 0%, rgba(6, 10, 22, 0) 60%), ' +
            'radial-gradient(120% 80% at 75% 80%, rgba(157, 107, 255, 0.32) 0%, rgba(6, 10, 22, 0) 60%), ' +
            'linear-gradient(180deg, #04081a 0%, #060a1a 100%)',
        panelEdge: 'rgba(255, 255, 255, 0.07)',
        heroText: '#f1faff',
        heroTextMuted: 'rgba(241, 250, 255, 0.78)',
        onPrimary: '#06231b',
    },
    citrus: {
        accentPrimary: '#ffbf3d',
        accentSecondary: '#ff5e7b',
        accentTertiary: '#73e2a7',
        codePanelBg: '#1a1326',
        codeText: '#ffe8d6',
        codeMuted: 'rgba(255, 232, 214, 0.55)',
        productBg: 'rgba(45, 22, 30, 0.55)',
        bgGradient: 'radial-gradient(120% 80% at 25% 30%, rgba(255, 191, 61, 0.28) 0%, rgba(20, 8, 14, 0) 60%), ' +
            'radial-gradient(120% 80% at 80% 70%, rgba(255, 94, 123, 0.3) 0%, rgba(20, 8, 14, 0) 60%), ' +
            'linear-gradient(180deg, #140811 0%, #1c0d14 100%)',
        panelEdge: 'rgba(255, 255, 255, 0.07)',
        heroText: '#fff3e6',
        heroTextMuted: 'rgba(255, 243, 230, 0.78)',
        onPrimary: '#2a1207',
    },
};
const CODE_THEMES = {
    midnight: {
        bg: '#0d1226', fg: '#d9e1ff', muted: 'rgba(217, 225, 255, 0.55)',
        keyword: '#c792ea', stringC: '#c3e88d', number: '#f78c6c',
        comment: 'rgba(217, 225, 255, 0.4)', jsx: '#82aaff',
    },
    dracula: {
        bg: '#282a36', fg: '#f8f8f2', muted: 'rgba(248, 248, 242, 0.55)',
        keyword: '#ff79c6', stringC: '#f1fa8c', number: '#bd93f9',
        comment: '#6272a4', jsx: '#8be9fd',
    },
    'one-dark': {
        bg: '#282c34', fg: '#abb2bf', muted: 'rgba(171, 178, 191, 0.6)',
        keyword: '#c678dd', stringC: '#98c379', number: '#d19a66',
        comment: '#5c6370', jsx: '#61afef',
    },
    'solarized-dark': {
        bg: '#002b36', fg: '#93a1a1', muted: 'rgba(147, 161, 161, 0.6)',
        keyword: '#859900', stringC: '#2aa198', number: '#d33682',
        comment: '#586e75', jsx: '#268bd2',
    },
    'solarized-light': {
        bg: '#fdf6e3', fg: '#586e75', muted: 'rgba(88, 110, 117, 0.6)',
        keyword: '#859900', stringC: '#2aa198', number: '#d33682',
        comment: '#93a1a1', jsx: '#268bd2',
    },
    'github-light': {
        bg: '#ffffff', fg: '#24292e', muted: 'rgba(36, 41, 46, 0.55)',
        keyword: '#d73a49', stringC: '#032f62', number: '#005cc5',
        comment: '#6a737d', jsx: '#22863a',
    },
    'github-dark': {
        bg: '#0d1117', fg: '#c9d1d9', muted: 'rgba(201, 209, 217, 0.55)',
        keyword: '#ff7b72', stringC: '#a5d6ff', number: '#79c0ff',
        comment: '#8b949e', jsx: '#7ee787',
    },
};
function hexToRgbVec(hex) {
    const h = (hex || '#ffffff').replace('#', '').trim();
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(f.padEnd(6, '0').slice(0, 6), 16);
    if (Number.isNaN(n))
        return [1, 1, 1];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
/* ─── Shader sources ──────────────────────────────────────────────────── */
/* Vertex shader. We compute the bezier on the CPU now (so we can layer
   pointer-driven forces into the position) and pass the final CSS-px
   position directly. Keeping it on the GPU was strictly cheaper but
   makes interactivity hairy — and 4k particles in JS is trivial. */
const VERT_SRC = `#version 300 es
precision highp float;
// Per-particle attributes (allocated once on the CPU side).
in vec2 a_position;   // CSS px final position (bezier + pointer force)
in vec3 a_color;      // accent colour for this particle
in float a_phase;     // 0..1 progress along its arc
in float a_seed;      // per-particle deterministic seed in 0..1
in float a_size;      // base size multiplier

uniform vec2 u_resolution;  // canvas px size
uniform float u_globalSize; // user particleSize slider
uniform float u_dpr;        // device pixel ratio (we drew at scaled size)

out vec3 v_color;
out float v_phase;
out float v_jitter;

void main() {
    float u = clamp(a_phase, 0.0, 1.0);
    // Convert CSS px to clip space.
    vec2 clip = vec2(
        (a_position.x / u_resolution.x) * 2.0 - 1.0,
        1.0 - (a_position.y / u_resolution.y) * 2.0
    );
    gl_Position = vec4(clip, 0.0, 1.0);

    // Size envelope: small at lift-off (u≈0), grows in the middle, shrinks
    // sharply at the snap (u→1). Bell curve.
    float bell = pow(sin(u * 3.14159), 0.85);
    float snap = smoothstep(0.92, 1.0, u);
    // Base ~5-12 CSS px, scaled by u_dpr because gl_PointSize is in device px.
    float sizePx = (3.5 + 8.0 * bell * a_size) * u_globalSize * u_dpr;
    sizePx *= 1.0 + snap * 0.6;
    gl_PointSize = clamp(sizePx, 1.0, 64.0);

    v_color = a_color;
    v_phase = u;
    v_jitter = a_seed;
}
`;
const FRAG_SRC = `#version 300 es
precision highp float;
in vec3 v_color;
in float v_phase;
in float v_jitter;
out vec4 outColor;

void main() {
    // Soft circular sprite. gl_PointCoord is 0..1 across the point.
    vec2 q = gl_PointCoord - 0.5;
    float r = length(q);
    if (r > 0.5) discard;
    // Three-zone sprite: bright core (white-hot), tight inner halo, soft long-falloff outer halo.
    // The long-falloff outer halo is what reads as a "streak of light" rather than a hard dot.
    float core  = smoothstep(0.18, 0.0, r);                    // bright hot core
    float inner = smoothstep(0.38, 0.04, r);                   // saturated mid
    float outer = pow(1.0 - smoothstep(0.0, 0.5, r), 1.8);     // long soft falloff
    float alpha = core * 1.8 + inner * 0.55 + outer * 0.22;

    // Lifetime envelope: fade in at start, hold, sharp pulse at snap, then fade.
    float fadeIn  = smoothstep(0.0, 0.08, v_phase);
    float fadeOut = 1.0 - smoothstep(0.93, 1.05, v_phase);
    float snap    = exp(-pow((v_phase - 0.96) * 22.0, 2.0)); // gaussian pulse at u=0.96
    float life    = fadeIn * fadeOut + snap * 0.6;

    // Brighten the core toward white (head reads hot/white) and shift snap toward white too.
    vec3 hot = mix(v_color, vec3(1.0), core * 0.6 + snap * 0.55);

    outColor = vec4(hot * (alpha * life), alpha * life);
}
`;
/* ─── Fade quad (renders a translucent backdrop colour over the previous
   frame to taper the trail). One triangle covering clip space. */
const FADE_VERT = `#version 300 es
precision highp float;
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;
const FADE_FRAG = `#version 300 es
precision highp float;
uniform vec4 u_fade;
out vec4 outColor;
void main() { outColor = u_fade; }
`;
function compile(gl, type, src) {
    const sh = gl.createShader(type);
    if (!sh)
        return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        // eslint-disable-next-line no-console
        console.error('[code-to-product-transformation] shader compile failed:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
    }
    return sh;
}
function linkProgram(gl, vs, fs) {
    const p = gl.createProgram();
    if (!p)
        return null;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        // eslint-disable-next-line no-console
        console.error('[code-to-product-transformation] program link failed:', gl.getProgramInfoLog(p));
        gl.deleteProgram(p);
        return null;
    }
    return p;
}
/* ─── Inner hero component ────────────────────────────────────────────── */
function CodeToProductInner(props) {
    const { size, input, reducedMotion, seed = 1, rootRef, 
    // Code
    codeText = '', codeLanguage = 'tsx', codePanelLabel = 'Dashboard.tsx', codePanelTheme = 'midnight', 
    // Product
    screenshot = 'https://crazygl.com/samples/screenshot-dashboard-light.avif', productLabel = 'Live preview', productMetaText = 'v1.0 · production', 
    // Transformation
    transformationSpeed = 0.72, particleDensity = 0.2, particleSize = 0.55, arcCurvature = 0.25, trailLength = 0.34, pointerInfluence = 1, 
    // Theme
    colorTheme = 'midnight', accentPrimary, accentSecondary, accentTertiary, codePanelTint, 
    // Background
    transparentBackground = false, bgColor = '#070918', 
    // CTA
    ctaLabel = 'Start building', onCTAClick = '', ctaTextColor = '#0b1024', ctaBgColor = '#7ee5ff', } = props;
    const content = useContent(props);
    useHeroReady(props);
    /* Resolve theme palette. 'custom' uses user-supplied accent values. */
    const palette = React.useMemo(() => {
        const base = THEMES[colorTheme] ?? THEMES.midnight;
        if (colorTheme === 'custom') {
            return {
                ...base,
                accentPrimary: accentPrimary || base.accentPrimary,
                accentSecondary: accentSecondary || base.accentSecondary,
                accentTertiary: accentTertiary || base.accentTertiary,
                codePanelBg: codePanelTint || base.codePanelBg,
            };
        }
        return base;
    }, [colorTheme, accentPrimary, accentSecondary, accentTertiary, codePanelTint]);
    /* Resolve the code panel theme (independent of the hero accent palette). */
    const codeTheme = React.useMemo(() => {
        return CODE_THEMES[codePanelTheme] ?? CODE_THEMES.midnight;
    }, [codePanelTheme]);
    /* CSS variables driven from the active palette + code theme. The code
       theme overrides the panel bg / fg / token colours, while the hero
       palette still drives accents, hero text, and CTA. */
    const themeVars = React.useMemo(() => ({
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ['--ctp-accent-primary']: palette.accentPrimary,
        ['--ctp-accent-secondary']: palette.accentSecondary,
        ['--ctp-accent-tertiary']: palette.accentTertiary,
        ['--ctp-accent-on-primary']: palette.onPrimary,
        ['--ctp-code-bg']: codeTheme.bg,
        ['--ctp-code-fg']: codeTheme.fg,
        ['--ctp-code-muted']: codeTheme.muted,
        ['--ctp-tk-keyword']: codeTheme.keyword,
        ['--ctp-tk-string']: codeTheme.stringC,
        ['--ctp-tk-number']: codeTheme.number,
        ['--ctp-tk-comment']: codeTheme.comment,
        ['--ctp-tk-jsx']: codeTheme.jsx,
        ['--ctp-tk-attr']: codeTheme.number,
        ['--ctp-tk-punct']: codeTheme.muted,
        ['--ctp-tk-ident']: codeTheme.fg,
        ['--ctp-product-bg']: palette.productBg,
        ['--ctp-panel-edge']: palette.panelEdge,
        ['--ctp-text']: palette.heroText,
        ['--ctp-text-muted']: palette.heroTextMuted,
    }), [palette, codeTheme]);
    /* Split code into lines once per change. */
    const codeLines = React.useMemo(() => {
        const text = typeof codeText === 'string' ? codeText : '';
        // Cap to 20 visible lines for layout sanity; users can shorten if needed.
        return text.split('\n').slice(0, 20);
    }, [codeText]);
    const highlightedLines = React.useMemo(() => codeLines.map((line) => highlightLine(line, String(codeLanguage))), [codeLines, codeLanguage]);
    /* Compact layout (single-column) when the hero is narrower than ~680px. */
    const compact = (size?.width ?? 1200) < 720;
    /* DOM refs for the canvas + the two anchor panels. We measure their
       bounding rects each frame so particle endpoints follow the layout
       (responsive, height-resize, font reflow all just work). */
    const canvasRef = React.useRef(null);
    const codePanelRef = React.useRef(null);
    const productPanelRef = React.useRef(null);
    const codeBodyRef = React.useRef(null);
    const productImgRef = React.useRef(null);
    const ctaRef = React.useRef(null);
    /* Live-prop ref so the rAF reads the latest values without re-running
       the GL init effect. */
    const propsRef = React.useRef({
        transformationSpeed, particleDensity, particleSize,
        arcCurvature, trailLength, pointerInfluence,
        palette, bgColor, transparentBackground, reducedMotion,
        input,
    });
    propsRef.current.transformationSpeed = transformationSpeed;
    propsRef.current.particleDensity = particleDensity;
    propsRef.current.particleSize = particleSize;
    propsRef.current.arcCurvature = arcCurvature;
    propsRef.current.trailLength = trailLength;
    propsRef.current.pointerInfluence = pointerInfluence;
    propsRef.current.palette = palette;
    propsRef.current.bgColor = bgColor;
    propsRef.current.transparentBackground = transparentBackground;
    propsRef.current.reducedMotion = reducedMotion;
    propsRef.current.input = input;
    /* GL state — allocated once. All particle data lives in `cpu` arrays;
       the GPU buffer is rewritten each frame with the slice in use. */
    const stateRef = React.useRef({
        ready: false,
        gl: null,
        prog: null,
        fadeProg: null,
        vao: null,
        vbo: null,
        fadeVbo: null,
        uniforms: {},
        fadeUniforms: {},
        // CPU particle storage (mutated in place every frame).
        maxParticles: 0,
        buffer: null,
        live: null, // 1 = active, 0 = available slot
        phase: null, // 0..1.05; >1 = exiting
        source: null, // n*2
        target: null, // n*2
        color: null, // n*3
        seed: null, // n
        baseSize: null, // n
        // Trail history: a ring buffer of recent positions per particle.
        // Layout: trailX[i * TRAIL_LEN + k], trailY[i * TRAIL_LEN + k].
        // trailWrite[i] = next index to write (mod TRAIL_LEN).
        trailLen: 0,
        trailX: null,
        trailY: null,
        trailWrite: null,
        emissionAccumulator: 0,
        rng: null,
        canvasW: 0,
        canvasH: 0,
        dpr: 1,
        // Pointer interaction strength (eased in/out so the swirl doesn't
        // pop when the cursor enters or leaves the hero).
        pointerActivity: 0,
        // One-shot pre-roll flag. The simulation starts from an empty field;
        // before the first frame is rendered we advance the spawner+integrator
        // by ~4 seconds of simulated time so the user sees an in-flight,
        // mid-trajectory field of particles immediately rather than watching
        // it populate from nothing.
        prerolled: false,
    });
    /* ── GL init: one-shot ─────────────────────────────────────────── */
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        // Canvas outputs premultiplied colour (the fragment shader writes
        // `vec4(col * alpha, alpha)`) — the compositor MUST also treat it
        // as premultiplied, otherwise it applies a second alpha multiply on
        // upload and the particles get squared down to invisibility.
        const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true });
        if (!gl) {
            // eslint-disable-next-line no-console
            console.warn('[code-to-product-transformation] WebGL2 not available; hero will render static panels.');
            return;
        }
        const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
        if (!vs || !fs)
            return;
        const prog = linkProgram(gl, vs, fs);
        if (!prog)
            return;
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        const fvs = compile(gl, gl.VERTEX_SHADER, FADE_VERT);
        const ffs = compile(gl, gl.FRAGMENT_SHADER, FADE_FRAG);
        if (!fvs || !ffs)
            return;
        const fadeProg = linkProgram(gl, fvs, ffs);
        if (!fadeProg)
            return;
        gl.deleteShader(fvs);
        gl.deleteShader(ffs);
        const MAX = 4000;
        const TRAIL_LEN = 10;
        // Layout per draw record (8 floats / 32 bytes):
        //   pos.xy (0,4) | col.rgb (8,12,16) | phase (20) | seed (24) | size (28)
        // We render head + (TRAIL_LEN) tail samples per live particle, so the
        // buffer is sized to MAX * (TRAIL_LEN + 1) records.
        const FLOATS_PER = 8;
        const buffer = new Float32Array(MAX * (TRAIL_LEN + 1) * FLOATS_PER);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, buffer.byteLength, gl.DYNAMIC_DRAW);
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        const stride = FLOATS_PER * 4;
        const a_position = gl.getAttribLocation(prog, 'a_position');
        const a_color = gl.getAttribLocation(prog, 'a_color');
        const a_phase = gl.getAttribLocation(prog, 'a_phase');
        const a_seed = gl.getAttribLocation(prog, 'a_seed');
        const a_size = gl.getAttribLocation(prog, 'a_size');
        const enableAttr = (loc, sz, offBytes) => {
            if (loc < 0)
                return;
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, sz, gl.FLOAT, false, stride, offBytes);
        };
        enableAttr(a_position, 2, 0);
        enableAttr(a_color, 3, 8);
        enableAttr(a_phase, 1, 20);
        enableAttr(a_seed, 1, 24);
        enableAttr(a_size, 1, 28);
        gl.bindVertexArray(null);
        // Fade quad — one big triangle covering clip space.
        const fadeVbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, fadeVbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const state = stateRef.current;
        state.gl = gl;
        state.prog = prog;
        state.fadeProg = fadeProg;
        state.vao = vao;
        state.vbo = vbo;
        state.fadeVbo = fadeVbo;
        state.maxParticles = MAX;
        state.buffer = buffer;
        state.live = new Uint8Array(MAX);
        state.phase = new Float32Array(MAX);
        state.source = new Float32Array(MAX * 2);
        state.target = new Float32Array(MAX * 2);
        state.color = new Float32Array(MAX * 3);
        state.seed = new Float32Array(MAX);
        state.baseSize = new Float32Array(MAX);
        state.trailLen = TRAIL_LEN;
        state.trailX = new Float32Array(MAX * TRAIL_LEN);
        state.trailY = new Float32Array(MAX * TRAIL_LEN);
        state.trailWrite = new Int32Array(MAX);
        state.uniforms.u_resolution = gl.getUniformLocation(prog, 'u_resolution');
        state.uniforms.u_globalSize = gl.getUniformLocation(prog, 'u_globalSize');
        state.uniforms.u_dpr = gl.getUniformLocation(prog, 'u_dpr');
        state.fadeUniforms.u_fade = gl.getUniformLocation(fadeProg, 'u_fade');
        state.rng = createDeterministicRandom(seed * 999 + 17).next;
        state.ready = true;
        return () => {
            try {
                gl.deleteBuffer(vbo);
            }
            catch { }
            try {
                gl.deleteBuffer(fadeVbo);
            }
            catch { }
            try {
                gl.deleteVertexArray(vao);
            }
            catch { }
            try {
                gl.deleteProgram(prog);
            }
            catch { }
            try {
                gl.deleteProgram(fadeProg);
            }
            catch { }
            state.ready = false;
            state.gl = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    /* ── Resize: keep the canvas backing store matched to CSS pixels. */
    React.useEffect(() => {
        const canvas = canvasRef.current;
        const state = stateRef.current;
        if (!canvas || !state.gl)
            return;
        const dpr = Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 2);
        const w = Math.max(2, Math.floor((size?.width || canvas.parentElement?.clientWidth || 1280) * 1));
        const h = Math.max(2, Math.floor((size?.height || canvas.parentElement?.clientHeight || 720) * 1));
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        state.canvasW = w;
        state.canvasH = h;
        state.dpr = dpr;
        state.gl.viewport(0, 0, canvas.width, canvas.height);
        // Hard clear on resize so we don't keep stretched old content.
        state.gl.clearColor(0, 0, 0, 0);
        state.gl.clear(state.gl.COLOR_BUFFER_BIT);
    }, [size?.width, size?.height]);
    /* ── Animation loop ────────────────────────────────────────────── */
    useHeroAnimationFrame(rootRef, ({ delta }) => {
        const state = stateRef.current;
        const gl = state.gl;
        if (!gl || !state.ready || !state.prog)
            return;
        const live = propsRef.current;
        const reduced = !!live.reducedMotion;
        const codeRect = codeBodyRef.current?.getBoundingClientRect();
        const productImgEl = productImgRef.current;
        const productRect = productImgEl?.getBoundingClientRect();
        const hostRect = canvasRef.current?.getBoundingClientRect();
        if (!codeRect || !productRect || !hostRect) {
            // Layout not ready yet — just clear and return.
            gl.viewport(0, 0, state.canvasW * state.dpr, state.canvasH * state.dpr);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            return;
        }
        const W = state.canvasW;
        const H = state.canvasH;
        // Convert DOM rects into canvas-px space (origin top-left of host).
        const code = {
            left: codeRect.left - hostRect.left,
            top: codeRect.top - hostRect.top,
            width: codeRect.width,
            height: codeRect.height,
        };
        const product = {
            left: productRect.left - hostRect.left,
            top: productRect.top - hostRect.top,
            width: productRect.width,
            height: productRect.height,
        };
        const speed = Math.max(0.05, live.transformationSpeed) * (reduced ? 0.0 : 1.0);
        const rng = state.rng;
        const accentPalette = [
            hexToRgbVec(live.palette.accentPrimary),
            hexToRgbVec(live.palette.accentSecondary),
            hexToRgbVec(live.palette.accentTertiary),
        ];
        const MAX = state.maxParticles;
        /* ── runStep: one simulation tick ─────────────────────────────────
           Extracted into a closure so we can call it many times during the
           pre-roll (advance the field to steady state before first paint)
           AND once per rAF tick for the live loop. The closure writes
           particle records into `buf` and tracks `drawCount` via the outer
           variable; the actual GL draw happens once at the bottom of the
           callback after all step(s) complete.

           `simulatePointer` is false during pre-roll — at startup we have no
           meaningful pointer interaction history, and skipping the swirl
           keeps the pre-rolled field clean. */
        const TRAIL_LEN = state.trailLen;
        const trailX = state.trailX;
        const trailY = state.trailY;
        const trailWrite = state.trailWrite;
        const buf = state.buffer;
        const FLOATS_PER = 8;
        // trailFactor scales how many of the TRAIL_LEN samples we actually
        // draw, plus how strongly they fade. 0 → no trail; 1 → full trail.
        const trailFactor = Math.max(0, Math.min(1, live.trailLength));
        const trailVisible = Math.max(0, Math.round(TRAIL_LEN * trailFactor));
        // Swirl radius in CSS px — particles within this radius of the
        // pointer get pushed tangentially around it.
        const swirlR = 150;
        const swirlR2 = swirlR * swirlR;
        // Arc parameters — positive arcLift pulls the bezier control point
        // upward (CSS px Y decreases). Scaled by horizontal distance so
        // layouts of any width arc the same shape, but clamped so wide
        // layouts don't produce a dramatic ballistic-drop trajectory.
        const horizSpan = Math.max(40, Math.abs(product.left - (code.left + code.width)));
        let arcLift = live.arcCurvature * (horizSpan + product.height * 0.4);
        // Cap the lift to a fraction of the product height so the descent
        // phase stays short and gentle even on very wide layouts. Preserve
        // sign so negative curvature (downward arc) still works.
        const arcLiftCap = product.height * 0.6;
        if (arcLift > arcLiftCap)
            arcLift = arcLiftCap;
        else if (arcLift < -arcLiftCap)
            arcLift = -arcLiftCap;
        // Approach distance for the cubic bezier's second control point.
        // Sits at (tx - approach, ty) so the final tangent is horizontal —
        // particles glide into the panel flat instead of falling onto it.
        const approach = Math.max(40, horizSpan * 0.28);
        let drawCount = 0;
        const runStep = (dtFrame, simulatePointer) => {
            drawCount = 0;
            /* Emission: spawn new particles at a rate scaled by particleDensity.
               Density 1.0 → ~190 particles/sec; density 0 → 0. */
            const emissionPerSec = reduced ? 24 : 190 * Math.max(0, live.particleDensity);
            state.emissionAccumulator += emissionPerSec * dtFrame;
            const toSpawn = Math.min(80, Math.floor(state.emissionAccumulator));
            state.emissionAccumulator -= toSpawn;
            let spawned = 0;
            // Find available slots and fill them with fresh particles.
            for (let i = 0; spawned < toSpawn && i < MAX; i++) {
                if (state.live[i])
                    continue;
                // Source: random point inside the code body rect, snapped to a
                // loose character grid so the lift-off reads as "characters" rather
                // than "pixels".
                const COLS = 28; // approx character columns
                const ROWS = Math.max(8, Math.floor(code.height / 18));
                const col = Math.floor(rng() * COLS);
                const row = Math.floor(rng() * ROWS);
                const sxGrid = (col + 0.5 + (rng() - 0.5) * 0.4) / COLS;
                const sx = code.left + (0.72 + sxGrid * 0.24) * code.width;
                const sy = code.top + (row + 0.5 + (rng() - 0.5) * 0.4) * (code.height / ROWS);
                // Target: enter the LEFT edge of the product panel at roughly the
                // same vertical height the particle was spawned at. This keeps the
                // trajectory mostly horizontal — particles flow flat across the gap
                // instead of "falling" toward a randomly-lower product-panel row.
                // A small vertical jitter (±18 px) keeps the stream lively without
                // turning every particle into a slope.
                const TX = 32;
                const tcol = Math.floor(rng() * TX);
                const txGrid = (tcol + 0.5) / TX;
                const tx = product.left + (0.03 + txGrid * 0.22) * product.width + (rng() - 0.5) * 4;
                // Clamp target Y to the product panel's vertical bounds so particles
                // don't aim above/below the panel when sy lies outside it.
                const productYMin = product.top + product.height * 0.08;
                const productYMax = product.top + product.height * 0.92;
                const tyRaw = sy + (rng() - 0.5) * 36;
                const ty = Math.max(productYMin, Math.min(productYMax, tyRaw));
                const c = accentPalette[Math.floor(rng() * 3)];
                state.source[i * 2 + 0] = sx;
                state.source[i * 2 + 1] = sy;
                state.target[i * 2 + 0] = tx;
                state.target[i * 2 + 1] = ty;
                state.color[i * 3 + 0] = c[0];
                state.color[i * 3 + 1] = c[1];
                state.color[i * 3 + 2] = c[2];
                state.phase[i] = -0.05 * rng(); // small stagger
                state.seed[i] = rng();
                state.baseSize[i] = 0.6 + rng() * 0.8;
                // Reset trail for this slot — fill all history samples with the
                // source position so the first frames don't streak from (0,0).
                const tw = state.trailLen;
                for (let k = 0; k < tw; k++) {
                    state.trailX[i * tw + k] = sx;
                    state.trailY[i * tw + k] = sy;
                }
                state.trailWrite[i] = 0;
                state.live[i] = 1;
                spawned++;
            }
            /* Pointer position in canvas (CSS) px. `input` is unified [0..1]²
               from core; `active` flags whether the cursor is actually on the
               hero (vs idle defaults). We smoothly fade the swirl strength
               when the pointer leaves so it doesn't snap off. During pre-roll
               we skip pointer entirely — no live cursor yet. */
            const inp = simulatePointer ? (live.input ?? null) : null;
            const pInf = Math.max(0, live.pointerInfluence ?? 1);
            const targetActivity = inp && inp.active ? 1 : 0;
            // Exponential approach toward target — ~150ms time constant.
            const k = 1 - Math.exp(-dtFrame / 0.15);
            state.pointerActivity = (state.pointerActivity ?? 0) + (targetActivity - (state.pointerActivity ?? 0)) * k;
            const px = inp ? inp.x * W : 0;
            const py = inp ? inp.y * H : 0;
            const pointerStrength = simulatePointer ? pInf * state.pointerActivity : 0;
            /* Phase update + bezier evaluation + pointer force. Mutate in
               place; mark expired slots free. */
            const phaseStep = dtFrame * speed * 0.42; // base lifetime ≈ 1/0.42 ≈ 2.4s at speed 1
            for (let i = 0; i < MAX; i++) {
                if (!state.live[i])
                    continue;
                let p = state.phase[i];
                // In reduced motion, hold particles at their current phase
                // (effectively static — but emission still trickles at 30/sec to
                // keep the field populated).
                p += reduced ? 0 : phaseStep * (0.85 + 0.3 * state.seed[i]);
                if (p > 1.06) {
                    state.live[i] = 0;
                    continue;
                }
                state.phase[i] = p;
                const u = p < 0 ? 0 : (p > 1 ? 1 : p);
                const sx = state.source[i * 2 + 0];
                const sy = state.source[i * 2 + 1];
                const tx = state.target[i * 2 + 0];
                const ty = state.target[i * 2 + 1];
                // Cubic bezier with two control points:
                //   C1: lifted above the SOURCE Y (not the midpoint) — pulling the
                //       control closer to the source moves the arc peak earlier
                //       (u≈0.2 instead of u≈1/3). The descent phase becomes shorter
                //       and the apparent "falling" reads as a gentle glide rather
                //       than a ballistic drop.
                //   C2: directly LEFT of the target, at the SAME Y as the target —
                //       this forces the tangent at u=1 to be horizontal, so particles
                //       glide into the panel flat instead of falling down onto it.
                // Without C2, a quadratic bezier with a lifted midpoint has a
                // descending final tangent, which reads as "particles falling onto
                // the right card" — the bug we're fixing here.
                const wob = (state.seed[i] - 0.5) * 60;
                const c1x = (sx + tx) * 0.5 + wob;
                // Pull C1 toward source Y, lifted by half arcLift. When arcLift=0
                // this collapses to c1y=sy, and combined with c2y=ty the curve
                // becomes a smooth horizontal-to-horizontal S — a clean river.
                const c1y = sy - arcLift * 0.5;
                // Second control: directly left of target, same Y as target.
                // `approach` is hoisted above the runStep loop.
                const c2x = tx - approach;
                const c2y = ty;
                const inv = 1 - u;
                const inv2 = inv * inv;
                const u2 = u * u;
                let x = inv2 * inv * sx + 3 * inv2 * u * c1x + 3 * inv * u2 * c2x + u2 * u * tx;
                let y = inv2 * inv * sy + 3 * inv2 * u * c1y + 3 * inv * u2 * c2y + u2 * u * ty;
                // Pointer interaction: a soft swirl around the cursor + outward
                // push. Force scales with `pointerStrength` (smoothly eased on
                // enter/leave via the 150ms time-constant above). Strong enough
                // to be visible as the cursor sweeps across the river.
                if (pointerStrength > 0.001 && inp) {
                    const dx = x - px;
                    const dy = y - py;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < swirlR2 && d2 > 0.0001) {
                        const d = Math.sqrt(d2);
                        const falloff = 1 - d / swirlR; // 1 at centre → 0 at radius
                        const force = falloff * falloff * pointerStrength;
                        // Tangent vector (perpendicular to radial), CCW.
                        const tx2 = -dy / d;
                        const ty2 = dx / d;
                        // Swirl + outward push so the river clearly bends around
                        // the cursor rather than collapsing into it.
                        const swirl = 90 * force;
                        const push = 55 * force;
                        x += tx2 * swirl + (dx / d) * push;
                        y += ty2 * swirl + (dy / d) * push;
                    }
                }
                // Write head record.
                const cr = state.color[i * 3 + 0];
                const cg = state.color[i * 3 + 1];
                const cb = state.color[i * 3 + 2];
                const sd = state.seed[i];
                const bs = state.baseSize[i];
                let base = drawCount * FLOATS_PER;
                buf[base + 0] = x;
                buf[base + 1] = y;
                buf[base + 2] = cr;
                buf[base + 3] = cg;
                buf[base + 4] = cb;
                buf[base + 5] = p;
                buf[base + 6] = sd;
                buf[base + 7] = bs;
                drawCount++;
                // Push current position into the trail ring buffer.
                const w = trailWrite[i];
                trailX[i * TRAIL_LEN + w] = x;
                trailY[i * TRAIL_LEN + w] = y;
                trailWrite[i] = (w + 1) % TRAIL_LEN;
                // Emit trail samples (oldest → newest). Each gets a faded
                // "phase" so the fragment lifetime envelope dims it, and a
                // smaller size so the head reads as the brightest sample.
                // Trail samples are emitted at fractional steps for tighter spacing,
                // reading as a smooth comet tail rather than a stippled chain.
                for (let k = 0; k < trailVisible; k++) {
                    const age = k + 1; // 1 = freshest behind head, larger = older
                    // ringIdx = (w - age + TRAIL_LEN) mod TRAIL_LEN
                    const ringIdx = ((w - age) % TRAIL_LEN + TRAIL_LEN) % TRAIL_LEN;
                    const tx_ = trailX[i * TRAIL_LEN + ringIdx];
                    const ty_ = trailY[i * TRAIL_LEN + ringIdx];
                    // Skip zero-history samples (just-spawned).
                    if (tx_ === 0 && ty_ === 0)
                        continue;
                    const decay = 1 - age / (trailVisible + 1); // 1 → 0 across the tail
                    // Cool the colour along the tail: head stays warm/hot, the tail
                    // shifts toward a cooler blueish hue. Subtle but reads as a
                    // comet streak rather than a chain of identical dots.
                    const cool = 1 - decay; // 0 at head → 1 at tail tip
                    const tcr = cr * (1 - cool * 0.35);
                    const tcg = cg * (1 - cool * 0.18);
                    const tcb = cb * (1 - cool * 0.0) + cool * 0.15;
                    base = drawCount * FLOATS_PER;
                    buf[base + 0] = tx_;
                    buf[base + 1] = ty_;
                    buf[base + 2] = tcr;
                    buf[base + 3] = tcg;
                    buf[base + 4] = tcb;
                    // Reuse a mid-life phase so the fragment shader fades but
                    // doesn't pulse — multiplied down by the size factor below.
                    buf[base + 5] = 0.5;
                    buf[base + 6] = sd;
                    // Trail samples shrink with age and overall trail factor.
                    // Slightly larger near head, falling off faster than linear so
                    // the head reads as clearly the brightest part.
                    buf[base + 7] = bs * decay * decay * 0.85;
                    drawCount++;
                }
            }
        };
        /* ── Pre-roll: advance the simulation to steady state ──────────
           On the very first frame after the DOM panels are measurable, run
           the spawner + integrator forward by ~4 seconds of simulated time
           in fixed steps. This populates the buffer pool, runs particles
           along their trajectories, and recycles slots — so the user's
           first painted frame already shows a fully in-flight stream
           rather than starting from an empty canvas and watching it fill.

           We use 1/60s fixed steps so the spawner produces a deterministic
           number of particles per pre-roll second, independent of the host
           frame budget. Reduced motion skips the pre-roll — the trickle
           emission rate keeps the field looking right on its own.

           Layout validation: the rects we just measured must actually
           describe a stable, non-overlapping layout. If panels haven't
           finished positioning (hydration, font load shift, compact-mode
           transition), pre-roll would bake particles with wrong source/
           target positions and the user sees a burst of particles flowing
           in the wrong direction on first paint. Gate pre-roll on a
           geometric sanity check covering both the side-by-side and the
           compact (stacked) layouts. */
        const layoutValid = code.width > 80 &&
            product.width > 80 &&
            code.height > 40 &&
            product.height > 40 &&
            (
            // Side-by-side: product meaningfully to the right of code centre.
            product.left > code.left + code.width * 0.5 ||
                // Compact / stacked: product meaningfully below code centre.
                product.top > code.top + code.height * 0.5);
        if (!state.prerolled && !reduced && layoutValid) {
            const PREROLL_SECONDS = 4;
            const FIXED_DT = 1 / 60;
            const steps = Math.floor(PREROLL_SECONDS / FIXED_DT);
            for (let s = 0; s < steps; s++)
                runStep(FIXED_DT, false);
            state.prerolled = true;
        }
        else if (state.prerolled && !layoutValid) {
            // Defensive: a catastrophic layout shift after pre-roll (window
            // resize collapsed a panel, image swap mid-flight, etc.) would
            // leave in-flight particles flying along stale trajectories.
            // Kill them all and re-pre-roll once the layout is sane again.
            for (let i = 0; i < MAX; i++)
                state.live[i] = 0;
            state.prerolled = false;
        }
        /* ── Live tick. Clamp huge delta (tab refocus). ──────────────── */
        const dtFrame = Math.min(0.05, Math.max(0, delta));
        runStep(dtFrame, true);
        /* ── Render ───────────────────────────────────────────────── */
        gl.viewport(0, 0, state.canvasW * state.dpr, state.canvasH * state.dpr);
        // Clear to fully transparent every frame. The canvas sits ABOVE the
        // DOM panels (z-index 3), so anything we paint here composites over
        // the code/screenshot via the DOM compositor. The trail is now
        // produced from the per-particle history buffer rather than by
        // "fade-quad over previous frame" (which would dim the panels
        // underneath every frame).
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // Draw particles + their trails additively.
        // Fragment shader emits premultiplied colour (`col * alpha`, alpha) so
        // additive blend is plain (ONE, ONE) — multiplying by SRC_ALPHA again
        // would square the alpha and make particles invisible.
        if (drawCount > 0) {
            gl.enable(gl.BLEND);
            gl.useProgram(state.prog);
            gl.uniform2f(state.uniforms.u_resolution, state.canvasW, state.canvasH);
            gl.uniform1f(state.uniforms.u_globalSize, Math.max(0.1, live.particleSize));
            gl.uniform1f(state.uniforms.u_dpr, state.dpr);
            gl.bindVertexArray(state.vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, state.vbo);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf.subarray(0, drawCount * FLOATS_PER));
            gl.blendFunc(gl.ONE, gl.ONE);
            gl.drawArrays(gl.POINTS, 0, drawCount);
            gl.bindVertexArray(null);
        }
    });
    /* ── CTA click handler — string-or-function single prop. ──────── */
    const handleCTAClick = React.useCallback((e) => {
        if (typeof onCTAClick === 'function') {
            e.preventDefault();
            onCTAClick(e);
            return;
        }
        if (typeof onCTAClick === 'string' && onCTAClick.length > 0) {
            e.preventDefault();
            window.location.href = onCTAClick;
        }
    }, [onCTAClick]);
    const showDefaultCta = props.contentType !== 'custom' && ctaLabel;
    /* The stage-bg layer is a real DOM div with the theme gradient — gives
       a punchy backdrop without needing the canvas to paint solid colour
       (and so transparent toggling Just Works by hiding this div). */
    const stageBgStyle = transparentBackground
        ? { display: 'none' }
        : { background: palette.bgGradient };
    const panelTiltStyle = React.useMemo(() => {
        const px = ((input?.x ?? 0.5) - 0.5) * 2;
        const py = ((input?.y ?? 0.5) - 0.5) * 2;
        const strength = Math.max(0, Math.min(1.4, pointerInfluence ?? 1));
        return {
            ['--ctp-tilt-x']: `${(-py * 7 * strength).toFixed(3)}deg`,
            ['--ctp-tilt-y']: `${(px * 10 * strength).toFixed(3)}deg`,
            ['--ctp-left-shift']: `${(-px * 10 * strength).toFixed(2)}px`,
            ['--ctp-right-shift']: `${(px * 12 * strength).toFixed(2)}px`,
        };
    }, [input?.x, input?.y, pointerInfluence]);
    return (_jsxs(_Fragment, { children: [_jsxs("crazygl-stage", { style: { position: 'absolute', inset: 0, zIndex: 0, ...themeVars }, children: [_jsx("div", { className: "crazygl-ctp-stage-bg", style: stageBgStyle, "aria-hidden": "true" }), _jsxs("div", { className: `crazygl-ctp-panels${compact ? ' compact' : ''}`, style: panelTiltStyle, "aria-hidden": "true", children: [_jsxs("div", { className: "crazygl-ctp-code-panel", ref: codePanelRef, children: [_jsxs("div", { className: "crazygl-ctp-code-chrome", children: [_jsx("span", { className: "crazygl-ctp-code-dot r" }), _jsx("span", { className: "crazygl-ctp-code-dot y" }), _jsx("span", { className: "crazygl-ctp-code-dot g" }), _jsx("span", { className: "crazygl-ctp-code-filename", children: codePanelLabel })] }), _jsx("div", { className: "crazygl-ctp-code-body", ref: codeBodyRef, children: highlightedLines.map((tokens, lineIdx) => (_jsxs("span", { className: "crazygl-ctp-code-line", children: [tokens.map((t, i) => (_jsx("span", { className: t.cls, children: t.text }, i))), lineIdx === highlightedLines.length - 1 ? (_jsx("span", { className: "crazygl-ctp-code-cursor" })) : null, tokens.length === 0 ? ' ' : null] }, lineIdx))) })] }), _jsxs("div", { className: "crazygl-ctp-product-panel", ref: productPanelRef, children: [_jsxs("div", { className: "crazygl-ctp-product-chrome", children: [productLabel ? (_jsx("span", { className: "crazygl-ctp-product-badge", children: productLabel })) : _jsx("span", {}), productMetaText ? _jsx("span", { children: productMetaText }) : _jsx("span", {})] }), _jsx("div", { className: "crazygl-ctp-product-frame", children: screenshot ? (_jsx("img", { ref: productImgRef, src: screenshot, alt: "", "aria-hidden": "true", loading: "lazy", decoding: "async", crossOrigin: "anonymous" })) : null })] })] }), _jsx("canvas", { ref: canvasRef, className: "crazygl-ctp-canvas", "aria-hidden": "true" })] }), _jsx("crazygl-content", { style: {
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: 'clamp(1.5rem, 5vh, 3.5rem) clamp(1.5rem, 4vw, 3rem)',
                    zIndex: 4,
                    pointerEvents: 'none',
                    ...themeVars,
                }, children: _jsxs("div", { className: "crazygl-ctp-content-inner", children: [content.node, showDefaultCta ? (_jsx("div", { className: "crazygl-ctp-cta-row", children: _jsx("button", { ref: ctaRef, type: "button", onClick: handleCTAClick, className: "crazygl-ctp-cta", style: { color: ctaTextColor, background: ctaBgColor }, children: ctaLabel }) })) : null] }) })] }));
}
export default function CodeToProductTransformation(props) {
    return _jsx(CrazyGLWrapper, { hero: CodeToProductInner, metadata: metadata, ...props });
}
export { metadata };
