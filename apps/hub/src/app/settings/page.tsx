/* eslint-disable @nx/enforce-module-boundaries */
'use client';

import React from 'react';
import SettingsScreen from '../../../../Prayer/src/app/screens/SettingsScreen';

export default function SettingsPage() {
  return <SettingsScreen appVersion={process.env.NEXT_PUBLIC_APP_VERSION} />;
}
