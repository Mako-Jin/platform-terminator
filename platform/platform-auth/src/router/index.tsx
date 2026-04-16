// router/index.tsx
import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '/@/views/login';
import AuthGuard from '/@/components/auth/AuthGuard';
import PortalPage from "../views/portal";

const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/portal',
        element: (
            <AuthGuard>
                <PortalPage />
            </AuthGuard>
        ),
    },
    {
        path: '/',
        element: <Navigate to="/portal" replace />,
    },
    {
        path: '*',
        element: <Navigate to="/portal" replace />,
    },
]);

export default router;
