import { useState } from 'react'

import { Basic_Bullet } from './basic_bullet'
import { Bullet_Pole } from './bullet_pole'
import { Bullet_Pole_ndot } from './bullet_pole_ndot'
import './App.css'

import { useEffect } from 'react';

function App() {
  useEffect(() => {
  }, []);

  return (
    <>
      <Bullet_Pole_ndot>
      </Bullet_Pole_ndot>
    </>
  )
}

export default App
