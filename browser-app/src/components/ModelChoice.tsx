import { ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"

import type { OfferedModels } from "@policyhuis/protocol/QuestionsApi"

interface ModelChoiceProps {
  readonly offered: OfferedModels | null
  readonly model: string | null
  readonly unavailable: boolean
  readonly disabled: boolean
  readonly onChoose: (configuration: string) => void
}

/** The model configuration that answers the next question, one button for each the backend offers. */
export const ModelChoice = ({ offered, model, unavailable, disabled, onChoose }: ModelChoiceProps) => {
  if (unavailable) {
    return (
      <Typography variant="body2" color="text.secondary">
        The model list could not be loaded; questions go to the default model.
      </Typography>
    )
  }
  if (offered === null) return null
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={model}
      disabled={disabled}
      aria-label="Model"
      onChange={(_event, value: string | null) => {
        if (value !== null) onChoose(value)
      }}
    >
      {offered.models.map((offeredModel) => (
        <ToggleButton key={offeredModel.configuration} value={offeredModel.configuration} title={offeredModel.modelId}>
          {offeredModel.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
