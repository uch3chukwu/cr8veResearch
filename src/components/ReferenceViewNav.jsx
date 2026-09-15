function ReferenceViewNav({
  activeView,
  onChange,
  counts
}) {
  const views = [
    {
      id: 'overview',
      label: 'OVERVIEW'
    },
    {
      id: 'media',
      label: 'MEDIA'
    },
    {
      id: 'sources',
      label: 'SOURCES'
    },
    {
      id: 'notes',
      label: 'NOTES'
    },
    {
      id: 'connections',
      label: 'CONNECTIONS'
    }
  ]

  return (
    <nav
      className="reference-view-nav"
      aria-label="Reference views"
    >
      {views.map(function (view) {
        const count =
          counts[view.id] ?? null

        const isActive =
          activeView === view.id

        return (
          <button
            key={view.id}
            type="button"
            className={
              isActive
                ? 'reference-view-button is-active'
                : 'reference-view-button'
            }
            onClick={function () {
              onChange(view.id)
            }}
            aria-current={
              isActive
                ? 'page'
                : undefined
            }
          >
            <span>{view.label}</span>

            {count !== null && (
              <small>{count}</small>
            )}
          </button>
        )
      })}
    </nav>
  )
}

export default ReferenceViewNav