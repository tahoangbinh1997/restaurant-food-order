'use client'

import React from 'react'
import envConfig from '../../config'

export default function ClientComponent() {
  console.log(envConfig)
  return <div>ClientComponent</div>
}
