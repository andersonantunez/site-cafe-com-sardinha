import React from 'react'

const pieces = [
  [8,12,-42,-48,0],[18,7,-28,-67,.08],[29,13,-14,-55,.16],[40,8,-5,-76,.04],
  [51,11,8,-62,.21],[62,7,18,-72,.11],[73,13,31,-54,.27],[84,8,42,-68,.18],
  [12,8,-38,-30,.32],[25,11,-22,-43,.39],[76,8,26,-41,.35],[91,12,38,-35,.43],
]

export default function WinnerConfetti() {
  return <span className="winner-confetti" aria-hidden="true">
    {pieces.map(([left,size,x,y,delay],index) => <i key={index} style={{ '--left':`${left}%`, '--size':`${size}px`, '--x':`${x}px`, '--y':`${y}px`, '--delay':`${delay}s`, '--color':`var(--confetti-${index%4})` }}/>) }
  </span>
}
