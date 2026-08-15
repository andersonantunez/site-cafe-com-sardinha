import React from 'react'

export default function FieldHelp({ text }) {
  if (!text) return null

  return <span
    className="field-help"
    role="button"
    tabIndex="0"
    aria-label="Mostrar explicação deste campo"
    onClick={event => event.preventDefault()}
  >
    ?
    <span className="field-help-tooltip" role="tooltip">{text}</span>
  </span>
}
