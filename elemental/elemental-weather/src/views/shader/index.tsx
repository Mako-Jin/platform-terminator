import {type JSX, useEffect, useRef} from "react";
import {LoggerFactory} from "common-tools";

import revealVertexShader from '/@/shaders/Materials/reveal/vertex.glsl';
import revealFragmentShader from '/@/shaders/Materials/reveal/fragment.glsl';
import "./index.scss";


interface ShaderRevealProps {
    onComplete?: () => void;
}

const ShaderReveal: ({onComplete}: ShaderRevealProps) => JSX.Element = ({ onComplete }) => {

    const logger = LoggerFactory.create("weather-shader-reveal");

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textOverlayRef = useRef<HTMLDivElement | null>(null);

    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const animationRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const createTextOverlay = () => {
            const textOverlay = document.createElement('div');
            textOverlay.className = 'reveal-overlay';

            textOverlay.innerHTML = `
            <div class="reveal-content">
                <h1 class="reveal-title">A Dream Realized</h1>

                <div class="reveal-description">
                    <p class="reveal-line">For as long as I can remember, I've dreamed of creating a quiet digital corner where stylised nature could breathe, seasons freely shifting, days fading into nights, leaves whispering in an invisible breeze.
                    <br><br>
                    And this project turned that dream into reality, built one shader, one texture, and one late night at a time. Countless tutorials, devlogs, and fellow creators kept me going and reminded me that shared passion multiplies.
                    <br><br>
                    Thank you for visiting. I hope it brings you a moment of quiet wonder!
                    </p>
                    <p class="reveal-footer">— Sahil K.</p>
                </div>
            </div>
        `;

            document.body.appendChild(textOverlay);
            textOverlayRef.current = textOverlay;

            animateTextReveal();
        };

        const animateTextReveal = () => {
            if (!textOverlayRef.current) return;

            setTimeout(() => {
                const title = textOverlayRef.current?.querySelector('.reveal-title');
                if (title) {
                    (title as HTMLElement).style.opacity = '1';
                }
            }, 200);

            setTimeout(() => {
                const line = textOverlayRef.current?.querySelector('.reveal-line');
                if (line) {
                    (line as HTMLElement).style.opacity = '1';
                }
            }, 800);

            setTimeout(() => {
                const footer = textOverlayRef.current?.querySelector('.reveal-footer');
                if (footer) {
                    (footer as HTMLElement).style.opacity = '1';
                }
            }, 1400);
        };

        const animateTextExit = () => {
            if (!textOverlayRef.current) return;

            setTimeout(() => {
                const footer = textOverlayRef.current?.querySelector('.reveal-footer');
                if (footer) {
                    (footer as HTMLElement).style.transition = 'opacity 0.4s ease-out';
                    (footer as HTMLElement).style.opacity = '0';
                }
            }, 0);

            setTimeout(() => {
                const line = textOverlayRef.current?.querySelector('.reveal-line');
                if (line) {
                    (line as HTMLElement).style.transition = 'opacity 0.4s ease-out';
                    (line as HTMLElement).style.opacity = '0';
                }
            }, 150);

            setTimeout(() => {
                const title = textOverlayRef.current?.querySelector('.reveal-title');
                if (title) {
                    (title as HTMLElement).style.transition = 'opacity 0.4s ease-out';
                    (title as HTMLElement).style.opacity = '0';
                }
            }, 300);
        };

        createTextOverlay();

        const textDisplayDuration = 7000;

        setTimeout(() => {
            animateTextExit();
        }, textDisplayDuration - 1200);

        setTimeout(() => {
            if (textOverlayRef.current) {
                textOverlayRef.current.style.transition = 'opacity 0.5s ease-out';
                textOverlayRef.current.style.opacity = '0';
                setTimeout(() => {
                    if (textOverlayRef.current) {
                        textOverlayRef.current.remove();
                        textOverlayRef.current = null;
                    }
                }, 500);
            }

            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
            if (!gl) {
                logger.warn('WebGL not supported, falling back to simple fade');
                setTimeout(() => {
                    canvas.style.display = 'none';
                    onComplete?.();
                }, 1500);
                return;
            }

            glRef.current = gl as WebGLRenderingContext;

            const createShader = (type: number, source: string): WebGLShader | null => {
                const shader = gl.createShader(type);
                if (!shader) return null;

                gl.shaderSource(shader, source);
                gl.compileShader(shader);

                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    logger.error('Shader compilation error:', gl.getShaderInfoLog(shader));
                    gl.deleteShader(shader);
                    return null;
                }

                return shader;
            };

            const vertexShader = createShader(gl.VERTEX_SHADER, revealVertexShader);
            const fragmentShader = createShader(gl.FRAGMENT_SHADER, revealFragmentShader);

            if (!vertexShader || !fragmentShader) return;

            const program = gl.createProgram();
            if (!program) return;

            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                logger.error('Program linking error:', gl.getProgramInfoLog(program));
                gl.deleteProgram(program);
                return;
            }

            programRef.current = program;

            const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

            const positionLocation = gl.getAttribLocation(program, 'aPosition');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            const resize = () => {
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * window.devicePixelRatio;
                canvas.height = rect.height * window.devicePixelRatio;
                gl.viewport(0, 0, canvas.width, canvas.height);
            };

            resize();
            window.addEventListener('resize', resize);

            startTimeRef.current = performance.now();
            const duration = 4500;

            const animate = () => {
                const currentTime = performance.now();
                const elapsed = currentTime - startTimeRef.current;
                const progress = Math.min(elapsed / duration, 1);

                const easeProgress =
                    progress < 0.5
                        ? 4 * progress * progress * progress
                        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

                gl.useProgram(program);

                const timeLocation = gl.getUniformLocation(program, 'uTime');
                const progressLocation = gl.getUniformLocation(program, 'uProgress');
                const resolutionLocation = gl.getUniformLocation(program, 'uResolution');

                gl.uniform1f(timeLocation, currentTime * 0.001);
                gl.uniform1f(progressLocation, easeProgress);
                gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    setTimeout(() => {
                        canvas.style.display = 'none';
                        onComplete?.();
                    }, 1500);
                }
            };

            animationRef.current = requestAnimationFrame(animate);

            return () => {
                window.removeEventListener('resize', resize);
                if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                }
                if (textOverlayRef.current && textOverlayRef.current.parentNode) {
                    textOverlayRef.current.remove();
                    textOverlayRef.current = null;
                }
                gl.deleteProgram(program);
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
            };
        }, textDisplayDuration - 400);

        return () => {
            if (textOverlayRef.current && textOverlayRef.current.parentNode) {
                textOverlayRef.current.remove();
                textOverlayRef.current = null;
            }
        };
    }, [logger, onComplete]);

    return (
        <canvas
            ref={canvasRef}
            className="shader-reveal-canvas"
        />
    );

}

export default ShaderReveal;