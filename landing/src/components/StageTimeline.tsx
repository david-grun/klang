import { STAGE_META, STAGES } from '../lib/stageMeta'

export function StageTimeline() {
  return (
    <div className="stage-timeline" role="list">
      {STAGES.map((key) => {
        const stage = STAGE_META[key]
        return (
          <article key={key} className="stage-timeline-card" role="listitem">
            <div className="stage-timeline-body">
              <h3 className="stage-timeline-name">{stage.label}</h3>
              <p className="stage-timeline-instrument">{stage.instrument}</p>
              <p className="stage-timeline-desc">{stage.description}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
