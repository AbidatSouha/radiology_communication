/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import RoleSelection from './pages/RoleSelection';
import StaffDashboard from './pages/StaffDashboard';
import PatientDisplay from './pages/PatientDisplay';
import { io, Socket } from 'socket.io-client';

export default function App() {
  const [role, setRole] = useState<'staff' | 'patient' | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (role) {
      const newSocket = io();
      setSocket(newSocket);
      newSocket.emit('register_role', role);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [role]);

  if (!role) {
    return <RoleSelection onSelect={setRole} />;
  }

  if (role === 'staff') {
    return <StaffDashboard socket={socket} onBack={() => setRole(null)} />;
  }

  if (role === 'patient') {
    return <PatientDisplay socket={socket} onBack={() => setRole(null)} />;
  }

  return null;
}
