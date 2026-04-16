// App.tsx (更新版本，包含loading)
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import './App.scss';
import AuthIndex from "./views";
import {AuthProvider} from "./components/auth/AuthContext";
import { RouterProvider } from 'react-router-dom';
import router from "./router";

const App: React.FC = () => {

    return (
        <AuthProvider>
            <RouterProvider router={router} />
        </AuthProvider>
    );
};

export default App;
