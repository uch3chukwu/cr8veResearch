const BACK_LABELS = {
  agent: '← BACK TO AGENT',
  research: '← BACK TO REFERENCES'
}

export function getReferenceBackLabel(origin = 'research') {
  return BACK_LABELS[origin] ?? BACK_LABELS.research
}
