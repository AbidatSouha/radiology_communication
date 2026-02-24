/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import RoleSelection from './pages/RoleSelection';
import StaffDashboard from './pages/StaffDashboard';
import PatientDisplay from './pages/PatientDisplay';

export default function App() {
  const [role, setRole] = useState<'staff' | 'patient' | null>(null);

  if (!role) {
    return <RoleSelection onSelect={setRole} />;
  }

  if (role === 'staff') {
    return <StaffDashboard onBack={() => setRole(null)} />;
  }

  if (role === 'patient') {
    return <PatientDisplay onBack={() => setRole(null)} />;
  }

  return null;
}
