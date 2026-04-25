// src/App.tsx
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './farm.css';

const Farm = ({ container }: { container?: HTMLElement | string } = {}) => {
    const mountRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // 优先使用传入的container，否则使用ref
        let targetContainer: HTMLElement | null = null
        
        if (container) {
            targetContainer = typeof container === 'string' 
                ? document.querySelector(container)
                : container
        } else {
            targetContainer = mountRef.current
        }

        if (!targetContainer) return

        // --- 初始化场景、相机、渲染器 ---
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x111122) // 深色星空背景
        scene.fog = new THREE.FogExp2(0x111122, 0.008) // 雾效增强景深

        // 获取容器的实际尺寸
        const containerWidth = targetContainer.clientWidth || window.innerWidth
        const containerHeight = targetContainer.clientHeight || window.innerHeight

        // 透视相机: 视野, 宽高比, 近平面, 远平面
        const camera = new THREE.PerspectiveCamera(
            45,
            containerWidth / containerHeight,
            0.1,
            1000
        )
        camera.position.set(5, 5, 8)
        camera.lookAt(0, 0, 0)

        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(containerWidth, containerHeight)
        renderer.shadowMap.enabled = true // 开启阴影映射
        renderer.setPixelRatio(window.devicePixelRatio)
        targetContainer.appendChild(renderer.domElement)

        // --- 轨道控制 (允许用户交互) ---
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true      // 惯性效果
        controls.dampingFactor = 0.05
        controls.autoRotate = false
        controls.enableZoom = true
        controls.enablePan = true
        controls.target.set(0, 0, 0)

        // --- 辅助元素: 网格辅助线和坐标轴 (可选，帮助理解空间) ---
        const gridHelper = new THREE.GridHelper(20, 20, 0x88aaff, 0x335588)
        gridHelper.position.y = -1.2
        scene.add(gridHelper)

        // 简易坐标轴 (红X, 绿Z, 蓝Y 但为了视觉效果，简单添加一个AxesHelper)
        // const axesHelper = new THREE.AxesHelper(5)
        // scene.add(axesHelper) // 默认隐藏，需要可取消注释

        // --- 添加环境光与点光源，让材质有立体感 ---
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404060)
        scene.add(ambientLight)

        // 主光源: 方向光
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(3, 5, 2)
        directionalLight.castShadow = true
        directionalLight.receiveShadow = true
        directionalLight.shadow.mapSize.width = 1024
        directionalLight.shadow.mapSize.height = 1024
        scene.add(directionalLight)

        // 补光: 背面暖色光
        const backLight = new THREE.PointLight(0xcc9966, 0.5)
        backLight.position.set(-2, 1, -3)
        scene.add(backLight)

        // 增添一个彩色小球体作为趣味光源指示 (可选)
        const lightSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0xffaa66, emissive: 0x442200 })
        )
        lightSphere.position.copy(backLight.position)
        scene.add(lightSphere)

        // --- 核心物体: 一个旋转的彩色立方体，标准材质与边缘高亮 ---
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5)
        const material = new THREE.MeshStandardMaterial({
            color: 0x3f8efc,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x0,
            flatShading: false
        })
        const cube = new THREE.Mesh(geometry, material)
        cube.castShadow = true
        cube.receiveShadow = true
        cube.position.set(0, 0, 0)
        scene.add(cube)

        // 添加边缘线框，使立方体更酷
        const edgesGeo = new THREE.EdgesGeometry(geometry)
        const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff })
        const wireframe = new THREE.LineSegments(edgesGeo, edgesMat)
        cube.add(wireframe) // 将线框附加到立方体上，随立方体一起旋转

        // --- 添加一些浮动粒子系统增加视觉效果 ---
        const particleCount = 800
        const particlesGeometry = new THREE.BufferGeometry()
        const positions = new Float32Array(particleCount * 3)
        for (let i = 0; i < particleCount; i++) {
            // 分布在 [-8, 8] 区间内
            positions[i*3] = (Math.random() - 0.5) * 16
            positions[i*3+1] = (Math.random() - 0.5) * 10
            positions[i*3+2] = (Math.random() - 0.5) * 16 - 5
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        const particlesMaterial = new THREE.PointsMaterial({
            color: 0x77aaff,
            size: 0.08,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        })
        const particles = new THREE.Points(particlesGeometry, particlesMaterial)
        scene.add(particles)

        // 添加一个简单的环面结或环面来丰富场景 (可选，增加趣味)
        const torusGeometry = new THREE.TorusGeometry(1.2, 0.25, 64, 200)
        const torusMaterial = new THREE.MeshStandardMaterial({
            color: 0xff66cc,
            roughness: 0.4,
            metalness: 0.6,
            emissive: 0x331133
        })
        const torus = new THREE.Mesh(torusGeometry, torusMaterial)
        torus.position.set(2.2, -0.8, -1.5)
        torus.castShadow = true
        scene.add(torus)

        // 第二个小立方体绕着主立方体公转 (演示)
        const satelliteGeo = new THREE.SphereGeometry(0.25, 24, 24)
        const satelliteMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, metalness: 0.2 })
        const satellite = new THREE.Mesh(satelliteGeo, satelliteMat)
        satellite.castShadow = true
        scene.add(satellite)

        // 地面反射感: 加一个半透明平面接收阴影 (简单装饰)
        const planeMat = new THREE.ShadowMaterial({ opacity: 0.4, color: 0x000000, transparent: true, side: THREE.DoubleSide })
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(6, 6),
            planeMat
        )
        shadowPlane.rotation.x = -Math.PI / 2
        shadowPlane.position.y = -1.25
        shadowPlane.receiveShadow = true
        scene.add(shadowPlane)

        // --- 动画循环 & 旋转逻辑 ---
        let time = 0
        let satelliteAngle = 0

        const animate = () => {
            requestAnimationFrame(animate)
            time += 0.012
            satelliteAngle += 0.015

            // 主立方体旋转: 绕 Y 轴和 X 轴
            cube.rotation.x = time * 0.5
            cube.rotation.y = time * 0.8

            // 环面结自转
            torus.rotation.x = time * 0.3
            torus.rotation.y = time * 0.5

            // 粒子系统整体缓慢飘移及自转
            particles.rotation.y = time * 0.05
            particles.rotation.x = Math.sin(time * 0.2) * 0.1

            // 卫星绕 Y 轴公转，半径 2.5，高度稍有变化
            const radius = 2.5
            const satelliteX = Math.cos(satelliteAngle) * radius
            const satelliteZ = Math.sin(satelliteAngle) * radius
            satellite.position.set(satelliteX, Math.sin(satelliteAngle * 2) * 0.5 + 0.2, satelliteZ)

            // 让灯光小球跟着背光移动? 简单做一个小摆动
            backLight.position.x = -2 + Math.sin(time * 0.7) * 0.5
            backLight.position.z = -3 + Math.cos(time * 0.5) * 0.8
            lightSphere.position.copy(backLight.position)

            // 动态改变立方体材质颜色产生渐变效果 (可选)
            // const hue = (time * 0.1) % 1
            // 不强制改变，保持蓝色调，保持美观。可以取消注释下面代码来体验彩虹立方体
            // material.color.setHSL(hue, 0.8, 0.5)

            // 更新轨道控制
            controls.update()

            // 渲染场景
            renderer.render(scene, camera)
        }

        animate()

        // --- 窗口适配响应式 ---
        const handleResize = () => {
            if (!targetContainer) return
            const width = targetContainer.clientWidth
            const height = targetContainer.clientHeight
            camera.aspect = width / height
            camera.updateProjectionMatrix()
            renderer.setSize(width, height)
        }
        window.addEventListener('resize', handleResize)

        // --- 清理函数 (防止内存泄漏) ---
        return () => {
            window.removeEventListener('resize', handleResize)
            if (targetContainer && renderer.domElement) {
                targetContainer.removeChild(renderer.domElement)
            }
            // 可选: dispose 几何体和材质以优化
            geometry.dispose()
            material.dispose()
            edgesGeo.dispose()
            particlesGeometry.dispose()
            torusGeometry.dispose()
            torusMaterial.dispose()
            renderer.dispose()
        }
    }, [container])

    // 如果传入了container，不需要渲染额外的wrapper
    if (container) {
        return null
    }

    return (
        <div className="app-container">
            <div ref={mountRef} className="canvas-wrapper" />
        </div>
    )
}

export default Farm;
